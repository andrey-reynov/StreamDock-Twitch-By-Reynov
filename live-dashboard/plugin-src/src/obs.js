const { default: OBSWebSocket, EventSubscription } = require('obs-websocket-js');

function obsFailureStatus(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('authentication') || message.includes('password') ? 'OBS AUTH' : 'OBS OFFLINE';
}

function bitrateKbps(previousBytes, currentBytes, elapsedMs) {
  if (!Number.isFinite(previousBytes) || !Number.isFinite(currentBytes) || !Number.isFinite(elapsedMs) || elapsedMs <= 0 || currentBytes < previousBytes) return 0;
  return Math.round(((currentBytes - previousBytes) * 8) / elapsedMs);
}

function dropPercent(skipped, total) {
  return total > 0 ? (Math.max(0, skipped) / total) * 100 : 0;
}

function mulToDb(value) {
  return value > 0 ? Math.max(-60, 20 * Math.log10(value)) : -60;
}

class ObsService {
  constructor(state) { this.state = state; this.obs = new OBSWebSocket(); }
  async configure(settings) {
    await this.disconnect();
    this.obs.removeAllListeners();
    this.url = settings.obsUrl?.trim() || 'ws://127.0.0.1:4455';
    this.password = settings.obsPassword || '';
    this.obs.on('StreamStateChanged', event => this.state.patch({ obsLive: event.outputActive, obsStatus: event.outputActive ? 'OBS LIVE' : 'OBS READY' }));
    this.obs.on('RecordStateChanged', event => this.state.patch({ recordLive: event.outputActive }));
    this.obs.on('InputVolumeMeters', event => {
      const levels = { ...this.state.audioLevels };
      const inputNames = new Set(this.state.obsInputs);
      for (const input of event.inputs || []) {
        inputNames.add(input.inputName);
        const channels = input.inputLevelsMul || [];
        const current = Math.max(0, ...channels.map(channel => Number(channel[0]) || 0));
        const peak = Math.max(0, ...channels.map(channel => Number(channel[1]) || Number(channel[0]) || 0));
        levels[input.inputName] = { currentDb: mulToDb(current), peakDb: mulToDb(peak), updatedAt: Date.now() };
      }
      this.state.patch({ audioLevels: levels, obsInputs: [...inputNames].sort((a, b) => a.localeCompare(b)) });
    });
    try {
      await this.obs.connect(this.url, this.password, { eventSubscriptions: EventSubscription.All | EventSubscription.InputVolumeMeters });
      this.state.patch({ obsConnected: true, obsStatus: 'OBS READY' });
      await this.pollMetrics();
      this.statsTimer = setInterval(() => this.pollMetrics().catch(error => console.error('OBS metrics:', error.message)), 2000);
    } catch (error) {
      console.error('OBS:', error.message);
      this.state.patch({ obsConnected: false, obsLive: false, obsStatus: obsFailureStatus(error) });
    }
  }
  async disconnect() {
    clearInterval(this.statsTimer);
    this.previousStreamBytes = undefined;
    this.previousStreamSampleAt = undefined;
    this.lastInputRefresh = undefined;
    try { await this.obs.disconnect(); } catch {}
    this.state.patch({ obsConnected: false, streamBitrateKbps: 0 });
  }
  async pollMetrics(now = Date.now()) {
    const shouldRefreshInputs = !this.lastInputRefresh || now - this.lastInputRefresh >= 10000;
    const [statsResult, streamResult, recordResult, inputResult] = await Promise.allSettled([
      this.obs.call('GetStats'),
      this.obs.call('GetStreamStatus'),
      this.obs.call('GetRecordStatus'),
      shouldRefreshInputs ? this.obs.call('GetInputList') : Promise.resolve(null)
    ]);
    const stats = statsResult.status === 'fulfilled' ? statsResult.value : {};
    const stream = streamResult.status === 'fulfilled' ? streamResult.value : {};
    const record = recordResult.status === 'fulfilled' ? recordResult.value : {};
    const inputList = inputResult.status === 'fulfilled' ? inputResult.value : null;
    if (inputList) this.lastInputRefresh = now;
    const streamActive = Boolean(stream.outputActive);
    let bitrate = 0;
    if (streamActive) {
      bitrate = bitrateKbps(this.previousStreamBytes, Number(stream.outputBytes), now - this.previousStreamSampleAt);
      this.previousStreamBytes = Number(stream.outputBytes);
      this.previousStreamSampleAt = now;
    } else {
      this.previousStreamBytes = undefined;
      this.previousStreamSampleAt = undefined;
    }
    this.state.patch({
      obsConnected: true,
      obsLive: streamActive,
      recordLive: Boolean(record.outputActive),
      obsStatus: streamActive ? 'OBS LIVE' : 'OBS READY',
      obsCpu: Number(stats.cpuUsage) || 0,
      obsFps: Number(stats.activeFps) || 0,
      obsDropPercent: dropPercent(Number(stats.outputSkippedFrames) || 0, Number(stats.outputTotalFrames) || 0),
      streamBitrateKbps: bitrate,
      obsStreamDurationMs: Number(stream.outputDuration) || 0,
      recordDurationMs: Number(record.outputDuration) || 0,
      obsInputs: inputList ? (inputList.inputs || []).map(input => input.inputName).sort((a, b) => a.localeCompare(b)) : this.state.obsInputs
    });
  }
  async toggle() {
    if (!this.state.obsConnected) throw new Error('OBS is not connected');
    if (!this.togglePromise) {
      this.togglePromise = (async () => {
        await this.obs.call(this.state.obsLive ? 'StopStream' : 'StartStream');
        const status = await this.obs.call('GetStreamStatus');
        this.state.patch({ obsLive: status.outputActive, obsStatus: status.outputActive ? 'OBS LIVE' : 'OBS READY' });
        return status.outputActive;
      })().finally(() => { this.togglePromise = null; });
    }
    return this.togglePromise;
  }
  async toggleRecord() {
    if (!this.state.obsConnected) throw new Error('OBS is not connected');
    if (!this.recordTogglePromise) {
      this.recordTogglePromise = (async () => {
        await this.obs.call(this.state.recordLive ? 'StopRecord' : 'StartRecord');
        const status = await this.obs.call('GetRecordStatus');
        this.state.patch({ recordLive: status.outputActive, recordDurationMs: Number(status.outputDuration) || 0 });
        return status.outputActive;
      })().finally(() => { this.recordTogglePromise = null; });
    }
    return this.recordTogglePromise;
  }
  async createRecordChapter(chapterName) {
    if (!this.state.obsConnected || !this.state.recordLive) return null;
    return this.obs.call('CreateRecordChapter', chapterName ? { chapterName: String(chapterName).slice(0, 140) } : {});
  }
}

module.exports = { ObsService, bitrateKbps, dropPercent, mulToDb, obsFailureStatus };
