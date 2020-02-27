package protocol

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"sync"
)

// Transport is a means of sending and receiving messages.
type Transport interface {
	// Send a message to the worker
	Send(Message)

	// Receive a message from the worker, blocking until one is availble
	Recv() (Message, bool)
}

// StdioTransport implements the worker-runner protocol over stdin/stdout.  It
// implements Transport, io.Reader and io.WriteCloser, where it uses the
// encoding defined in `protocol.md`, and exposes channels of incoming and
// outgoing messages.
type StdioTransport struct {
	// channels of incoming and outgoing messages
	In  chan Message
	Out chan Message

	// protects access to inBuffer (outbuffer has no contention)
	inMux sync.Mutex

	inBuffer  []byte
	outBuffer []byte
}

// Create a new StdioTransport.  The result implements both io.Reader and
// io.Writer so it can be specified as a cmd's Stdin and Stdout.
func NewStdioTransport() *StdioTransport {
	return &StdioTransport{
		In:  make(chan Message, 5),
		Out: make(chan Message, 5),
	}
}

// protocol.Transport interface

func (transp *StdioTransport) Send(msg Message) {
	transp.Out <- msg
}

func (transp *StdioTransport) Recv() (Message, bool) {
	m, ok := <-transp.In
	return m, ok
}

// io.Reader implementation

func (transp *StdioTransport) Read(p []byte) (int, error) {
	// if the buffer is empty, block waiting for a message
	if len(transp.outBuffer) == 0 {
		msg, ok := <-transp.Out
		if !ok {
			return 0, io.EOF
		}
		j, err := json.Marshal(&msg)
		if err != nil {
			return 0, err
		}
		transp.outBuffer = append(append(append(transp.outBuffer, '~'), j...), '\n')
	}

	// we now have a nonempty buffer, so read from it
	l := len(transp.outBuffer)
	if l > len(p) {
		l = len(p)
	}
	copy(p, transp.outBuffer[:l])
	transp.outBuffer = transp.outBuffer[l:]
	return l, nil
}

// io.Writer implementation

func (transp *StdioTransport) Write(p []byte) (int, error) {
	transp.inMux.Lock()
	defer transp.inMux.Unlock()
	if len(transp.inBuffer) == 0 {
		transp.inBuffer = p
	} else {
		transp.inBuffer = append(transp.inBuffer, p...)
	}

	// break inBuffer into full lines, handling each one in turn
	for {
		newline := bytes.IndexRune(transp.inBuffer, '\n')
		if newline == -1 {
			break
		}

		line := transp.inBuffer[:newline]

		invalid := false
		var err error

		if len(line) < 3 || line[0] != '~' || line[1] != '{' || line[len(line)-1] != '}' {
			invalid = true
		}

		var msg Message
		if !invalid {
			err = json.Unmarshal(line[1:], &msg)
			if err != nil {
				invalid = true
			}
		}

		if invalid {
			// strip the newline and hand this to the logger as unstructured data
			logLine := string(transp.inBuffer[:newline])
			log.Println(logLine)
		} else {
			transp.In <- msg
		}

		transp.inBuffer = transp.inBuffer[newline+1:]
	}

	return len(p), nil
}

func (transp *StdioTransport) Close() error {
	transp.inMux.Lock()
	defer transp.inMux.Unlock()
	// flush any remaining buffered input as invalid..
	if len(transp.inBuffer) != 0 {
		log.Println(string(transp.inBuffer))
	}

	close(transp.In)

	return nil
}

// NullTransport implements Transport without doing anything.  It's suitable for
// workers that do not implement the protocol
type NullTransport struct{}

func NewNullTransport() *NullTransport {
	return &NullTransport{}
}

func (transp *NullTransport) Send(msg Message) {
	// sent messages are lost..
}

func (transp *NullTransport) Recv() (Message, bool) {
	// no messages are ever received
	select {}
}
