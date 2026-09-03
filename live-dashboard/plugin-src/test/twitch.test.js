const test = require('node:test');
const assert = require('node:assert/strict');
const { DashboardState } = require('../src/state');
const { AUTH_FORMAT_VERSION, TwitchService, twitchActivationUrl } = require('../src/twitch');
const { version: PLUGIN_VERSION } = require('../package.json');

test('browser activation URL contains the device code without manual entry', () => {
  const url = twitchActivationUrl({ verification_uri: 'https://www.twitch.tv/activate', user_code: 'ABCD1234' });
  assert.equal(new URL(url).searchParams.get('device-code'), 'ABCD1234');
  assert.equal(new URL(url).searchParams.get('public'), 'true');
});

test('missing credentials and expired tokens have distinct reconnect states', async () => {
  const state = new DashboardState();
  const twitch = new TwitchService(state, async () => {});
  await twitch.configure({ twitchClientId: 'client-id' });
  assert.equal(state.twitchConnected, false);
  assert.equal(state.twitchStatus, 'CONNECT TWITCH');
  const originalError = console.error;
  console.error = () => {};
  try { twitch.fail(Object.assign(new Error('OAuth token expired'), { status: 401 })); } finally { console.error = originalError; }
  assert.equal(state.twitchConnected, false);
  assert.equal(state.twitchStatus, 'RECONNECT TWITCH');
});

test('EventSub chat notifications increment the session counter', async () => {
  const state = new DashboardState();
  const twitch = new TwitchService(state, async () => {});
  await twitch.onEventSub({
    metadata: { message_type: 'notification', subscription_type: 'channel.chat.message' },
    payload: { event: { chatter_user_name: 'Alice', message: { text: 'Hello!' } } }
  });
  assert.equal(state.messages, 1);
  assert.equal(state.latestUser, 'Alice');
  assert.equal(state.latestMessage, 'Hello!');
});

test('duplicate EventSub deliveries count a chat message only once', async () => {
  const state = new DashboardState();
  const twitch = new TwitchService(state, async () => {});
  const notification = {
    metadata: { message_id: 'same-event-id', message_type: 'notification', subscription_type: 'channel.chat.message' },
    payload: { event: { chatter_user_name: 'Alice', message: { text: 'Hello!' } } }
  };
  await twitch.onEventSub(notification);
  await twitch.onEventSub(notification);
  assert.equal(state.messages, 1);
});

test('EventSub offline notifications clear live state', async () => {
  const state = new DashboardState();
  state.patch({ twitchLive: true, viewers: 7, streamStartedAt: '2026-09-02T10:00:00Z' });
  const twitch = new TwitchService(state, async () => {});
  await twitch.onEventSub({ metadata: { message_type: 'notification', subscription_type: 'stream.offline' }, payload: { event: {} } });
  assert.equal(state.twitchLive, false);
  assert.equal(state.viewers, 0);
  assert.equal(state.streamStartedAt, null);
});

test('Helix viewer polling updates viewers without resetting the current stream counter', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: true, json: async () => ({ data: [{ viewer_count: 3, started_at: '2026-09-02T10:00:00Z' }] }) });
  try {
    const state = new DashboardState();
    state.patch({ twitchLive: true, streamStartedAt: '2026-09-02T10:00:00Z', messages: 17 });
    const twitch = new TwitchService(state, async () => {});
    twitch.clientId = 'client-id';
    twitch.userId = '123';
    twitch.auth = { accessToken: 'token', expiresAt: Date.now() + 60000 };
    await twitch.pollStream();
    assert.equal(state.viewers, 3);
    assert.equal(state.messages, 17);
    assert.equal(state.twitchLive, true);
  } finally { global.fetch = originalFetch; }
});

test('Helix detects a new stream and resets the message counter', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: true, json: async () => ({ data: [{ viewer_count: 1, started_at: '2026-09-02T12:00:00Z' }] }) });
  try {
    const state = new DashboardState();
    state.patch({ twitchLive: true, streamStartedAt: '2026-09-02T10:00:00Z', messages: 17 });
    const twitch = new TwitchService(state, async () => {});
    twitch.clientId = 'client-id';
    twitch.userId = '123';
    twitch.auth = { accessToken: 'token', expiresAt: Date.now() + 60000 };
    await twitch.pollStream();
    assert.equal(state.viewers, 1);
    assert.equal(state.messages, 0);
    assert.equal(state.streamStartedAt, '2026-09-02T12:00:00Z');
  } finally { global.fetch = originalFetch; }
});

test('Device Code Connect waits for authorization and persists the token pair', async () => {
  const originalFetch = global.fetch;
  const requests = [];
  let tokenPolls = 0;
  global.fetch = async (url, options = {}) => {
    requests.push({ url, body: options.body?.toString() });
    if (url.endsWith('/device')) return { ok: true, json: async () => ({ device_code: 'device-code', user_code: 'ABCD1234', verification_uri: 'https://www.twitch.tv/activate', expires_in: 30, interval: 0 }) };
    tokenPolls += 1;
    if (tokenPolls === 1) return { ok: false, status: 400, statusText: 'Bad Request', json: async () => ({ message: 'authorization_pending' }) };
    return { ok: true, json: async () => ({ access_token: 'access', refresh_token: 'refresh', expires_in: 14400 }) };
  };
  try {
    const state = new DashboardState();
    let saved;
    let shownCode;
    const twitch = new TwitchService(state, async auth => { saved = auth; });
    const auth = await twitch.startDeviceConnect('public-client-id', device => { shownCode = device.user_code; });
    assert.equal(shownCode, 'ABCD1234');
    assert.equal(tokenPolls, 2);
    assert.equal(auth.accessToken, 'access');
    assert.equal(saved.refreshToken, 'refresh');
    assert.equal(saved.authorizedWithPluginVersion, PLUGIN_VERSION);
    assert.equal(saved.authFormatVersion, AUTH_FORMAT_VERSION);
    assert.match(requests[0].body, /scopes=user%3Aread%3Achat/);
    assert.match(requests[1].body, /grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Adevice_code/);
  } finally { global.fetch = originalFetch; }
});

