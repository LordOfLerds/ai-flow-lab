export class ScoreTracker {
  constructor(unitSize = 8) {
    const normalized = Math.floor(unitSize);
    this.unitSize = normalized > 0 ? normalized : 1;
    this.highWater = 0;
  }

  reset(initialPosition = 0) {
    this.highWater = Math.max(0, Number.isFinite(initialPosition) ? initialPosition : 0);
  }

  award(currentPosition) {
    const position = Math.max(0, Number.isFinite(currentPosition) ? currentPosition : 0);
    if (position <= this.highWater) {
      // Maintain the furthest observed position even when moving backward.
      if (position > this.highWater) this.highWater = position;
      return 0;
    }

    const previousUnits = Math.floor(this.highWater / this.unitSize);
    const nextUnits = Math.floor(position / this.unitSize);
    this.highWater = position;
    const delta = nextUnits - previousUnits;
    return delta > 0 ? delta : 0;
  }

  getHighWater() {
    return this.highWater;
  }
}

export function syncScoreDisplay(element, score) {
  if (!element) return;
  element.textContent = String(score);
}

if (typeof window !== 'undefined') {
  window.ScoreTracker = ScoreTracker;
  window.syncScoreDisplay = syncScoreDisplay;
}
