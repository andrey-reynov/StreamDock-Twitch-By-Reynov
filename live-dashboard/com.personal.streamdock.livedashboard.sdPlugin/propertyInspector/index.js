let socket, uuid, context, action, settings = {}, actionSettings = {};
const byId = id => document.getElementById(id);

function send(event, payload = {}) { socket?.send(JSON.stringify({ event, context, ...payload })); }
function collect() { return { ...settings, twitchClientId: byId('clientId').value.trim(), obsUrl: byId('obsUrl').value.trim(), obsPassword: byId('obsPassword').value }; }
function renderConnectionStatus() {
  const current = settings.connectionStatus || {};
  const twitchConnected = Boolean(current.twitchConnected);
  const obsConnected = Boolean(current.obsConnected);
  const markerAllowed = Boolean(current.twitchMarkerAllowed);
  byId('twitchState').textContent = twitchConnected ? `Connected${current.twitchLabel ? ` as ${current.twitchLabel}` : ''}` : 'Not connected';
  byId('twitchState').classList.toggle('connected', twitchConnected);
  byId('twitchCheck').textContent = twitchConnected ? '✓ Connected' : '';
  byId('twitchForm').hidden = twitchConnected;
  byId('disconnectTwitch').hidden = !twitchConnected;
  byId('markerPermission').hidden = !twitchConnected || markerAllowed;
  byId('obsState').textContent = obsConnected ? `Connected — ${current.obsLabel || 'OBS READY'}` : (current.obsLabel || 'Not connected');
  byId('obsState').classList.toggle('connected', obsConnected);
  byId('obsCheck').textContent = obsConnected ? '✓ Connected' : '';
  byId('overallStatus').textContent = twitchConnected && obsConnected ? (markerAllowed ? '✓ Dashboard ready — Twitch and OBS connected' : '✓ Core ready — reconnect Twitch once to enable Moment Marker') : 'Setup in progress — complete Twitch and OBS';
  byId('overallStatus').classList.toggle('pending', !(twitchConnected && obsConnected));
  if (twitchConnected) byId('twitchDetails').open = false;
  if (obsConnected) byId('obsDetails').open = false;
  const scopes = Array.isArray(current.twitchScopes) ? current.twitchScopes : [];
  const tokenPresent = Boolean(current.twitchTokenPresent || settings.twitchAuth?.accessToken);
  const reconnectRequired = Boolean(current.twitchReconnectRequired);
  byId('pluginVersion').textContent = `v${current.pluginVersion || '0.10.0'}`;
  byId('authorizationVersion').textContent = tokenPresent
    ? (current.twitchAuthorizationVersion ? `v${current.twitchAuthorizationVersion}` : 'Legacy')
    : 'Not connected';
  byId('scopeStatus').textContent = `Chat ${scopes.includes('user:read:chat') ? '✓' : '✗'} · Markers ${scopes.includes('channel:manage:broadcast') ? '✓' : '✗'}`;
  byId('tokenStatus').textContent = current.twitchTokenValid ? 'Valid' : (tokenPresent ? (current.twitchLabel === 'RECONNECT TWITCH' ? 'Invalid' : 'Checking') : 'Not connected');
  byId('reconnectStatus').textContent = reconnectRequired ? 'Reconnect required: authorization is old, invalid, or missing permissions.' : (twitchConnected ? 'Reconnect not required.' : 'Connect Twitch to enable diagnostics.');
  byId('reconnectStatus').classList.toggle('warning', reconnectRequired);
  byId('reconnectStatus').classList.toggle('good', twitchConnected && !reconnectRequired);
}
function apply(value) {
  settings = value || {};
  byId('clientId').value = settings.twitchClientId || '';
  byId('obsUrl').value = settings.obsUrl || 'ws://127.0.0.1:4455';
  byId('obsPassword').value = settings.obsPassword || '';
  renderConnectionStatus();
}

window.connectElgatoStreamDeckSocket = (port, inUuid, registerEvent, info, actionInfo) => {
  uuid = inUuid;
  const parsedAction = JSON.parse(actionInfo);
  context = parsedAction.context;
  action = parsedAction.action;
  actionSettings = parsedAction.payload?.settings || {};
  byId('customTitle').value = actionSettings.customTitle || '';
  socket = new WebSocket(`ws://127.0.0.1:${port}`);
  socket.onopen = () => {
    socket.send(JSON.stringify({ event: registerEvent, uuid }));
    socket.send(JSON.stringify({ event: 'getGlobalSettings', context: uuid }));
  };
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.event === 'didReceiveGlobalSettings') apply(message.payload?.settings);
    if (message.event === 'sendToPropertyInspector') {
      const p = message.payload || {};
      if (p.type === 'deviceCode') {
        byId('authorize').href = p.url;
        byId('authorize').hidden = false;
        byId('status').textContent = 'Continue in the Twitch browser window. The authorization code is already included in the link.';
      }
      if (p.type === 'connected') { byId('authorize').hidden = true; byId('status').textContent = 'Twitch connected.'; }
      if (p.type === 'error') byId('status').textContent = `Error: ${p.message}`;
    }
  };
};

byId('save').onclick = () => { settings = collect(); socket.send(JSON.stringify({ event: 'setGlobalSettings', context: uuid, payload: settings })); byId('status').textContent = 'Testing OBS connection…'; };
byId('saveTitle').onclick = () => {
  actionSettings = { ...actionSettings, customTitle: byId('customTitle').value.trim() };
  socket.send(JSON.stringify({ event: 'setSettings', context, payload: actionSettings }));
  socket.send(JSON.stringify({ event: 'setGlobalSettings', context: uuid, payload: { ...settings, actionSettingsRequest: { id: Date.now(), context, settings: actionSettings } } }));
  byId('status').textContent = 'Dashboard title saved.';
};
byId('connect').onclick = () => {
  settings = collect();
  // Some StreamDock builds do not forward sendToPlugin from a property
  // inspector. A one-shot request in global settings works on those builds
  // and is removed by the plugin as soon as it is received.
  settings.twitchConnectRequest = { id: Date.now(), context };
  socket.send(JSON.stringify({ event: 'setGlobalSettings', context: uuid, payload: settings }));
  byId('authorize').hidden = true;
  byId('status').textContent = 'Requesting Twitch authorization…';
};
byId('disconnectTwitch').onclick = () => {
  settings = collect();
  settings.twitchDisconnectRequest = { id: Date.now(), context };
  socket.send(JSON.stringify({ event: 'setGlobalSettings', context: uuid, payload: settings }));
  byId('status').textContent = 'Disconnecting Twitch…';
};
