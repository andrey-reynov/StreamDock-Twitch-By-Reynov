const { EventEmitter } = require('events');

class DashboardState extends EventEmitter {
  constructor() {
    super();
    this.viewers = 0;
    this.messages = 0;
    this.twitchLive = false;
    this.twitchConnected = false;
    this.streamStartedAt = null;
    this.obsConnected = false;
    this.obsLive = false;
    this.recordLive = false;
    this.obsStatus = 'OBS OFFLINE';
    this.obsCpu = 0;
    this.obsFps = 0;
    this.obsDropPercent = 0;
    this.streamBitrateKbps = 0;
    this.obsStreamDurationMs = 0;
    this.recordDurationMs = 0;
    this.obsInputs = [];
    this.audioLevels = {};
    this.twitchAvatar = '';
    this.twitchDisplayName = '';
    this.twitchMarkerAllowed = false;
    this.latestUser = '';
    this.latestMessage = '';
    this.twitchStatus = 'NOT CONNECTED';
  }
  patch(values) { Object.assign(this, values); this.emit('change', this); }
  resetForStream(startedAt) { this.messages = 0; this.streamStartedAt = startedAt || new Date().toISOString(); this.twitchLive = true; this.emit('change', this); }
  addMessage(user, message) { this.messages += 1; this.latestUser = user || ''; this.latestMessage = message || ''; this.emit('change', this); }
  duration(now = Date.now()) {
    if (!this.streamStartedAt) return '00:00:00';
    const seconds = Math.max(0, Math.floor((now - Date.parse(this.streamStartedAt)) / 1000));
    return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(n => String(n).padStart(2, '0')).join(':');
  }
}

module.exports = { DashboardState };
