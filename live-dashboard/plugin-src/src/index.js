const { StreamDockRuntime } = require('./runtime');
const { DashboardState } = require('./state');
const { AUTH_FORMAT_VERSION, TwitchService, TWITCH_SCOPES, twitchActivationUrl } = require('./twitch');
const { version: PLUGIN_VERSION } = require('../package.json');
const { ObsService } = require('./obs');
const { PeakTracker } = require('./peak-tracker');
const { audioAbsoluteMeterSvg, audioAbsoluteStatusSvg, audioAbsoluteSvg, audioBalanceMetersSvg, audioBalanceStatusSvg, audioBalanceSvg, audioMeterSvg, avatarSvg, compactMetric, escapeXml, formatDurationMs, formatTimerMs, healthSvg, keySvg, timerSvg } = require('./ui');

const runtime = new StreamDockRuntime();
const state = new DashboardState();
const twitch = new TwitchService(state, async auth => {
  runtime.setGlobalSettings({ ...runtime.globalSettings, twitchAuth: auth });
});
const obs = new ObsService(state);
let durationTimer;
let persistTimer;
let lastConfig = '';
let lastPersistedSession = '';
let lastTwitchConnectRequest = null;
let lastTwitchDisconnectRequest = null;
let twitchConnectPromise = null;
let lastConnectionStatus = '';
let renderTimer;
const timerStates = new Map();
const markerStates = new Map();
const peakTracker = new PeakTracker();

function levelsFor(context, settings, names) { return peakTracker.levels(context, settings.holdPeak, names, state.audioLevels); }
function settingsFor(context) { return runtime.actionSettings.get(context) || {}; }
function titleFor(context, fallback) { return String(settingsFor(context).customTitle || fallback); }

