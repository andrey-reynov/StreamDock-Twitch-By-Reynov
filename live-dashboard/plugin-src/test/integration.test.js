const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawn } = require('node:child_process');
const WebSocket = require('ws');

test('built plugin registers and updates key and dashboard contexts', { timeout: 8000 }, async () => {
  const server = new WebSocket.Server({ port: 0 });
  await new Promise(resolve => server.once('listening', resolve));
  const port = server.address().port;
  const bundle = path.resolve(__dirname, '../../com.personal.streamdock.livedashboard.sdPlugin/plugin/index.js');
  const child = spawn(process.execPath, [bundle, '-port', String(port), '-pluginUUID', 'com.personal.streamdock.livedashboard', '-registerEvent', 'registerPlugin', '-info', '{}'], { stdio: ['ignore', 'pipe', 'pipe'] });
  const received = [];

  try {
    await new Promise((resolve, reject) => {
      child.once('error', reject);
      server.once('connection', socket => {
        socket.on('message', raw => {
          const message = JSON.parse(raw.toString());
          received.push(message);
          if (message.event === 'registerPlugin') {
            socket.send(JSON.stringify({ event: 'didReceiveGlobalSettings', payload: { settings: {} } }));
            socket.send(JSON.stringify({ event: 'willAppear', action: 'com.personal.streamdock.livedashboard.setup', context: 'setup-1', payload: { settings: {} } }));
            socket.send(JSON.stringify({ event: 'willAppear', action: 'com.personal.streamdock.livedashboard.viewers', context: 'viewer-1', payload: { settings: {} } }));
            socket.send(JSON.stringify({ event: 'willAppear', action: 'com.personal.streamdock.livedashboard.messages', context: 'chat-1', payload: { settings: {} } }));
            socket.send(JSON.stringify({ event: 'willAppear', action: 'com.personal.streamdock.livedashboard.stream', context: 'stream-1', payload: { settings: {} } }));
            socket.send(JSON.stringify({ event: 'willAppear', action: 'com.personal.streamdock.livedashboard.record', context: 'record-1', payload: { settings: {} } }));
            socket.send(JSON.stringify({ event: 'willAppear', action: 'com.personal.streamdock.livedashboard.obsstatus', context: 'obs-status-1', payload: { settings: {} } }));
            socket.send(JSON.stringify({ event: 'willAppear', action: 'com.personal.streamdock.livedashboard.bitrate', context: 'bitrate-1', payload: { settings: {} } }));
            socket.send(JSON.stringify({ event: 'willAppear', action: 'com.personal.streamdock.livedashboard.streamtime', context: 'stream-time-1', payload: { settings: {} } }));
            socket.send(JSON.stringify({ event: 'willAppear', action: 'com.personal.streamdock.livedashboard.recordtime', context: 'record-time-1', payload: { settings: {} } }));
            socket.send(JSON.stringify({ event: 'willAppear', action: 'com.personal.streamdock.livedashboard.obsstats', context: 'obs-stats-1', payload: { settings: {} } }));
            socket.send(JSON.stringify({ event: 'willAppear', action: 'com.personal.streamdock.livedashboard.audiocheck', context: 'audio-1', payload: { settings: {} } }));
            socket.send(JSON.stringify({ event: 'willAppear', action: 'com.personal.streamdock.livedashboard.audiobalance', context: 'balance-1', payload: { settings: {} } }));
            socket.send(JSON.stringify({ event: 'willAppear', action: 'com.personal.streamdock.livedashboard.audiobalancemeters', context: 'balance-meters-1', payload: { settings: {} } }));
            socket.send(JSON.stringify({ event: 'willAppear', action: 'com.personal.streamdock.livedashboard.audioabsolute', context: 'absolute-1', payload: { settings: {} } }));
            socket.send(JSON.stringify({ event: 'willAppear', action: 'com.personal.streamdock.livedashboard.peakreset', context: 'peak-reset-1', payload: { settings: {} } }));
            socket.send(JSON.stringify({ event: 'willAppear', action: 'com.personal.streamdock.livedashboard.twitchaccount', context: 'account-1', payload: { settings: {} } }));
            socket.send(JSON.stringify({ event: 'willAppear', action: 'com.personal.streamdock.livedashboard.timer', context: 'timer-1', payload: { settings: { durationSeconds: 90 } } }));
            socket.send(JSON.stringify({ event: 'willAppear', action: 'com.personal.streamdock.livedashboard.marker', context: 'marker-1', payload: { settings: {} } }));
            socket.send(JSON.stringify({ event: 'willAppear', action: 'com.personal.streamdock.livedashboard.dashboard', context: 'board-1', payload: { settings: {} } }));
          }
          const hasSetup = received.some(item => item.event === 'setImage' && item.context === 'setup-1' && item.payload.image.startsWith('data:image/svg+xml'));
          const hasViewer = received.some(item => item.event === 'setImage' && item.context === 'viewer-1' && item.payload.image.startsWith('data:image/svg+xml'));
          const hasChat = received.some(item => item.event === 'setImage' && item.context === 'chat-1' && item.payload.image.startsWith('data:image/svg+xml'));
          const hasStream = received.some(item => item.event === 'setImage' && item.context === 'stream-1' && item.payload.image.startsWith('data:image/svg+xml'));
          const hasRecord = received.some(item => item.event === 'setImage' && item.context === 'record-1' && item.payload.image.startsWith('data:image/svg+xml'));
          const hasObsStatus = received.some(item => item.event === 'setImage' && item.context === 'obs-status-1' && item.payload.image.startsWith('data:image/svg+xml'));
          const hasBitrate = received.some(item => item.event === 'setImage' && item.context === 'bitrate-1' && item.payload.image.startsWith('data:image/svg+xml'));
          const hasStreamTime = received.some(item => item.event === 'setImage' && item.context === 'stream-time-1' && item.payload.image.startsWith('data:image/svg+xml'));
          const hasRecordTime = received.some(item => item.event === 'setImage' && item.context === 'record-time-1' && item.payload.image.startsWith('data:image/svg+xml'));
          const hasObsStats = received.some(item => item.event === 'setImage' && item.context === 'obs-stats-1' && item.payload.image.startsWith('data:image/svg+xml'));
          const hasAudio = received.some(item => item.event === 'setImage' && item.context === 'audio-1' && item.payload.image.startsWith('data:image/svg+xml'));
          const hasBalance = received.some(item => item.event === 'setImage' && item.context === 'balance-1' && item.payload.image.startsWith('data:image/svg+xml'));
          const hasBalanceMeters = received.some(item => item.event === 'setImage' && item.context === 'balance-meters-1' && item.payload.image.startsWith('data:image/svg+xml'));
          const hasAbsolute = received.some(item => item.event === 'setImage' && item.context === 'absolute-1' && item.payload.image.startsWith('data:image/svg+xml'));
          const hasPeakReset = received.some(item => item.event === 'setImage' && item.context === 'peak-reset-1' && item.payload.image.startsWith('data:image/svg+xml'));
          const hasAccount = received.some(item => item.event === 'setImage' && item.context === 'account-1' && item.payload.image.startsWith('data:image/svg+xml'));
          const hasTimer = received.some(item => item.event === 'setImage' && item.context === 'timer-1' && item.payload.image.startsWith('data:image/svg+xml'));
          const hasMarker = received.some(item => item.event === 'setImage' && item.context === 'marker-1' && item.payload.image.startsWith('data:image/svg+xml'));
          const hasBoard = received.some(item => item.event === 'setImage' && item.context === 'board-1' && item.payload.image.startsWith('data:image/svg+xml'));
          if (hasSetup && hasViewer && hasChat && hasStream && hasRecord && hasObsStatus && hasBitrate && hasStreamTime && hasRecordTime && hasObsStats && hasAudio && hasBalance && hasBalanceMeters && hasAbsolute && hasPeakReset && hasAccount && hasTimer && hasMarker && hasBoard) resolve();
        });
      });
    });
    assert.ok(received.some(item => item.event === 'registerPlugin'));
    assert.ok(received.some(item => item.event === 'getGlobalSettings'));
    assert.ok(received.some(item => item.event === 'setGlobalSettings' && item.payload.connectionStatus && item.payload.connectionStatus.twitchConnected === false));
    const setup = received.find(item => item.event === 'setImage' && item.context === 'setup-1');
    assert.match(decodeURIComponent(setup.payload.image.split(',')[1]), />DASHBOARD<.*>SETUP<.*>OPEN SETTINGS</s);
    const viewer = received.find(item => item.event === 'setImage' && item.context === 'viewer-1');
    const viewerSvg = decodeURIComponent(viewer.payload.image.split(',')[1]);
    assert.match(viewerSvg, /font-size="15"[^>]*>VIEWERS</);
    assert.match(viewerSvg, /font-size="36"[^>]*>SETUP</);
    const board = received.find(item => item.event === 'setImage' && item.context === 'board-1');
    const svg = decodeURIComponent(board.payload.image.split(',')[1]);
    assert.match(svg, /width="144" height="144"/);
    assert.match(svg, />VIEWERS<.*>CHAT</s);
    const health = received.find(item => item.event === 'setImage' && item.context === 'obs-stats-1');
    assert.match(decodeURIComponent(health.payload.image.split(',')[1]), />OBS HEALTH</);
    const timer = received.find(item => item.event === 'setImage' && item.context === 'timer-1');
    assert.match(decodeURIComponent(timer.payload.image.split(',')[1]), />TIMER<.*>00:01:30</s);
  } finally {
    child.kill();
    await new Promise(resolve => server.close(resolve));
  }
});
