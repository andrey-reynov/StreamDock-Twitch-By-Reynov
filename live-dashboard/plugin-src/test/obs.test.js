const test = require('node:test');
const assert = require('node:assert/strict');
const { bitrateKbps, dropPercent, mulToDb, obsFailureStatus } = require('../src/obs');

test('derives bitrate and dropped-frame percentage from OBS counters', () => {
  assert.equal(bitrateKbps(1_000_000, 2_000_000, 2000), 4000);
  assert.equal(bitrateKbps(undefined, 2_000_000, 2000), 0);
  assert.equal(dropPercent(25, 1000), 2.5);
  assert.equal(dropPercent(0, 0), 0);
  assert.equal(Math.round(mulToDb(0.1)), -20);
  assert.equal(mulToDb(0), -60);
});

test('toggles OBS recording and verifies recording state', async () => {
  const calls = [];
  const state = { obsConnected: true, recordLive: false, patch(values) { Object.assign(this, values); } };
  const service = new (require('../src/obs').ObsService)(state);
  service.obs = { async call(method) { calls.push(method); return method === 'GetRecordStatus' ? { outputActive: true, outputDuration: 1200 } : {}; } };
  assert.equal(await service.toggleRecord(), true);
  assert.deepEqual(calls, ['StartRecord', 'GetRecordStatus']);
  assert.equal(state.recordLive, true);
  assert.equal(state.recordDurationMs, 1200);
});

test('distinguishes OBS authentication failures from transport failures', () => {
  assert.equal(obsFailureStatus(new Error('authentication is required')), 'OBS AUTH');
  assert.equal(obsFailureStatus(new Error('invalid password')), 'OBS AUTH');
  assert.equal(obsFailureStatus(new Error('connect ECONNREFUSED')), 'OBS OFFLINE');
});

test('coalesces rapid stream toggles and verifies the resulting OBS state', async () => {
  const calls = [];
  let releaseStart;
  const startGate = new Promise(resolve => { releaseStart = resolve; });
  const state = { obsConnected: true, obsLive: false, patch(values) { Object.assign(this, values); } };
  const service = new (require('../src/obs').ObsService)(state);
  service.obs = {
    async call(method) {
      calls.push(method);
      if (method === 'StartStream') await startGate;
      if (method === 'GetStreamStatus') return { outputActive: true };
      return {};
    }
  };
  const first = service.toggle();
  const second = service.toggle();
  releaseStart();
  const [a, b] = await Promise.all([first, second]);
  assert.equal(a, true);
  assert.equal(b, true);
  assert.deepEqual(calls, ['StartStream', 'GetStreamStatus']);
  assert.equal(state.obsLive, true);
  assert.equal(state.obsStatus, 'OBS LIVE');
});

test('polls OBS analytics and computes bitrate from consecutive samples', async () => {
  const state = { patch(values) { Object.assign(this, values); } };
  const service = new (require('../src/obs').ObsService)(state);
  let bytes = 1_000_000;
  service.obs = {
    async call(method) {
      if (method === 'GetStats') return { cpuUsage: 12.5, activeFps: 60, outputSkippedFrames: 10, outputTotalFrames: 1000 };
      if (method === 'GetStreamStatus') return { outputActive: true, outputBytes: bytes, outputDuration: 5000 };
      if (method === 'GetRecordStatus') return { outputActive: true, outputDuration: 3000 };
      return {};
    }
  };
  await service.pollMetrics(1000);
  bytes = 2_000_000;
  await service.pollMetrics(3000);
  assert.equal(state.streamBitrateKbps, 4000);
  assert.equal(state.obsCpu, 12.5);
  assert.equal(state.obsFps, 60);
  assert.equal(state.obsDropPercent, 1);
  assert.equal(state.obsStreamDurationMs, 5000);
  assert.equal(state.recordDurationMs, 3000);
  assert.equal(state.recordLive, true);
});
