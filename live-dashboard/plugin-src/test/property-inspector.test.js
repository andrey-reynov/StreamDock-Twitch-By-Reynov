const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function inspectorHarness() {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) {
      const classes = new Set();
      elements.set(id, {
        id,
        value: '',
        textContent: '',
        hidden: false,
        open: true,
        classList: {
          contains: name => classes.has(name),
          toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name)
        }
      });
    }
    return elements.get(id);
  };

  class MockWebSocket {
    constructor() { MockWebSocket.instance = this; }
    send() {}
  }

  const context = {
    console,
    document: { getElementById: element },
    WebSocket: MockWebSocket,
    window: {}
  };
  const source = fs.readFileSync(path.resolve(__dirname, '../../com.personal.streamdock.livedashboard.sdPlugin/propertyInspector/index.js'), 'utf8');
  vm.runInNewContext(source, context);
  context.window.connectElgatoStreamDeckSocket('1234', 'plugin-uuid', 'register', '{}', JSON.stringify({
    context: 'action-context',
    action: 'com.personal.streamdock.livedashboard.setup',
    payload: { settings: {} }
  }));
  return { element, socket: MockWebSocket.instance };
}

test('Dashboard Setup shows current Twitch authorization diagnostics', () => {
  const { element, socket } = inspectorHarness();
  socket.onmessage({ data: JSON.stringify({
    event: 'didReceiveGlobalSettings',
    payload: { settings: {
      twitchAuth: { accessToken: 'hidden' },
      connectionStatus: {
        twitchConnected: true,
        twitchLabel: 'channel-name',
        pluginVersion: '0.10.0',
        twitchAuthorizationVersion: '0.10.0',
        twitchScopes: ['user:read:chat', 'channel:manage:broadcast'],
        twitchTokenPresent: true,
        twitchTokenValid: true,
        twitchReconnectRequired: false
      }
    } }
  }) });

  assert.equal(element('pluginVersion').textContent, 'v0.10.0');
  assert.equal(element('authorizationVersion').textContent, 'v0.10.0');
  assert.equal(element('scopeStatus').textContent, 'Chat ✓ · Markers ✓');
  assert.equal(element('tokenStatus').textContent, 'Valid');
  assert.equal(element('reconnectStatus').textContent, 'Reconnect not required.');
  assert.equal(element('reconnectStatus').classList.contains('good'), true);
});

test('Dashboard Setup identifies legacy authorization that needs reconnecting', () => {
  const { element, socket } = inspectorHarness();
  socket.onmessage({ data: JSON.stringify({
    event: 'didReceiveGlobalSettings',
    payload: { settings: {
      twitchAuth: { accessToken: 'hidden' },
      connectionStatus: {
        twitchConnected: true,
        pluginVersion: '0.10.0',
        twitchAuthorizationVersion: '',
        twitchScopes: ['user:read:chat'],
        twitchTokenPresent: true,
        twitchTokenValid: true,
        twitchReconnectRequired: true
      }
    } }
  }) });

  assert.equal(element('authorizationVersion').textContent, 'Legacy');
  assert.equal(element('scopeStatus').textContent, 'Chat ✓ · Markers ✗');
  assert.match(element('reconnectStatus').textContent, /^Reconnect required:/);
  assert.equal(element('reconnectStatus').classList.contains('warning'), true);
});
