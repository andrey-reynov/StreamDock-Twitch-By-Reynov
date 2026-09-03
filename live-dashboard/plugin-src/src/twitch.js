const WebSocket = require('ws');

const DEVICE_URL = 'https://id.twitch.tv/oauth2/device';
const TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const VALIDATE_URL = 'https://id.twitch.tv/oauth2/validate';
const EVENTSUB_URL = 'wss://eventsub.wss.twitch.tv/ws';
const TWITCH_SCOPES = ['user:read:chat', 'channel:manage:broadcast'];

function twitchActivationUrl(device) {
  const url = new URL(device.verification_uri || 'https://www.twitch.tv/activate');
  if (!url.searchParams.has('device-code')) {
    url.searchParams.set('public', 'true');
    url.searchParams.set('device-code', device.user_code);
  }
  return url.toString();
}

async function jsonFetch(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.message || `${response.status} ${response.statusText}`), { status: response.status, body });
  return body;
}

class TwitchService {
  constructor(state, saveAuth) {
    this.state = state;
    this.saveAuth = saveAuth;
    this.auth = {};
    this.recentMessageIds = new Set();
  }

  async configure(settings) {
    this.stop();
    this.clientId = settings.twitchClientId?.trim();
    this.auth = settings.twitchAuth || {};
    if (!this.clientId || !this.auth.accessToken) {
      this.state.patch({ twitchConnected: false, twitchStatus: this.clientId ? 'CONNECT TWITCH' : 'SET CLIENT ID' });
      return;
    }
    try {
      await this.ensureToken();
      let identity;
      try {
        identity = await jsonFetch(VALIDATE_URL, { headers: { Authorization: `OAuth ${this.auth.accessToken}` } });
      } catch (error) {
        if (error.status !== 401 || !this.auth.refreshToken) throw error;
        await this.ensureToken(true);
        identity = await jsonFetch(VALIDATE_URL, { headers: { Authorization: `OAuth ${this.auth.accessToken}` } });
      }
      this.userId = identity.user_id;
      this.scopes = identity.scopes || [];
      const userResult = await this.helixFetch(`https://api.twitch.tv/helix/users?id=${encodeURIComponent(this.userId)}`);
      const user = userResult.data?.[0] || {};
      let avatar = '';
      if (user.profile_image_url) {
        try {
          const response = await fetch(user.profile_image_url);
          if (response.ok) {
            const mime = response.headers?.get?.('content-type') || 'image/jpeg';
            avatar = `data:${mime};base64,${Buffer.from(await response.arrayBuffer()).toString('base64')}`;
          }
        } catch {}
      }
      this.state.patch({ twitchConnected: true, twitchStatus: identity.login || 'CONNECTED', twitchDisplayName: user.display_name || identity.login || '', twitchAvatar: avatar, twitchMarkerAllowed: this.scopes.includes('channel:manage:broadcast') });
      await this.pollStream();
      this.viewerTimer = setInterval(() => this.pollStream().catch(error => this.fail(error)), 30000);
      this.connectEventSub();
    } catch (error) { this.fail(error); }
  }

  stop() {
    clearInterval(this.viewerTimer);
    clearTimeout(this.reconnectTimer);
    clearTimeout(this.keepaliveTimer);
    this.eventSocket?.close();
    this.eventSocket = null;
  }

