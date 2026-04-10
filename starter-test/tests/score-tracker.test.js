import { describe, expect, it, beforeEach } from "vitest";
import { ScoreTracker, syncScoreDisplay } from "../../automation/ui/score-tracker.js";

const START_FRONT = 92; // player start x + width in pixels
const UNIT = 8; // half tile per score point

describe("ScoreTracker scoring policy", () => {
  let tracker;

  beforeEach(() => {
    tracker = new ScoreTracker(UNIT);
    tracker.reset(START_FRONT);
  });

  it("keeps score steady while the player is stationary", () => {
    let gained = 0;
    for (let frame = 0; frame < 180; frame++) {
      gained += tracker.award(START_FRONT);
    }
    expect(gained).toBe(0);
    expect(tracker.getHighWater()).toBe(START_FRONT);
  });

  it("does not award score when only time elapses with micro jitter", () => {
    let gained = 0;
    for (let frame = 0; frame < 240; frame++) {
      const jitter = Math.sin(frame) * 0.49; // never crosses half a unit
      gained += tracker.award(START_FRONT + jitter);
    }
    expect(gained).toBe(0);
    expect(tracker.getHighWater()).toBeGreaterThanOrEqual(START_FRONT);
    expect(tracker.getHighWater()).toBeLessThan(START_FRONT + UNIT);
  });

  it("awards score proportional to forward progress", () => {
    const checkpoints = [START_FRONT + 4, START_FRONT + 8, START_FRONT + 40, START_FRONT + 64];
    let gained = 0;
    for (const position of checkpoints) {
      gained += tracker.award(position);
    }
    const expected = Math.floor(checkpoints.at(-1) / UNIT) - Math.floor(START_FRONT / UNIT);
    expect(gained).toBe(expected);
  });

  it("ignores blocked movement attempts when world position does not change", () => {
    const attemptedCommands = ["right", "right", "left", "right"];
    let gained = 0;
    attemptedCommands.forEach(() => {
      gained += tracker.award(START_FRONT);
    });
    expect(gained).toBe(0);
    expect(tracker.getHighWater()).toBe(START_FRONT);
  });

  it("stops awarding score while backtracking but resumes once surpassing the high-water mark", () => {
    let score = tracker.award(START_FRONT + 40);
    const highWater = tracker.getHighWater();
    expect(score).toBeGreaterThan(0);

    // Move backward: should not change score
    const backwardPositions = [highWater - 8, highWater - 16, START_FRONT + 10];
    backwardPositions.forEach(pos => {
      expect(tracker.award(pos)).toBe(0);
    });
    expect(tracker.getHighWater()).toBe(highWater);

    // Move forward past prior high-water
    score = tracker.award(highWater + 32);
    expect(score).toBe(
      Math.floor((highWater + 32) / UNIT) - Math.floor(highWater / UNIT)
    );
    expect(tracker.getHighWater()).toBeGreaterThan(highWater);
  });
});

describe("HUD score display", () => {
  it("keeps the HUD text in sync with the numeric score", () => {
    const hudSpan = { textContent: "0" };
    syncScoreDisplay(hudSpan, 357);
    expect(hudSpan.textContent).toBe("357");
    syncScoreDisplay(hudSpan, 0);
    expect(hudSpan.textContent).toBe("0");
  });

  it("does nothing safely when the HUD element is missing", () => {
    expect(() => syncScoreDisplay(null, 999)).not.toThrow();
  });
});
