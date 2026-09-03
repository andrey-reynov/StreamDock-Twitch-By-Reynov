const test = require('node:test');
const assert = require('node:assert/strict');
const { DashboardState } = require('../src/state');

test('counts messages and resets at a new stream', () => {
  const state = new DashboardState();
  state.addMessage('alice', 'hello');
  state.addMessage('bob', 'hi');
  assert.equal(state.messages, 2);
  assert.equal(state.latestUser, 'bob');
  state.resetForStream('2026-09-02T10:00:00Z');
  assert.equal(state.messages, 0);
  assert.equal(state.twitchLive, true);
});

test('formats stream duration', () => {
  const state = new DashboardState();
  state.streamStartedAt = '2026-09-02T10:00:00Z';
  assert.equal(state.duration(Date.parse('2026-09-02T11:02:03Z')), '01:02:03');
});