  async startDeviceConnect(clientId, onCode) {
    this.clientId = clientId?.trim();
    if (!this.clientId) throw new Error('Enter Twitch Client ID first');
    const scopes = TWITCH_SCOPES.join(' ');
    const form = new URLSearchParams({ client_id: this.clientId, scopes });
    const device = await jsonFetch(DEVICE_URL, { method: 'POST', body: form });
    onCode(device);
    const deadline = Date.now() + device.expires_in * 1000;
    while (Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, device.interval * 1000));
      try {
        const token = await jsonFetch(TOKEN_URL, { method: 'POST', body: new URLSearchParams({
          client_id: this.clientId,
          scopes,
          device_code: device.device_code,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        }) });
        this.auth = this.tokenRecord(token);
        await this.saveAuth(this.auth);
        return this.auth;
      } catch (error) {
        if (error.body?.message !== 'authorization_pending') throw error;
      }
    }
    throw new Error('Twitch connection code expired');
  }

  async disconnectAccount() {
    const token = this.auth.accessToken;
    this.stop();
    try {
      if (this.clientId && token) {
        await jsonFetch('https://id.twitch.tv/oauth2/revoke', {
          method: 'POST',
          body: new URLSearchParams({ client_id: this.clientId, token })
        });
      }
    } finally {
      this.auth = {};
      await this.saveAuth({});
      this.state.patch({ twitchConnected: false, twitchLive: false, viewers: 0, twitchStatus: 'CONNECT TWITCH', twitchAvatar: '', twitchDisplayName: '', twitchMarkerAllowed: false });
    }
  }

  tokenRecord(token) {
    return { accessToken: token.access_token, refreshToken: token.refresh_token, expiresAt: Date.now() + token.expires_in * 1000 };
  }

  async ensureToken(force = false) {
    if (!this.auth.refreshToken || (!force && (this.auth.expiresAt || 0) > Date.now() + 60000)) return;
    if (!this.refreshPromise) {
      this.refreshPromise = (async () => {
        const token = await jsonFetch(TOKEN_URL, { method: 'POST', body: new URLSearchParams({
          client_id: this.clientId,
          grant_type: 'refresh_token',
          refresh_token: this.auth.refreshToken
        }) });
        this.auth = this.tokenRecord(token);
        await this.saveAuth(this.auth);
      })().finally(() => { this.refreshPromise = null; });
    }
    await this.refreshPromise;
  }

  headers() { return { Authorization: `Bearer ${this.auth.accessToken}`, 'Client-Id': this.clientId, 'Content-Type': 'application/json' }; }

  async helixFetch(url, options = {}) {
    await this.ensureToken();
    try {
      return await jsonFetch(url, { ...options, headers: { ...this.headers(), ...(options.headers || {}) } });
    } catch (error) {
      if (error.status !== 401 || !this.auth.refreshToken) throw error;
      await this.ensureToken(true);
      return jsonFetch(url, { ...options, headers: { ...this.headers(), ...(options.headers || {}) } });
    }
  }

  async pollStream() {
    const result = await this.helixFetch(`https://api.twitch.tv/helix/streams?user_id=${encodeURIComponent(this.userId)}`);
    const stream = result.data?.[0];
    if (stream) {
      if (!this.state.twitchLive || this.state.streamStartedAt !== stream.started_at) this.state.resetForStream(stream.started_at);
      this.state.patch({ viewers: stream.viewer_count, twitchLive: true, streamStartedAt: stream.started_at });
    } else this.state.patch({ viewers: 0, twitchLive: false, streamStartedAt: null });
  }

  async createMarker(description = '') {
    if (!this.state.twitchConnected) throw new Error('Twitch is not connected');
    if (!this.state.twitchMarkerAllowed) throw new Error('Reconnect Twitch to grant marker permission');
    return this.helixFetch('https://api.twitch.tv/helix/streams/markers', {
      method: 'POST',
      body: JSON.stringify({ user_id: this.userId, ...(description ? { description: String(description).slice(0, 140) } : {}) })
    });
  }

  connectEventSub(url = EVENTSUB_URL, subscribeOnWelcome = true) {
    this.eventSocket?.close();
    clearTimeout(this.keepaliveTimer);
    const socket = this.eventSocket = new WebSocket(url);
    socket.subscribeOnWelcome = subscribeOnWelcome;
    socket.on('message', raw => {
      const message = JSON.parse(raw.toString());
      const timeout = message.payload?.session?.keepalive_timeout_seconds;
      if (Number.isFinite(timeout)) this.keepaliveSeconds = timeout;
      this.armKeepaliveWatchdog(socket);
      this.onEventSub(message).catch(error => this.fail(error));
    });
    socket.on('close', () => {
      clearTimeout(this.keepaliveTimer);
      if (socket === this.eventSocket) this.reconnectTimer = setTimeout(() => this.connectEventSub(), 5000);
    });
    socket.on('error', error => console.error('Twitch EventSub:', error.message));
  }

  armKeepaliveWatchdog(socket = this.eventSocket, graceSeconds = 10) {
    clearTimeout(this.keepaliveTimer);
    if (!this.keepaliveSeconds || !socket) return;
    this.keepaliveTimer = setTimeout(() => {
      if (socket === this.eventSocket) socket.close();
    }, (this.keepaliveSeconds + graceSeconds) * 1000);
  }

  async onEventSub(message) {
    const type = message.metadata?.message_type;
    if (type === 'session_welcome' && this.eventSocket.subscribeOnWelcome) await this.subscribe(message.payload.session.id);
    if (type === 'session_reconnect') this.connectEventSub(message.payload.session.reconnect_url, false);
    if (type !== 'notification') return;
    const messageId = message.metadata?.message_id;
    if (messageId) {
      if (this.recentMessageIds.has(messageId)) return;
      this.recentMessageIds.add(messageId);
      if (this.recentMessageIds.size > 500) this.recentMessageIds.delete(this.recentMessageIds.values().next().value);
    }
    const event = message.payload.event;
    switch (message.metadata.subscription_type) {
      case 'channel.chat.message': this.state.addMessage(event.chatter_user_name, event.message?.text); break;
      case 'stream.online': this.state.resetForStream(event.started_at); this.pollStream().catch(error => this.fail(error)); break;
      case 'stream.offline': this.state.patch({ viewers: 0, twitchLive: false, streamStartedAt: null }); break;
    }
  }

  async subscribe(sessionId) {
    const specs = [
      { type: 'channel.chat.message', condition: { broadcaster_user_id: this.userId, user_id: this.userId } },
      { type: 'stream.online', condition: { broadcaster_user_id: this.userId } },
      { type: 'stream.offline', condition: { broadcaster_user_id: this.userId } }
    ];
    for (const spec of specs) await this.helixFetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
      method: 'POST', body: JSON.stringify({ ...spec, version: '1', transport: { method: 'websocket', session_id: sessionId } })
    });
  }

  fail(error) {
    console.error('Twitch:', error.message);
    const message = String(error?.message || '').toLowerCase();
    const reconnect = error?.status === 401 || message.includes('token') || message.includes('oauth');
    this.state.patch({ twitchConnected: false, twitchStatus: reconnect ? 'RECONNECT TWITCH' : 'TWITCH ERROR' });
  }
}

module.exports = { TwitchService, TWITCH_SCOPES, jsonFetch, twitchActivationUrl };
