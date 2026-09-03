class PeakTracker {
  constructor() { this.contexts = new Map(); }

  levels(context, hold, names, audioLevels) {
    const live = names.map(name => audioLevels[name] || { currentDb: -60, peakDb: -60 });
    const holds = Array.isArray(hold) ? hold.map(Boolean) : names.map(() => Boolean(hold));
    if (!holds.some(Boolean)) { this.contexts.delete(context); return live; }
    const signature = names.join('\u0000');
    let state = this.contexts.get(context);
    if (!state || state.signature !== signature) state = { signature, peaks: names.map(() => -60) };
    state.peaks = state.peaks.map((peak, index) => holds[index] ? Math.max(peak, Number(live[index].peakDb) || -60) : (Number(live[index].peakDb) || -60));
    this.contexts.set(context, state);
    return live.map((level, index) => ({ ...level, peakDb: state.peaks[index] }));
  }

  reset(context) { this.contexts.delete(context); }
  resetAll() { this.contexts.clear(); }
}

module.exports = { PeakTracker };
