const test = require('node:test');
const assert = require('node:assert/strict');
const { absoluteState, audioAbsoluteMeterSvg, audioAbsoluteStatusSvg, audioAbsoluteSvg, audioBalanceMetersSvg, audioBalanceStatusSvg, audioBalanceSvg, audioMeterSvg, avatarSvg, compactMetric, formatDurationMs, formatTimerMs, healthSvg, keySvg, truncateLabel, valueFontSize } = require('../src/ui');

test('large metrics use compact comma-decimal notation', () => {
  assert.equal(compactMetric(999), '999');
  assert.equal(compactMetric(1000), '1k');
  assert.equal(compactMetric(1200), '1,2k');
  assert.equal(compactMetric(12000), '12k');
  assert.equal(compactMetric(999999), '1m');
  assert.equal(compactMetric(1250000), '1,3m');
});

test('renders audio meters, balance state, avatar, and signed timers', () => {
  assert.equal(truncateLabel('Very long microphone name', 12), 'Very long...');
  assert.equal(formatTimerMs(5000), '00:00:05');
  assert.equal(formatTimerMs(-5000), '-00:00:05');
  assert.match(decodeURIComponent(audioMeterSvg('Microphone', -18.2, -9.5).split(',')[1]), />NOW<.*>-18\.2 dB<.*>PEAK<.*>-9\.5 dB</s);
  assert.match(decodeURIComponent(audioBalanceSvg('Mic', 'Game', 10, -12, -22).split(',')[1]), />\+10\.0<.*>T -12 • R -22</s);
  assert.match(decodeURIComponent(audioBalanceSvg('Mic', 'Game', -4, -24, -20).split(',')[1]), />-4\.0<.*>T -24 • R -20</s);
  assert.doesNotMatch(decodeURIComponent(audioBalanceSvg('Mic', 'Game', 10, -12, -22).split(',')[1]), /[↑↓↔]/);
  assert.match(decodeURIComponent(audioBalanceStatusSvg('Mic', 'Game', 10).split(',')[1]), />OK</);
  const meters = decodeURIComponent(audioBalanceMetersSvg('Mic', 'Game', { currentDb: -18, peakDb: -9 }, { currentDb: -28, peakDb: -19 }).split(',')[1]);
  assert.match(meters, />BALANCE METERS<.*>Mic<.*>-9\.0 dB<.*>Game<.*>-19\.0 dB</s);
  assert.match(decodeURIComponent(avatarSvg('Streamer', '', true).split(',')[1]), />Streamer</);
});

test('absolute audio reference supports value, meter, and status views', () => {
  assert.equal(absoluteState(-25, -20, -8), 'QUIET');
  assert.equal(absoluteState(-14, -20, -8), 'OK');
  assert.equal(absoluteState(-4, -20, -8), 'LOUD');
  assert.match(decodeURIComponent(audioAbsoluteSvg('Mic', -14, -20, -8).split(',')[1]), />-14\.0<.*>OK • -20…-8 dB</s);
  assert.match(decodeURIComponent(audioAbsoluteStatusSvg('Mic', -25, -20, -8).split(',')[1]), />QUIET<.*>Mic • -25\.0 dB</s);
  assert.match(decodeURIComponent(audioAbsoluteMeterSvg('Mic', -14, -20, -8).split(',')[1]), />ABSOLUTE LEVEL<.*>Mic<.*>-14\.0<.*>OK • -20…-8 dB</s);
});

test('formats OBS timers and renders the three-part health tile', () => {
  assert.equal(formatDurationMs(3_723_000), '01:02:03');
  const svg = decodeURIComponent(healthSvg(12.34, 59.94, 1.25).split(',')[1]);
  assert.match(svg, />OBS HEALTH</);
  assert.match(svg, />CPU</);
  assert.match(svg, />12\.3%</);
  assert.match(svg, />FPS</);
  assert.match(svg, />59\.9</);
  assert.match(svg, />DROPS</);
  assert.match(svg, />1\.3%</);
});

test('adaptive LCD typography keeps short values large and long states compact', () => {
  assert.equal(valueFontSize(3), 48);
  assert.equal(valueFontSize('START'), 36);
  assert.equal(valueFontSize('OFFLINE'), 27);
  assert.equal(valueFontSize('RECONNECT'), 20);
  const svg = decodeURIComponent(keySvg('VIEWERS', 'RECONNECT', 'TWITCH').split(',')[1]);
  assert.match(svg, /width="144" height="144"/);
  assert.match(svg, /font-size="15"[^>]*>VIEWERS</);
  assert.match(svg, /font-size="20"[^>]*>RECONNECT</);
  assert.match(svg, /font-size="12"[^>]*>TWITCH</);
  assert.match(svg, /y="83"[^>]*>RECONNECT</);
  assert.match(decodeURIComponent(keySvg('A very long custom dashboard title', 'READY').split(',')[1]), />A very long c\.\.\.</);
});