test('disconnect revokes the token and clears the local Twitch session', async () => {
  const originalFetch = global.fetch;
  let request;
  global.fetch = async (url, options) => {
    request = { url, body: options.body.toString() };
    return { ok: true, json: async () => ({}) };
  };
  try {
    const state = new DashboardState();
    state.patch({ twitchConnected: true, twitchLive: true, viewers: 4 });
    let saved;
    const twitch = new TwitchService(state, async auth => { saved = auth; });
    twitch.clientId = 'public-client-id';
    twitch.auth = { accessToken: 'access-token' };
    await twitch.disconnectAccount();
    assert.match(request.url, /oauth2\/revoke$/);
    assert.match(request.body, /client_id=public-client-id/);
    assert.match(request.body, /token=access-token/);
    assert.deepEqual(saved, {});
    assert.equal(state.twitchConnected, false);
    assert.equal(state.twitchLive, false);
    assert.equal(state.viewers, 0);
  } finally { global.fetch = originalFetch; }
});

test('creates a Twitch stream marker with the requested scope and description', async () => {
  const originalFetch = global.fetch;
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ data: [{ id: 'marker-1' }] }) };
  };
  try {
    const state = new DashboardState();
    state.patch({ twitchConnected: true, twitchMarkerAllowed: true });
    const twitch = new TwitchService(state, async () => {});
    twitch.clientId = 'client-id'; twitch.userId = 'user-id'; twitch.auth = { accessToken: 'token', expiresAt: Date.now() + 60000 };
    const result = await twitch.createMarker('Great moment');
    assert.equal(result.data[0].id, 'marker-1');
    assert.match(request.url, /streams\/markers$/);
    assert.deepEqual(JSON.parse(request.options.body), { user_id: 'user-id', description: 'Great moment' });
  } finally { global.fetch = originalFetch; }
});

test('EventSub keepalive watchdog closes a stale socket so it can reconnect', async () => {
  const state = new DashboardState();
  const twitch = new TwitchService(state, async () => {});
  let closed = 0;
  const socket = { close: () => { closed += 1; } };
  twitch.eventSocket = socket;
  twitch.keepaliveSeconds = 0.005;
  twitch.armKeepaliveWatchdog(socket, 0);
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(closed, 1);
  twitch.stop();
});

test('concurrent Twitch consumers share one single-use refresh-token exchange', async () => {
  const originalFetch = global.fetch;
  let refreshCalls = 0;
  global.fetch = async () => {
    refreshCalls += 1;
    await new Promise(resolve => setTimeout(resolve, 5));
    return { ok: true, json: async () => ({ access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 14400 }) };
  };
  try {
    const state = new DashboardState();
    const twitch = new TwitchService(state, async () => {});
    twitch.clientId = 'client-id';
    twitch.auth = { accessToken: 'old-access', refreshToken: 'single-use-refresh', expiresAt: 0 };
    await Promise.all([twitch.ensureToken(), twitch.ensureToken(), twitch.ensureToken()]);
    assert.equal(refreshCalls, 1);
    assert.equal(twitch.auth.accessToken, 'new-access');
    assert.equal(twitch.auth.refreshToken, 'new-refresh');
    assert.equal(twitch.auth.authorizedWithPluginVersion, PLUGIN_VERSION);
    assert.equal(twitch.auth.authFormatVersion, AUTH_FORMAT_VERSION);
  } finally { global.fetch = originalFetch; }
});

test('token refresh preserves authorization origin and refresh token when omitted', async () => {
  const twitch = new TwitchService(new DashboardState(), async () => {});
  twitch.auth = {
    refreshToken: 'existing-refresh',
    authorizedWithPluginVersion: '0.9.0',
    authFormatVersion: AUTH_FORMAT_VERSION,
    scopes: ['user:read:chat']
  };
  const record = twitch.tokenRecord({ access_token: 'new-access', expires_in: 100 });
  assert.equal(record.refreshToken, 'existing-refresh');
  assert.equal(record.authorizedWithPluginVersion, '0.9.0');
  assert.deepEqual(record.scopes, ['user:read:chat']);
});

test('Helix retries once with a refreshed token after a stored token is rejected', async () => {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), authorization: options.headers?.Authorization });
    if (String(url).includes('/oauth2/token')) return { ok: true, json: async () => ({ access_token: 'fresh-access', refresh_token: 'fresh-refresh', expires_in: 14400 }) };
    if (options.headers?.Authorization === 'Bearer stale-access') return { ok: false, status: 401, statusText: 'Unauthorized', json: async () => ({ message: 'Invalid OAuth token' }) };
    return { ok: true, json: async () => ({ data: [] }) };
  };
  try {
    const twitch = new TwitchService(new DashboardState(), async () => {});
    twitch.clientId = 'client-id';
    twitch.auth = { accessToken: 'stale-access', refreshToken: 'refresh', expiresAt: Date.now() + 3600000 };
    const result = await twitch.helixFetch('https://api.twitch.tv/helix/streams?user_id=1');
    assert.deepEqual(result, { data: [] });
    assert.equal(calls.filter(call => call.url.includes('/oauth2/token')).length, 1);
    assert.ok(calls.some(call => call.authorization === 'Bearer fresh-access'));
  } finally { global.fetch = originalFetch; }
});