function dashboardSvg(customTitle = '') {
  const ready = state.twitchConnected && state.obsConnected;
  const live = ready && (state.twitchLive || state.obsLive);
  const status = !ready ? 'SETUP' : (live ? 'LIVE' : 'OFFLINE');
  const color = !ready ? '#f59e0b' : (live ? '#ef4444' : '#9ca3af');
  const obsStatus = state.obsStatus;
  const heading = customTitle ? `<text x="72" y="13" text-anchor="middle" font-family="Arial" font-size="9" font-weight="700" fill="#a78bfa">${escapeXml(String(customTitle).length > 18 ? `${String(customTitle).slice(0, 15)}...` : customTitle)}</text>` : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
    <rect width="144" height="144" rx="14" fill="#0b1020"/>
    ${heading}<text x="72" y="${customTitle ? 30 : 25}" text-anchor="middle" font-family="Arial" font-size="${customTitle ? 17 : 21}" font-weight="700" fill="${color}">${status}</text>
    <text x="72" y="47" text-anchor="middle" font-family="Arial" font-size="12" fill="#fff">${state.duration()}</text>
    <rect x="7" y="52" width="62" height="54" rx="8" fill="#151d31"/>
    <text x="38" y="69" text-anchor="middle" font-family="Arial" font-size="9" font-weight="700" fill="#a78bfa">VIEWERS</text>
    <text x="38" y="96" text-anchor="middle" font-family="Arial" font-size="27" font-weight="700" fill="#fff">${compactMetric(state.viewers)}</text>
    <rect x="75" y="52" width="62" height="54" rx="8" fill="#151d31"/>
    <text x="106" y="69" text-anchor="middle" font-family="Arial" font-size="9" font-weight="700" fill="#a78bfa">CHAT</text>
    <text x="106" y="96" text-anchor="middle" font-family="Arial" font-size="27" font-weight="700" fill="#fff">${compactMetric(state.messages)}</text>
    <rect x="7" y="113" width="130" height="24" rx="7" fill="#151d31"/>
    <text x="72" y="130" text-anchor="middle" font-family="Arial" font-size="11" font-weight="700" fill="${state.obsConnected ? '#22c55e' : '#9ca3af'}">${obsStatus}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf8,${encodeURIComponent(svg)}`;
}

function render() {
  const twitchConfigured = Boolean(runtime.globalSettings.twitchClientId && runtime.globalSettings.twitchAuth?.accessToken);
  const obsConfigured = Boolean(runtime.globalSettings.obsUrl && runtime.globalSettings.obsPassword);
  for (const [context, action] of runtime.actions) {
    if (action === 'setup') {
      const ready = state.twitchConnected && state.obsConnected;
      const configured = twitchConfigured && obsConfigured;
      runtime.setTitle(context, '');
      runtime.setImage(context, keySvg(titleFor(context, 'DASHBOARD'), ready ? 'READY' : (configured ? 'CHECK' : 'SETUP'), ready ? 'ALL CONNECTED' : 'OPEN SETTINGS', ready ? '#22c55e' : '#f59e0b'));
    }
    if (action === 'viewers') {
      const value = state.twitchConnected
        ? (state.twitchLive ? compactMetric(state.viewers) : 'OFFLINE')
        : (twitchConfigured ? 'CHECK' : 'SETUP');
      const subtitle = state.twitchConnected ? (state.twitchLive ? 'LIVE NOW' : 'TWITCH') : 'USE SETUP';
      runtime.setTitle(context, '');
      runtime.setImage(context, keySvg(titleFor(context, 'VIEWERS'), value, subtitle, state.twitchLive ? '#ffffff' : '#d1d5db'));
    }
    if (action === 'messages') {
      runtime.setTitle(context, '');
      runtime.setImage(context, state.twitchConnected
        ? keySvg(titleFor(context, 'CHAT'), compactMetric(state.messages), state.twitchLive ? 'THIS STREAM' : 'MESSAGES')
        : keySvg(titleFor(context, 'CHAT'), 'SETUP', 'USE SETUP', '#f59e0b'));
    }
    if (action === 'stream') {
      const value = state.obsConnected ? (state.obsLive ? 'STOP' : 'START') : (!obsConfigured ? 'SETUP' : (state.obsStatus === 'OBS AUTH' ? 'AUTH' : 'OFFLINE'));
      const subtitle = !obsConfigured ? 'USE SETUP' : (state.obsLive ? 'LIVE' : (state.obsConnected ? 'OFFLINE' : 'OBS'));
      runtime.setTitle(context, '');
      runtime.setImage(context, keySvg(titleFor(context, 'STREAM'), value, subtitle, state.obsLive ? '#ef4444' : '#ffffff'));
    }
    if (action === 'record') {
      const value = state.obsConnected ? (state.recordLive ? 'STOP' : 'START') : (!obsConfigured ? 'SETUP' : 'OFFLINE');
      runtime.setTitle(context, '');
      runtime.setImage(context, keySvg(titleFor(context, 'RECORD'), value, !obsConfigured ? 'USE SETUP' : (state.recordLive ? 'REC' : 'READY'), state.recordLive ? '#ef4444' : (!obsConfigured ? '#f59e0b' : '#ffffff')));
    }
    if (action === 'obsstatus') {
      const value = !obsConfigured ? 'SETUP' : (state.obsLive && state.recordLive ? 'LIVE+REC' : (state.obsLive ? 'LIVE' : (state.recordLive ? 'REC' : state.obsStatus.replace('OBS ', ''))));
      runtime.setTitle(context, '');
      runtime.setImage(context, keySvg(titleFor(context, 'OBS'), value, !obsConfigured ? 'USE SETUP' : 'STATUS', state.obsConnected ? '#22c55e' : (!obsConfigured ? '#f59e0b' : '#d1d5db')));
    }
    if (action === 'bitrate') {
      const value = !obsConfigured ? 'SETUP' : (state.obsLive ? compactMetric(state.streamBitrateKbps) : '0');
      runtime.setTitle(context, '');
      runtime.setImage(context, keySvg(titleFor(context, 'BITRATE'), value, !obsConfigured ? 'USE SETUP' : 'KBPS', !obsConfigured ? '#f59e0b' : (state.streamBitrateKbps > 0 ? '#ffffff' : '#d1d5db')));
    }
    if (action === 'streamtime') {
      runtime.setTitle(context, '');
      runtime.setImage(context, !obsConfigured ? keySvg(titleFor(context, 'STREAM TIME'), 'SETUP', 'USE SETUP', '#f59e0b') : keySvg(titleFor(context, 'STREAM TIME'), formatDurationMs(state.obsStreamDurationMs), state.obsLive ? 'LIVE' : 'OFFLINE', state.obsLive ? '#ef4444' : '#d1d5db'));
    }
    if (action === 'recordtime') {
      runtime.setTitle(context, '');
      runtime.setImage(context, !obsConfigured ? keySvg(titleFor(context, 'RECORD TIME'), 'SETUP', 'USE SETUP', '#f59e0b') : keySvg(titleFor(context, 'RECORD TIME'), formatDurationMs(state.recordDurationMs), state.recordLive ? 'RECORDING' : 'STOPPED', state.recordLive ? '#ef4444' : '#d1d5db'));
    }
    if (action === 'obsstats') {
      runtime.setTitle(context, '');
      runtime.setImage(context, obsConfigured ? healthSvg(state.obsCpu, state.obsFps, state.obsDropPercent, titleFor(context, 'OBS HEALTH')) : keySvg(titleFor(context, 'OBS HEALTH'), 'SETUP', 'USE SETUP', '#f59e0b'));
    }
    if (action === 'audiocheck' || action === 'audioabsolute') {
      const settings = settingsFor(context);
      const inputName = settings.inputName;
      const [level] = levelsFor(context, settings, [inputName]);
      const displayMode = settings.displayMode || (action === 'audioabsolute' ? 'meter' : 'live');
      const minDb = Number.isFinite(Number(settings.minDb)) ? Number(settings.minDb) : -20;
      const maxDb = Number.isFinite(Number(settings.maxDb)) ? Number(settings.maxDb) : -8;
      const title = titleFor(context, 'AUDIO — TRACK');
      runtime.setTitle(context, '');
      if (!obsConfigured) runtime.setImage(context, keySvg(title, 'SETUP', 'USE SETUP', '#f59e0b'));
      else if (!inputName) runtime.setImage(context, keySvg(title, 'SELECT', 'OPEN SETTINGS', '#f59e0b'));
      else if (displayMode === 'status') runtime.setImage(context, audioAbsoluteStatusSvg(inputName, level.peakDb, minDb, maxDb, title));
      else if (displayMode === 'value') runtime.setImage(context, audioAbsoluteSvg(inputName, level.peakDb, minDb, maxDb, title));
      else if (displayMode === 'meter') runtime.setImage(context, audioAbsoluteMeterSvg(inputName, level.peakDb, minDb, maxDb, title));
      else runtime.setImage(context, audioMeterSvg(inputName, level.currentDb, level.peakDb, settings.holdPeak, title));
    }
    if (action === 'audiobalance' || action === 'audiobalancemeters') {
      const settings = settingsFor(context);
      const levelMode = settings.levelMode || 'peak';
      const displayMode = settings.displayMode || (action === 'audiobalancemeters' ? 'meters' : 'number');
      const usePeaks = levelMode === 'peak' || displayMode === 'meters';
      const holds = usePeaks ? [settings.holdTargetPeak, settings.holdReferencePeak] : [false, false];
      const [target, reference] = peakTracker.levels(context, holds, [settings.targetInput, settings.referenceInput], state.audioLevels);
      const targetDb = usePeaks ? target.peakDb : target.currentDb;
      const referenceDb = usePeaks ? reference.peakDb : reference.currentDb;
      const title = titleFor(context, displayMode === 'meters' ? 'BALANCE METERS' : 'AUDIO BALANCE');
      runtime.setTitle(context, '');
      if (!settings.targetInput || !settings.referenceInput) runtime.setImage(context, keySvg(title, 'SELECT', 'OPEN SETTINGS', '#f59e0b'));
      else if (displayMode === 'meters') runtime.setImage(context, audioBalanceMetersSvg(settings.targetInput, settings.referenceInput, { peakDb: targetDb }, { peakDb: referenceDb }, title));
      else if (displayMode === 'status') runtime.setImage(context, audioBalanceStatusSvg(settings.targetInput, settings.referenceInput, targetDb - referenceDb, title));
      else runtime.setImage(context, audioBalanceSvg(settings.targetInput, settings.referenceInput, targetDb - referenceDb, targetDb, referenceDb, title));
    }
    if (action === 'peakreset') {
      runtime.setTitle(context, '');
      runtime.setImage(context, keySvg(titleFor(context, 'PEAK RESET'), 'RESET', 'ALL AUDIO PEAKS', '#f59e0b'));
    }
    if (action === 'twitchaccount') {
      runtime.setTitle(context, '');
      runtime.setImage(context, avatarSvg(state.twitchDisplayName, state.twitchAvatar, state.twitchConnected, settingsFor(context).customTitle || ''));
    }
    if (action === 'timer') {
      const settings = runtime.actionSettings.get(context) || {};
      const durationMs = Math.max(0, Number(settings.durationSeconds) || 300) * 1000;
      let timer = timerStates.get(context);
      if (!timer || (!timer.running && (timer.durationMs !== durationMs || timer.resetNonce !== settings.resetNonce))) {
        timer = { durationMs, remainingMs: durationMs, running: false, resetNonce: settings.resetNonce };
        timerStates.set(context, timer);
      }
      const remaining = timer.running ? timer.endAt - Date.now() : timer.remainingMs;
      const color = remaining < 0 ? '#ef4444' : (remaining <= 60000 ? '#f59e0b' : '#ffffff');
      runtime.setTitle(context, '');
      runtime.setImage(context, timerSvg(formatTimerMs(remaining), timer.running ? 'RUNNING' : (remaining === durationMs ? 'PRESS TO START' : 'PAUSED'), color, titleFor(context, 'TIMER')));
    }
    if (action === 'marker') {
      const feedback = markerStates.get(context);
      const value = feedback?.until > Date.now() ? feedback.value : (!state.twitchMarkerAllowed && !state.recordLive ? 'SETUP' : 'MARK');
      runtime.setTitle(context, '');
      runtime.setImage(context, keySvg(titleFor(context, 'MOMENT'), value, state.twitchLive && state.recordLive ? 'TWITCH + OBS' : (state.twitchLive ? 'TWITCH VOD' : (state.recordLive ? 'OBS CHAPTER' : 'START LIVE/REC')), value === 'SAVED' ? '#22c55e' : (value === 'ERROR' ? '#ef4444' : '#ffffff')));
    }
    if (action === 'dashboard') runtime.setImage(context, dashboardSvg(settingsFor(context).customTitle || ''));
  }
}

function scheduleRender() {
  if (renderTimer) return;
  renderTimer = setTimeout(() => { renderTimer = null; render(); }, 100);
}

function syncConnectionStatus() {
  const connectionStatus = {
    twitchConnected: state.twitchConnected,
    twitchLabel: state.twitchConnected ? state.twitchStatus : '',
    obsConnected: state.obsConnected,
    obsLabel: state.obsStatus,
    obsInputs: state.obsInputs,
    twitchMarkerAllowed: state.twitchMarkerAllowed,
    pluginVersion: PLUGIN_VERSION,
    twitchAuthorizationVersion: runtime.globalSettings.twitchAuth?.authorizedWithPluginVersion || '',
    twitchAuthFormatVersion: runtime.globalSettings.twitchAuth?.authFormatVersion || 0,
    twitchScopes: twitch.scopes || runtime.globalSettings.twitchAuth?.scopes || [],
    twitchRequiredScopes: TWITCH_SCOPES,
    twitchTokenPresent: Boolean(runtime.globalSettings.twitchAuth?.accessToken),
    twitchTokenValid: state.twitchConnected,
    twitchReconnectRequired: Boolean(runtime.globalSettings.twitchAuth?.accessToken) && (
      runtime.globalSettings.twitchAuth?.authFormatVersion !== AUTH_FORMAT_VERSION ||
      TWITCH_SCOPES.some(scope => !(twitch.scopes || runtime.globalSettings.twitchAuth?.scopes || []).includes(scope)) ||
      state.twitchStatus === 'RECONNECT TWITCH'
    )
  };
  const serialized = JSON.stringify(connectionStatus);
  if (serialized === lastConnectionStatus) return;
  lastConnectionStatus = serialized;
  runtime.setGlobalSettings({ ...runtime.globalSettings, connectionStatus });
}

async function configure(settings) {
  if (settings.session?.startedAt && (!state.streamStartedAt || settings.session.startedAt === state.streamStartedAt)) {
    state.streamStartedAt = settings.session.startedAt;
    state.messages = settings.session.messages || 0;
  }
  const config = JSON.stringify({ twitchClientId: settings.twitchClientId, twitchAuth: settings.twitchAuth, obsUrl: settings.obsUrl, obsPassword: settings.obsPassword });
  if (config === lastConfig) { render(); return; }
  lastConfig = config;
  await Promise.allSettled([twitch.configure(settings), obs.configure(settings)]);
  render();
}

state.on('change', () => {
  scheduleRender();
  syncConnectionStatus();
  const session = { startedAt: state.streamStartedAt, messages: state.messages };
  const serialized = JSON.stringify(session);
  if (serialized === lastPersistedSession) return;
  lastPersistedSession = serialized;
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => runtime.setGlobalSettings({
    ...runtime.globalSettings,
    session
  }), 500);
});

async function connectTwitch(clientId, context) {
  if (twitchConnectPromise) return twitchConnectPromise;
  twitchConnectPromise = (async () => {
    try {
      await twitch.startDeviceConnect(clientId, device => {
        const url = twitchActivationUrl(device);
        runtime.openUrl(url);
        runtime.sendToPI(context, { type: 'deviceCode', code: device.user_code, url });
      });
      runtime.sendToPI(context, { type: 'connected' });
      await twitch.configure(runtime.globalSettings);
    } catch (error) {
      runtime.sendToPI(context, { type: 'error', message: error.message });
    }
  })().finally(() => { twitchConnectPromise = null; });
  return twitchConnectPromise;
}

runtime.onGlobalSettings = settings => {
  const actionSettingsRequest = settings.actionSettingsRequest;
  if (actionSettingsRequest?.id && actionSettingsRequest.context) {
    const cleaned = { ...settings };
    delete cleaned.actionSettingsRequest;
    runtime.setGlobalSettings(cleaned);
    runtime.setSettings(actionSettingsRequest.context, actionSettingsRequest.settings || {});
    render();
    return;
  }
  const connectRequest = settings.twitchConnectRequest;
  if (connectRequest?.id && connectRequest.id !== lastTwitchConnectRequest) {
    lastTwitchConnectRequest = connectRequest.id;
    const cleaned = { ...settings };
    delete cleaned.twitchConnectRequest;
    runtime.setGlobalSettings(cleaned);
    connectTwitch(settings.twitchClientId, connectRequest.context);
    return;
  }
  const disconnectRequest = settings.twitchDisconnectRequest;
  if (disconnectRequest?.id && disconnectRequest.id !== lastTwitchDisconnectRequest) {
    lastTwitchDisconnectRequest = disconnectRequest.id;
    const cleaned = { ...settings };
    delete cleaned.twitchDisconnectRequest;
    runtime.setGlobalSettings(cleaned);
    twitch.disconnectAccount().catch(error => runtime.sendToPI(disconnectRequest.context, { type: 'error', message: error.message }));
    return;
  }
  configure(settings).catch(error => console.error(error));
};
runtime.onEvent = message => {
  if (message.event === 'willAppear') render();
  if (message.event === 'willDisappear') { timerStates.delete(message.context); markerStates.delete(message.context); peakTracker.reset(message.context); }
  if (message.event === 'didReceiveSettings') render();
  if (message.event === 'keyUp' && message.action?.endsWith('.stream')) obs.toggle().catch(error => console.error(error));
  if (message.event === 'touchTap' && message.action?.endsWith('.stream')) obs.toggle().catch(error => console.error(error));
  if ((message.event === 'keyUp' || message.event === 'touchTap') && message.action?.endsWith('.record')) obs.toggleRecord().catch(error => console.error(error));
  if ((message.event === 'keyUp' || message.event === 'touchTap') && /\.(audiocheck|audiobalance|audiobalancemeters|audioabsolute)$/.test(message.action || '')) {
    peakTracker.reset(message.context);
    render();
  }
  if ((message.event === 'keyUp' || message.event === 'touchTap') && message.action?.endsWith('.peakreset')) {
    peakTracker.resetAll();
    render();
  }
  if ((message.event === 'keyUp' || message.event === 'touchTap') && message.action?.endsWith('.timer')) {
    const context = message.context;
    const timer = timerStates.get(context);
    if (timer) {
      if (timer.running) { timer.remainingMs = timer.endAt - Date.now(); timer.running = false; }
      else { timer.endAt = Date.now() + timer.remainingMs; timer.running = true; }
      render();
    }
  }
  if ((message.event === 'keyUp' || message.event === 'touchTap') && message.action?.endsWith('.marker')) {
    const context = message.context;
    const description = runtime.actionSettings.get(context)?.description || '';
    Promise.allSettled([twitch.createMarker(description), obs.createRecordChapter(description)]).then(results => {
      const saved = results.some(result => result.status === 'fulfilled' && result.value);
      markerStates.set(context, { value: saved ? 'SAVED' : 'ERROR', until: Date.now() + 2500 });
      render();
    });
  }
};
runtime.onSendToPlugin = async (payload, context) => {
  if (payload.command === 'openTwitchConsole') {
    runtime.openUrl('https://dev.twitch.tv/console/apps');
    return;
  }
  if (payload.command !== 'connectTwitch') return;
  await connectTwitch(payload.clientId || runtime.globalSettings.twitchClientId, context);
};

durationTimer = setInterval(render, 1000);
runtime.connect();
process.on('SIGTERM', () => { clearInterval(durationTimer); twitch.stop(); obs.disconnect().finally(() => process.exit(0)); });

module.exports = { dashboardSvg };
