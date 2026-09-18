/**
 * Pure helpers for the hero 3D scene. No DOM, no Three.js, so every decision
 * and every number the scene uses can be unit-tested. The scene module and the
 * gate script import from here; nothing here imports from them.
 */

/* ---------- gate ---------- */

export interface GateEnv {
  reducedMotion: boolean;
  saveData: boolean;
  /** `window.location.search`, including the leading `?` when present. */
  search: string;
  webgl2: boolean;
}

/** Whether the WebGL scene may load at all. Any objection wins. */
export function shouldMountScene(env: GateEnv): boolean {
  if (env.reducedMotion) return false;
  if (env.saveData) return false;
  if (!env.webgl2) return false;
  if (/(?:^\?|[?&])scene=off(?:&|$)/.test(env.search)) return false;
  return true;
}

/* ---------- motion constants (spec: Interaction) ---------- */

const DEG = Math.PI / 180;

export const MAX_YAW = 12 * DEG;
export const MAX_PITCH = 8 * DEG;
export const SCROLL_PITCH = 10 * DEG;
export const SCROLL_LIFT = 0.3;
export const FLOAT_AMPLITUDE = 0.04;
export const FLOAT_PERIOD = 4;

/* ---------- pointer and scroll mapping ---------- */

export interface Rotation {
  yaw: number;
  pitch: number;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Pointer position inside a rect to a target rotation. The centre is rest. */
export function pointerToTarget(
  x: number,
  y: number,
  rect: { left: number; top: number; width: number; height: number },
): Rotation {
  if (rect.width <= 0 || rect.height <= 0) return { yaw: 0, pitch: 0 };
  const nx = clamp(((x - rect.left) / rect.width) * 2 - 1, -1, 1); // -1 left, 1 right
  const ny = clamp(((y - rect.top) / rect.height) * 2 - 1, -1, 1); // -1 top, 1 bottom
  return { yaw: nx * MAX_YAW, pitch: ny * MAX_PITCH };
}

/**
 * Exponential smoothing toward a target. Frame-rate independent: two steps of
 * dt/2 land exactly where one step of dt does.
 */
export function smooth(current: number, target: number, dt: number, rate = 6): number {
  const k = 1 - Math.exp(-dt * rate);
  return current + (target - current) * k;
}

/**
 * 0 while the hero's top edge is at or below the viewport top, 1 once the hero
 * has scrolled fully out, linear between. `top` is the hero's
 * getBoundingClientRect().top.
 */
export function scrollProgress(top: number, height: number): number {
  if (height <= 0) return 0;
  return clamp(-top / height, 0, 1);
}

/** Idle vertical bob, in scene units, as a function of elapsed seconds. */
export function floatOffset(t: number): number {
  return Math.sin((t / FLOAT_PERIOD) * Math.PI * 2) * FLOAT_AMPLITUDE;
}

/* ---------- screen cycler (spec: Screen content) ---------- */

export const HOLD_SECONDS = 3.5;
export const FADE_SECONDS = 0.8;

export interface CyclerState {
  phase: "hold" | "fade";
  /** Seconds spent in the current phase. */
  elapsed: number;
}

export function createCycler(): CyclerState {
  return { phase: "hold", elapsed: 0 };
}

export interface CyclerStep {
  state: CyclerState;
  /** 0 = current screenshot fully visible, 1 = next fully visible. */
  mix: number;
  /** True on the single step where the fade completed and the scene must promote next to current. */
  advanced: boolean;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Advance the cycler by `dt` seconds. `count` is how many screenshots exist;
 * `nextReady` says whether the next texture has finished loading. The cycler
 * waits in hold until it is, so a slow network stretches the hold instead of
 * fading to a blank screen.
 */
export function stepCycler(
  state: CyclerState,
  dt: number,
  count: number,
  nextReady: boolean,
): CyclerStep {
  if (count <= 1) {
    return { state: { phase: "hold", elapsed: state.elapsed + dt }, mix: 0, advanced: false };
  }
  const elapsed = state.elapsed + dt;

  if (state.phase === "hold") {
    if (elapsed >= HOLD_SECONDS && nextReady) {
      return { state: { phase: "fade", elapsed: 0 }, mix: 0, advanced: false };
    }
    return { state: { phase: "hold", elapsed }, mix: 0, advanced: false };
  }

  const t = clamp(elapsed / FADE_SECONDS, 0, 1);
  if (t >= 1) {
    return { state: { phase: "hold", elapsed: 0 }, mix: 0, advanced: true };
  }
  return { state: { phase: "fade", elapsed }, mix: easeOutCubic(t), advanced: false };
}
