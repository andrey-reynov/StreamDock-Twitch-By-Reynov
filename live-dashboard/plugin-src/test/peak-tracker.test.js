const test = require('node:test');
const assert = require('node:assert/strict');
const { PeakTracker } = require('../src/peak-tracker');

test('peak hold keeps independent maxima for target and reference', () => {
  const tracker = new PeakTracker();
  let levels = tracker.levels('balance', true, ['Mic', 'Game'], {
    Mic: { currentDb: -20, peakDb: -12 }, Game: { currentDb: -30, peakDb: -24 }
  });
  assert.deepEqual(levels.map(level => level.peakDb), [-12, -24]);
  levels = tracker.levels('balance', true, ['Mic', 'Game'], {
    Mic: { currentDb: -28, peakDb: -22 }, Game: { currentDb: -20, peakDb: -18 }
  });
  assert.deepEqual(levels.map(level => level.peakDb), [-12, -18]);
});

test('reset starts a new peak measurement and disabled hold follows live peaks', () => {
  const tracker = new PeakTracker();
  tracker.levels('audio', true, ['Mic'], { Mic: { currentDb: -15, peakDb: -8 } });
  tracker.reset('audio');
  assert.equal(tracker.levels('audio', true, ['Mic'], { Mic: { currentDb: -25, peakDb: -21 } })[0].peakDb, -21);
  assert.equal(tracker.levels('audio', false, ['Mic'], { Mic: { currentDb: -30, peakDb: -27 } })[0].peakDb, -27);
});

test('changing a selected source clears the old held peak', () => {
  const tracker = new PeakTracker();
  tracker.levels('audio', true, ['Mic'], { Mic: { currentDb: -10, peakDb: -5 } });
  assert.equal(tracker.levels('audio', true, ['Discord'], { Discord: { currentDb: -30, peakDb: -25 } })[0].peakDb, -25);
});

test('target and reference peaks can be frozen independently', () => {
  const tracker = new PeakTracker();
  tracker.levels('balance', [true, false], ['Mic', 'Game'], { Mic: { peakDb: -8 }, Game: { peakDb: -18 } });
  const levels = tracker.levels('balance', [true, false], ['Mic', 'Game'], { Mic: { peakDb: -22 }, Game: { peakDb: -12 } });
  assert.deepEqual(levels.map(level => level.peakDb), [-8, -12]);
  tracker.resetAll();
  assert.deepEqual(tracker.levels('balance', [true, true], ['Mic', 'Game'], { Mic: { peakDb: -30 }, Game: { peakDb: -25 } }).map(level => level.peakDb), [-30, -25]);
});
