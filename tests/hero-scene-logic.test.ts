import { describe, it, expect } from "vitest";
import {
  shouldMountScene,
  pointerToTarget,
  smooth,
  scrollProgress,
  floatOffset,
  clamp,
  createCycler,
  stepCycler,
  MAX_YAW,
  MAX_PITCH,
  FLOAT_AMPLITUDE,
  HOLD_SECONDS,
  FADE_SECONDS,
} from "../src/scripts/hero-scene-logic";

const ok = { reducedMotion: false, saveData: false, search: "", webgl2: true };

describe("shouldMountScene", () => {
  it("mounts when nothing objects", () => {
    expect(shouldMountScene(ok)).toBe(true);
  });
  it("refuses on reduced motion", () => {
    expect(shouldMountScene({ ...ok, reducedMotion: true })).toBe(false);
  });
  it("refuses on data saver", () => {
    expect(shouldMountScene({ ...ok, saveData: true })).toBe(false);
  });
  it("refuses without WebGL2", () => {
    expect(shouldMountScene({ ...ok, webgl2: false })).toBe(false);
  });
  it("refuses when the URL says scene=off, anywhere in the query", () => {
    expect(shouldMountScene({ ...ok, search: "?scene=off" })).toBe(false);
    expect(shouldMountScene({ ...ok, search: "?utm=x&scene=off&y=1" })).toBe(false);
  });
  it("ignores other scene values", () => {
    expect(shouldMountScene({ ...ok, search: "?scene=on" })).toBe(true);
    expect(shouldMountScene({ ...ok, search: "?myscene=off" })).toBe(true);
  });
});

describe("pointerToTarget", () => {
  const rect = { left: 100, top: 50, width: 400, height: 200 };
  it("is at rest in the centre", () => {
    const r = pointerToTarget(300, 150, rect);
    expect(r.yaw).toBeCloseTo(0);
    expect(r.pitch).toBeCloseTo(0);
  });
  it("reaches the yaw limit at the right edge", () => {
    expect(pointerToTarget(500, 150, rect).yaw).toBeCloseTo(MAX_YAW);
  });
  it("reaches negative limits at the top-left corner", () => {
    const r = pointerToTarget(100, 50, rect);
    expect(r.yaw).toBeCloseTo(-MAX_YAW);
    expect(r.pitch).toBeCloseTo(-MAX_PITCH);
  });
  it("clamps pointers outside the rect", () => {
    const r = pointerToTarget(10_000, -10_000, rect);
    expect(r.yaw).toBeCloseTo(MAX_YAW);
    expect(r.pitch).toBeCloseTo(-MAX_PITCH);
  });
  it("rests on a degenerate rect", () => {
    expect(pointerToTarget(5, 5, { left: 0, top: 0, width: 0, height: 0 })).toEqual({ yaw: 0, pitch: 0 });
  });
});

describe("smooth", () => {
  it("moves toward the target and never overshoots", () => {
    const next = smooth(0, 1, 0.016);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(1);
  });
  it("is frame-rate independent: two half steps equal one full step", () => {
    const one = smooth(0, 1, 0.032);
    const two = smooth(smooth(0, 1, 0.016), 1, 0.016);
    expect(two).toBeCloseTo(one, 6);
  });
  it("does nothing for dt = 0", () => {
    expect(smooth(0.3, 1, 0)).toBe(0.3);
  });
  it("settles on the target for a large dt", () => {
    expect(smooth(0, 1, 100)).toBeCloseTo(1, 6);
  });
});

describe("scrollProgress", () => {
  it("is 0 while the hero top is at or below the viewport top", () => {
    expect(scrollProgress(0, 800)).toBe(0);
    expect(scrollProgress(120, 800)).toBe(0);
  });
  it("is 1 once the hero has scrolled fully out", () => {
    expect(scrollProgress(-800, 800)).toBe(1);
    expect(scrollProgress(-5000, 800)).toBe(1);
  });
  it("is linear in between", () => {
    expect(scrollProgress(-400, 800)).toBeCloseTo(0.5);
  });
  it("is 0 for a zero-height hero", () => {
    expect(scrollProgress(-10, 0)).toBe(0);
  });
});

describe("floatOffset", () => {
  it("starts at 0 and stays within the amplitude", () => {
    expect(floatOffset(0)).toBeCloseTo(0);
    expect(Math.abs(floatOffset(1))).toBeLessThanOrEqual(FLOAT_AMPLITUDE + 1e-9);
    expect(floatOffset(1)).toBeCloseTo(FLOAT_AMPLITUDE);
  });
});

describe("clamp", () => {
  it("clamps both ends", () => {
    expect(clamp(-1, 0, 1)).toBe(0);
    expect(clamp(2, 0, 1)).toBe(1);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });
});

describe("stepCycler", () => {
  it("holds with mix 0 for the hold duration", () => {
    let s = createCycler();
    let step = stepCycler(s, HOLD_SECONDS - 0.1, 10, true);
    expect(step.state.phase).toBe("hold");
    expect(step.mix).toBe(0);
    expect(step.advanced).toBe(false);
  });
  it("does not leave hold until the next texture is ready", () => {
    let step = stepCycler(createCycler(), HOLD_SECONDS + 5, 10, false);
    expect(step.state.phase).toBe("hold");
    step = stepCycler(step.state, 0.01, 10, true);
    expect(step.state.phase).toBe("fade");
    expect(step.state.elapsed).toBe(0);
  });
  it("fades with an increasing eased mix", () => {
    let step = stepCycler(createCycler(), HOLD_SECONDS, 10, true);
    const a = stepCycler(step.state, FADE_SECONDS * 0.25, 10, true);
    const b = stepCycler(a.state, FADE_SECONDS * 0.25, 10, true);
    expect(a.mix).toBeGreaterThan(0);
    expect(b.mix).toBeGreaterThan(a.mix);
    expect(b.mix).toBeLessThan(1);
    expect(a.advanced).toBe(false);
  });
  it("reports advanced exactly once at the end of the fade and returns to hold", () => {
    let step = stepCycler(createCycler(), HOLD_SECONDS, 10, true);
    step = stepCycler(step.state, FADE_SECONDS, 10, true);
    expect(step.advanced).toBe(true);
    expect(step.mix).toBe(0);
    expect(step.state.phase).toBe("hold");
    expect(step.state.elapsed).toBe(0);
    const after = stepCycler(step.state, 0.016, 10, true);
    expect(after.advanced).toBe(false);
  });
  it("never advances with a single screen", () => {
    const step = stepCycler(createCycler(), 100, 1, true);
    expect(step.advanced).toBe(false);
    expect(step.mix).toBe(0);
    expect(step.state.phase).toBe("hold");
  });
});
