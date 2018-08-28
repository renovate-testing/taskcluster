import { Component, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { bool, func } from 'prop-types';
import { addYears } from 'date-fns';
import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import TextField from '@material-ui/core/TextField';
import Tooltip from '@material-ui/core/Tooltip';
import Switch from '@material-ui/core/Switch';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import ContentSaveIcon from 'mdi-react/ContentSaveIcon';
import CancelIcon from 'mdi-react/CancelIcon';
import DeleteIcon from 'mdi-react/DeleteIcon';
import LinkIcon from 'mdi-react/LinkIcon';
import PowerIcon from 'mdi-react/PowerIcon';
import LockResetIcon from 'mdi-react/LockResetIcon';
import SpeedDial from '../SpeedDial';
import SpeedDialAction from '../SpeedDialAction';
import DatePicker from '../DatePicker';
import Button from '../Button';
import { client } from '../../utils/prop-types';
import splitLines from '../../utils/splitLines';

@withStyles(theme => ({
  fab: {
    ...theme.mixins.fab,
  },
  expandedScopesListItem: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  expandedScopesWrapper: {
    paddingRight: 0,
  },
  listItemButton: {
    ...theme.mixins.listItemButton,
  },
  saveIcon: {
    ...theme.mixins.successIcon,
  },
  deleteIcon: {
    ...theme.mixins.errorIcon,
  },
  disableIcon: {
    ...theme.mixins.warningIcon,
  },
  enableIcon: {
    ...theme.mixins.successIcon,
  },
}))
/** A form to view/edit/create a client */
export default class ClientForm extends Component {
  static propTypes = {
    /** A GraphQL client response. Not needed when creating a new client  */
    client,
    /** Set to `true` when creating a new client. */
    isNewClient: bool,
    /** Callback function fired when a client is created/updated. */
    onSaveClient: func.isRequired,
    /** Callback function fired when a client is deleted. */
    onDeleteClient: func,
    /** Callback function fired when a client is disabled. */
    onDisableClient: func,
    /** Callback function fired when a client is enabled. */
    onEnableClient: func,
    /** If true, form actions will be disabled. */
    loading: bool,
  };

  static defaultProps = {
    isNewClient: false,
    client: null,
    loading: false,
    onDeleteClient: null,
    onDisableClient: null,
    onEnableClient: null,
  };

  state = {
    description: '',
    scopeText: '',
    clientId: '',
    created: null,
    lastModified: null,
    lastDateUsed: null,
    lastRotated: null,
    expires: addYears(new Date(), 1000),
    deleteOnExpiration: true,
    expandedScopes: null,
    disabled: null,
    // eslint-disable-next-line react/no-unused-state
    prevClient: null,
  };

  static getDerivedStateFromProps({ isNewClient, client }, state) {
    if (isNewClient || (state.clientId && state.prevClient === client)) {
      return null;
    }

    return {
      description: client.description,
      clientId: client.clientId,
      created: client.created,
      lastModified: client.lastModified,
      lastDateUsed: client.lastDateUsed,
      lastRotated: client.lastRotated,
      expires: client.expires,
      deleteOnExpiration: client.deleteOnExpiration,
      scopeText: client.scopes.join('\n'),
      expandedScopes: client.expandedScopes,
      disabled: client.disabled,
      prevClient: client,
    };
  }

  handleInputChange = ({ target: { name, value } }) => {
    this.setState({ [name]: value });
  };

  handleExpirationChange = expires => {
    this.setState({
      expires,
    });
  };

  handleDeleteOnExpirationChange = () => {
    this.setState({ deleteOnExpiration: !this.state.deleteOnExpiration });
  };

  // TODO: Reset accessToken
  handleResetAccessToken = () => {};

  handleSaveClient = () => {
    const {
      clientId,
      scopeText,
      description,
      expires,
      deleteOnExpiration,
    } = this.state;
    const scopes = splitLines(scopeText);
    const client = {
      expires,
      description,
      deleteOnExpiration,
      scopes,
    };

    this.props.onSaveClient(client, clientId);
  };

  handleDeleteClient = () => {
    this.props.onDeleteClient(this.state.clientId);
  };

  handleDisableClient = () => {
    this.props.onDisableClient(this.state.clientId);
  };

  handleEnableClient = () => {
    this.props.onEnableClient(this.state.clientId);
  };

  render() {
    const { client, classes, isNewClient, loading } = this.props;
    const {
      description,
      scopeText,
      clientId,
      created,
      lastModified,
      lastDateUsed,
      lastRotated,
      expires,
      deleteOnExpiration,
      expandedScopes,
      disabled,
    } = this.state;

    return (
      <Fragment>
        <List>
          <ListItem>
            <FormGroup row>
              <FormControlLabel
                control={
                  <Switch
                    checked={deleteOnExpiration}
                    onChange={this.handleDeleteOnExpirationChange}
                  />
                }
                label="Delete on Expiration"
              />
            </FormGroup>
          </ListItem>
          {isNewClient && (
            <ListItem>
              <TextField
                label="Client ID"
                name="clientId"
                onChange={this.handleInputChange}
                fullWidth
                value={clientId}
              />
            </ListItem>
          )}
          {client && (
            <Fragment>
              <ListItem>
                <ListItemText primary="Client ID" secondary={clientId} />
              </ListItem>
              <ListItem>
                <ListItemText primary="Date Created" secondary={created} />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Date Last Modified"
                  secondary={lastModified}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Date Last Used"
                  secondary={lastDateUsed}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Date Last Rotated"
                  secondary={lastRotated}
                />
              </ListItem>
            </Fragment>
          )}
          <ListItem>
            <ListItemText
              disableTypography
              primary={
                <Typography component="h3" variant="subheading">
                  Expires
                </Typography>
              }
              secondary={
                <DatePicker
                  value={expires}
                  onChange={this.handleExpirationChange}
                  format="YYYY/MM/DD"
                  maxDate={addYears(new Date(), 1001)}
                />
              }
            />
          </ListItem>
          <ListItem>
            <TextField
              label="Description"
              name="description"
              onChange={this.handleInputChange}
              fullWidth
              multiline
              rows={5}
              value={description}
            />
          </ListItem>
          <ListItem>
            <TextField
              label="Scopes"
              name="scopeText"
              onChange={this.handleInputChange}
              fullWidth
              multiline
              rows={5}
              placeholder={isNewClient ? 'new-scope:for-something:*' : null}
              value={scopeText}
            />
          </ListItem>
          {client && expandedScopes.length ? (
            <Fragment>
              <ListItem>
                <ListItemText
                  primary="Expanded Scopes"
                  secondary={
                    <span>
                      Expanded scopes are determined from the client scopes,
                      expanding roles for scopes beginning with{' '}
                      <code>assume:</code>.
                    </span>
                  }
                />
              </ListItem>
              <ListItem classes={{ root: classes.expandedScopesListItem }}>
                <ListItemText
                  disableTypography
                  className={classes.expandedScopesWrapper}
                  secondary={
                    <List dense>
                      {expandedScopes.map(scope => (
                        <ListItem
                          key={scope}
                          button
                          component={Link}
                          to={`/auth/scopes/${encodeURIComponent(scope)}`}
                          className={classes.listItemButton}>
                          <ListItemText secondary={<code>{scope}</code>} />
                          <LinkIcon />
                        </ListItem>
                      ))}
                    </List>
                  }
                />
              </ListItem>
            </Fragment>
          ) : null}
        </List>
        {isNewClient ? (
          <Tooltip title="Save">
            <div className={classes.fab}>
              <Button
                requiresAuth
                disabled={loading}
                variant="fab"
                onClick={this.handleSaveClient}
                classes={{ root: classes.saveIcon }}>
                <ContentSaveIcon />
              </Button>
            </div>
          </Tooltip>
        ) : (
          <SpeedDial>
            <SpeedDialAction
              requiresAuth
              icon={<ContentSaveIcon className={classes.saveIcon} />}
              onClick={this.handleSaveClient}
              classes={{ button: classes.saveIcon }}
              tooltipTitle="Save"
              ButtonProps={{ disabled: loading }}
            />
            <SpeedDialAction
              requiresAuth
              icon={<DeleteIcon />}
              onClick={this.handleDeleteClient}
              classes={{ button: classes.deleteIcon }}
              tooltipTitle="Delete"
              ButtonProps={{ disabled: loading }}
            />
            <SpeedDialAction
              icon={disabled ? <PowerIcon /> : <CancelIcon />}
              onClick={
                disabled ? this.handleEnableClient : this.handleDisableClient
              }
              tooltipTitle={disabled ? 'Enable' : 'Disable'}
              classes={{
                button: disabled ? classes.enableIcon : classes.disableIcon,
              }}
              ButtonProps={{
                disabled: loading,
              }}
            />
            <SpeedDialAction
              requiresAuth
              icon={<LockResetIcon />}
              onClick={this.handleResetAccessToken}
              tooltipTitle="Reset Access Token"
              ButtonProps={{
                color: 'secondary',
                disabled: loading,
              }}
            />
          </SpeedDial>
        )}
      </Fragment>
    );
  }
}
