# Hero 3D Scene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static laptop PNG in the home-page hero with a lazily loaded Three.js laptop whose screen cycles the ten portfolio screenshots, follows the cursor, and tilts with scroll, while every visitor who cannot or should not run WebGL keeps the current image unchanged.

**Architecture:** Three files. A DOM-free logic module holds every decision and every number (gating, pointer and scroll mapping, smoothing, the screen cycler) and is unit-tested with vitest. A scene module owns Three.js and exports one `mount` function. An Astro component renders the poster, the canvas box and a tiny gate script that dynamically imports the scene module only after first paint and only when the environment allows it.

**Tech Stack:** Astro 5.13 (Vite 6), TypeScript strict, Three.js 0.186 (`three/addons/*` for RoundedBoxGeometry and RoomEnvironment), vitest 3 for the logic tests. No React in the hero.

**Spec:** `docs/superpowers/specs/2026-09-18-hero-3d-scene-design.md`

## Global Constraints

- One new runtime dependency only: `three` at `0.186.x`. Dev-only additions: `vitest@^3`, `@types/three`.
- `three` is imported from exactly one file, `src/scripts/hero-scene.ts`, and that file is loaded only through a dynamic `import()` at runtime.
- No `@react-three/fiber`, no `drei`, no GSAP, no React in the hero.
- The poster `<img>` (the current `src/assets/hero.png` through `astro:assets`) stays in the HTML with its current alt text, widths and sizes.
- The scene never loads when any of these hold: `prefers-reduced-motion: reduce`, `navigator.connection.saveData === true`, URL query contains `scene=off`, no WebGL2 context.
- Screenshot order comes from `portfolioProjects` in `src/data/portfolio.ts`; nothing hardcodes a path.
- Rotation limits: yaw ±12°, pitch ±8°. Scroll adds up to 10° backward pitch and 0.3 units lift. Idle float amplitude 0.04 units, period 4 s. Hold 3.5 s, crossfade 0.8 s ease-out.
- Pixel ratio cap: 2 on fine-pointer devices, 1.5 otherwise. No shadow maps. At most two screenshot textures on the GPU, 1024 px wide.
- Render loop pauses when the hero is off screen or the document is hidden.
- While the scene is live, `#home` carries class `is-live` and `.hero-particle` elements are hidden.
- Every commit message ends with the two attribution trailer lines used in this repo (see Task 1 Step 8).
- Windows Git Bash: run `npm` and `git` commands from the project root `C:/Users/Sherwyn joel/OneDrive/Desktop/ArkTech/TheArkTech_website`. Prefer the Edit/Write tools for multi-line file changes; `sed` with line numbers has already bitten this repo once.

---

## File structure

| File | Responsibility |
|---|---|
| `src/scripts/hero-scene-logic.ts` (new) | Pure functions and constants: gate decision, pointer to rotation, exponential smoothing, scroll progress, idle float, screen cycler state machine. No DOM, no Three.js. |
| `tests/hero-scene-logic.test.ts` (new) | vitest tests for every function above. |
| `src/scripts/hero-scene.ts` (new) | Three.js scene: laptop geometry and materials, lights, screen crossfade shader, screenshot loading, frame loop with pause/resume, resize, context-loss handling, teardown. Exports `mount`. Only importer of `three`. |
| `src/components/HeroScene.astro` (new) | Poster image, canvas box, `data-screens` attribute, scoped styles for the poster/canvas crossfade, and the gate script that decides whether and when to `import()` the scene. |
| `src/components/Hero.astro` (modify) | Right column renders `<HeroScene />`; poster styles move out; new rule hides particles while live. |
| `package.json` / `package-lock.json` (modify) | `three` dependency; `vitest`, `@types/three` dev dependencies; `test` script. |
| `docs/superpowers/specs/2026-09-18-hero-3d-scene-design.md` (modify, Task 2) | Two interface lines updated to match the code (`mount` returns a Promise; `onContextLost` option). |

---

### Task 1: Test tooling and the pure logic module

**Files:**
- Modify: `package.json` (scripts, devDependencies)
- Create: `src/scripts/hero-scene-logic.ts`
- Create: `tests/hero-scene-logic.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (used by Tasks 2 and 3), all exported from `src/scripts/hero-scene-logic.ts`:
  - `interface GateEnv { reducedMotion: boolean; saveData: boolean; search: string; webgl2: boolean }`
  - `shouldMountScene(env: GateEnv): boolean`
  - `interface Rotation { yaw: number; pitch: number }`
  - `pointerToTarget(x: number, y: number, rect: { left: number; top: number; width: number; height: number }): Rotation`
  - `smooth(current: number, target: number, dt: number, rate?: number): number`
  - `scrollProgress(top: number, height: number): number`
  - `floatOffset(t: number): number`
  - `clamp(v: number, lo: number, hi: number): number`
  - `interface CyclerState { phase: "hold" | "fade"; elapsed: number }`
  - `createCycler(): CyclerState`
  - `interface CyclerStep { state: CyclerState; mix: number; advanced: boolean }`
  - `stepCycler(state: CyclerState, dt: number, count: number, nextReady: boolean): CyclerStep`
  - Constants: `MAX_YAW`, `MAX_PITCH`, `SCROLL_PITCH`, `SCROLL_LIFT`, `FLOAT_AMPLITUDE`, `FLOAT_PERIOD`, `HOLD_SECONDS`, `FADE_SECONDS`

- [ ] **Step 1: Install the test runner and Three.js types**

Run from the project root:

```bash
npm install --save-dev vitest@^3 @types/three
```

Expected: `package.json` gains both under `devDependencies`; no peer-dependency errors (vitest 3 accepts the Vite 6 that Astro 5.13 already installs).

- [ ] **Step 2: Add the test script**

In `package.json`, inside `"scripts"`, add:

```json
"test": "vitest run"
```

so the block reads:

```json
"scripts": {
  "dev": "astro dev",
  "build": "astro build",
  "preview": "astro preview",
  "deploy": "node deploy.mjs",
  "test": "vitest run"
}
```

- [ ] **Step 3: Write the failing tests**

Create `tests/hero-scene-logic.test.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `npm test`

Expected: FAIL. vitest reports it cannot resolve `../src/scripts/hero-scene-logic` (module not found). If instead it reports "no test files found", check the file is at `tests/hero-scene-logic.test.ts` under the project root.

- [ ] **Step 5: Write the logic module**

Create `src/scripts/hero-scene-logic.ts`:

```ts
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
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test`

Expected: PASS, 1 file, 26 tests, 0 failed.

- [ ] **Step 7: Confirm the site build is untouched**

Run: `npm run build`

Expected: exit code 0, "34 page(s) built". The new module is not imported by any page yet, so nothing in `dist/` changes.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/scripts/hero-scene-logic.ts tests/hero-scene-logic.test.ts
git commit -m "Add hero scene logic module with vitest coverage" -m "Gate decision, pointer and scroll mapping, exponential smoothing, idle float and the screenshot cycler, all DOM-free and tested. First test tooling in the repo." -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013oFQtjsfz1KG4oEukJ4N67"
```

---

### Task 2: The Three.js scene module

**Files:**
- Modify: `package.json` (add `three`)
- Create: `src/scripts/hero-scene.ts`
- Modify: `docs/superpowers/specs/2026-09-18-hero-3d-scene-design.md` (two lines under "Files and interfaces")

**Interfaces:**
- Consumes from Task 1: `pointerToTarget`, `smooth`, `scrollProgress`, `floatOffset`, `clamp`, `createCycler`, `stepCycler`, `SCROLL_PITCH`, `SCROLL_LIFT`, `CyclerState`.
- Produces (used by Task 3):
  - `interface MountOptions { screens: string[]; hero: HTMLElement; finePointer: boolean; onContextLost?: () => void }`
  - `mount(container: HTMLElement, opts: MountOptions): Promise<() => void>`. Resolves after the first frame has been rendered with the first available screenshot (or a dark screen if none loads). The resolved function tears everything down. Rejects if the renderer or scene cannot be created.

There is no automated test for this file: it needs a GPU. Its verification is the production build (Vite compiles it as its own chunk) plus the browser checklist in Task 4.

- [ ] **Step 1: Install Three.js**

Run: `npm install three@0.186.0`

Expected: `"three": "^0.186.0"` under `dependencies` in `package.json`.

- [ ] **Step 2: Write the scene module**

Create `src/scripts/hero-scene.ts`:

```ts
/**
 * The hero laptop scene. This is the only file in the project that imports
 * Three.js, and it is only ever loaded through a dynamic import() from
 * HeroScene.astro, after first paint and after the gate has said yes.
 *
 * Everything decision-shaped lives in hero-scene-logic.ts and is tested there.
 * This file is glue: geometry, materials, lights, textures, the frame loop,
 * and teardown.
 */
import {
  CanvasTexture,
  Clock,
  Color,
  DirectionalLight,
  Group,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {
  clamp,
  createCycler,
  floatOffset,
  pointerToTarget,
  scrollProgress,
  smooth,
  stepCycler,
  SCROLL_LIFT,
  SCROLL_PITCH,
  type CyclerState,
  type Rotation,
} from "./hero-scene-logic";

export interface MountOptions {
  /** Screenshot URLs in display order. */
  screens: string[];
  /** The `#home` section: pointer and scroll are measured against it. */
  hero: HTMLElement;
  /** True on mouse/trackpad devices; enables cursor follow and the higher pixel-ratio cap. */
  finePointer: boolean;
  /** Called after the scene has torn itself down because the GPU context was lost. */
  onContextLost?: () => void;
}

/* ---------- spec numbers (Scene section) ---------- */
const DEG = Math.PI / 180;
const BASE = { w: 3.0, h: 0.12, d: 2.0, r: 0.06 };
const LID = { w: 3.0, h: 1.95, t: 0.08, r: 0.06 };
const SCREEN = { w: 2.8, h: 1.75 };
const LID_OPEN_DEG = 105;
const BODY_COLOR = "#0f1420";
const RIM_COLOR = "#60a5fa"; // --brand-bright
const GLOW_COLOR = "59, 130, 246"; // --brand, as rgb() components
const TEXTURE_WIDTH = 1024;
const CAMERA_FOV = 32;
const CAMERA_DISTANCE = 6.2;

/* ---------- small canvas helpers ---------- */

function radialCanvas(size: number, inner: string, outer: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return c;
}

/** Decode an image and downscale it to TEXTURE_WIDTH on a canvas. Works in every browser that has WebGL2. */
async function loadScreenTexture(url: string, signal: AbortSignal): Promise<CanvasTexture> {
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  await img.decode(); // throws on 404 or a broken file
  if (signal.aborted) throw new DOMException("aborted", "AbortError");
  const scale = Math.min(1, TEXTURE_WIDTH / img.naturalWidth);
  const c = document.createElement("canvas");
  c.width = Math.round(img.naturalWidth * scale);
  c.height = Math.round(img.naturalHeight * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  return tex;
}

/* ---------- the scene ---------- */

export async function mount(container: HTMLElement, opts: MountOptions): Promise<() => void> {
  const canvas = container.querySelector("canvas");
  if (!canvas) throw new Error("hero-scene: no canvas in container");
  const { hero, screens } = opts;

  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.finePointer ? 2 : 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.environment = envTexture;

  const camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.1, 50);

  // rig: rotation, float and scroll drift. laptop: the fixed model.
  const rig = new Group();
  const laptop = new Group();
  rig.add(laptop);
  scene.add(rig);

  // Materials and geometries are collected for teardown.
  const disposables: { dispose(): void }[] = [envTexture];
  const track = <T extends { dispose(): void }>(x: T): T => {
    disposables.push(x);
    return x;
  };

  const bodyMat = track(new MeshStandardMaterial({ color: new Color(BODY_COLOR), metalness: 0.6, roughness: 0.45 }));
  const wellMat = track(new MeshStandardMaterial({ color: new Color("#0a0e18"), metalness: 0.3, roughness: 0.8 }));
  const padMat = track(new MeshStandardMaterial({ color: new Color("#131a2a"), metalness: 0.4, roughness: 0.6 }));
  const bezelMat = track(new MeshStandardMaterial({ color: new Color("#05070d"), metalness: 0.2, roughness: 0.3 }));

  // base
  const base = new Mesh(track(new RoundedBoxGeometry(BASE.w, BASE.h, BASE.d, 4, BASE.r)), bodyMat);
  base.position.y = BASE.h / 2;
  laptop.add(base);

  const well = new Mesh(track(new PlaneGeometry(2.6, 1.1)), wellMat);
  well.rotation.x = -90 * DEG;
  well.position.set(0, BASE.h + 0.001, -0.25);
  laptop.add(well);

  const pad = new Mesh(track(new PlaneGeometry(0.9, 0.6)), padMat);
  pad.rotation.x = -90 * DEG;
  pad.position.set(0, BASE.h + 0.002, 0.55);
  laptop.add(pad);

  // lid, hinged at the back edge of the base, tilted back from vertical
  const hinge = new Group();
  hinge.position.set(0, BASE.h, -BASE.d / 2);
  hinge.rotation.x = -(LID_OPEN_DEG - 90) * DEG;
  laptop.add(hinge);

  const lid = new Mesh(track(new RoundedBoxGeometry(LID.w, LID.h, LID.t, 4, LID.r)), bodyMat);
  lid.position.y = LID.h / 2;
  hinge.add(lid);

  const bezel = new Mesh(track(new PlaneGeometry(LID.w - 0.1, LID.h - 0.1)), bezelMat);
  bezel.position.set(0, LID.h / 2, LID.t / 2 + 0.001);
  hinge.add(bezel);

  // screen: unlit crossfade between two screenshots
  const screenMat = track(
    new ShaderMaterial({
      uniforms: {
        uA: { value: null as Texture | null },
        uB: { value: null as Texture | null },
        uHasA: { value: 0 },
        uHasB: { value: 0 },
        uMix: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uA;
        uniform sampler2D uB;
        uniform float uHasA;
        uniform float uHasB;
        uniform float uMix;
        varying vec2 vUv;
        void main() {
          vec3 dark = vec3(0.02, 0.03, 0.06);
          vec3 a = mix(dark, texture2D(uA, vUv).rgb, uHasA);
          vec3 b = mix(dark, texture2D(uB, vUv).rgb, uHasB);
          gl_FragColor = vec4(mix(a, b, uMix), 1.0);
          #include <colorspace_fragment>
        }
      `,
    }),
  );
  const screen = new Mesh(track(new PlaneGeometry(SCREEN.w, SCREEN.h)), screenMat);
  screen.position.set(0, LID.h / 2, LID.t / 2 + 0.002);
  hinge.add(screen);

  // grounding: brand glow under the device, then a painted contact shadow on top of it
  const glowTex = track(new CanvasTexture(radialCanvas(256, `rgba(${GLOW_COLOR}, 0.35)`, `rgba(${GLOW_COLOR}, 0)`)));
  const glow = new Mesh(
    track(new PlaneGeometry(6, 4)),
    track(new MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false })),
  );
  glow.rotation.x = -90 * DEG;
  glow.position.set(0, -0.02, -0.4);
  glow.renderOrder = -2;
  laptop.add(glow);

  const shadowTex = track(new CanvasTexture(radialCanvas(256, "rgba(0,0,0,0.55)", "rgba(0,0,0,0)")));
  const shadow = new Mesh(
    track(new PlaneGeometry(4.2, 3.0)),
    track(new MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })),
  );
  shadow.rotation.x = -90 * DEG;
  shadow.position.set(0, -0.01, 0);
  shadow.renderOrder = -1;
  laptop.add(shadow);

  // lights: key from top-right, cool rim from behind-left; ambient comes from the environment map
  const key = new DirectionalLight(0xffffff, 1.2);
  key.position.set(3, 5, 4);
  scene.add(key);
  const rim = new DirectionalLight(new Color(RIM_COLOR), 0.8);
  rim.position.set(-3, 3, -4);
  scene.add(rim);

  /* ---------- sizing ---------- */

  function fit() {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h, false);
    const aspect = w / h;
    camera.aspect = aspect;
    // narrow boxes pull the camera back so the whole laptop stays in frame
    const distance = CAMERA_DISTANCE * clamp(1.25 / aspect, 1, 1.6);
    camera.position.set(-1.6, 2.2, distance);
    camera.lookAt(0, 0.7, 0);
    camera.updateProjectionMatrix();
  }
  fit();

  let resizeQueued = false;
  const ro = new ResizeObserver(() => {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => {
      resizeQueued = false;
      fit();
      if (!running) renderer.render(scene, camera);
    });
  });
  ro.observe(container);

  /* ---------- screenshots ---------- */

  const aborter = new AbortController();
  let currentIndex = -1; // index of the screenshot in uA
  let nextIndex = -1; // index loaded into uB, or -1 while loading/none
  let nextTex: CanvasTexture | null = null;
  let currentTex: CanvasTexture | null = null;
  let loading = false;

  /** Load the first screenshot after `from` that decodes; skip broken ones. */
  async function loadFollowing(from: number): Promise<{ index: number; tex: CanvasTexture } | null> {
    const n = screens.length;
    for (let k = 1; k <= n; k++) {
      const i = (from + k) % n;
      try {
        const tex = await loadScreenTexture(screens[i], aborter.signal);
        return { index: i, tex };
      } catch (err) {
        if ((err as DOMException).name === "AbortError") return null;
        console.warn("hero-scene: screenshot failed", screens[i]);
      }
    }
    return null;
  }

  function requestNext() {
    if (loading || screens.length < 2) return;
    loading = true;
    loadFollowing(currentIndex).then((res) => {
      loading = false;
      if (!res || aborter.signal.aborted) return;
      nextIndex = res.index;
      nextTex = res.tex;
      renderer.initTexture(nextTex); // upload now, off the fade's critical path
      screenMat.uniforms.uB.value = nextTex;
      screenMat.uniforms.uHasB.value = 1;
    });
  }

  /** The fade finished: what was next is now current. */
  function promoteNext() {
    if (currentTex) currentTex.dispose();
    currentTex = nextTex;
    currentIndex = nextIndex;
    nextTex = null;
    nextIndex = -1;
    screenMat.uniforms.uA.value = currentTex;
    screenMat.uniforms.uHasA.value = currentTex ? 1 : 0;
    screenMat.uniforms.uB.value = null;
    screenMat.uniforms.uHasB.value = 0;
    screenMat.uniforms.uMix.value = 0;
    requestNext();
  }

  // First screenshot: try each in order until one decodes. The scene still
  // starts (dark screen) if none does.
  const first = screens.length ? await loadFollowing(-1) : null;
  if (aborter.signal.aborted) throw new DOMException("aborted", "AbortError");
  if (first) {
    currentTex = first.tex;
    currentIndex = first.index;
    screenMat.uniforms.uA.value = currentTex;
    screenMat.uniforms.uHasA.value = 1;
  }

  /* ---------- motion state ---------- */

  const clock = new Clock(false);
  let cycler: CyclerState = createCycler();
  const target: Rotation = { yaw: 0, pitch: 0 };
  const current: Rotation = { yaw: 0, pitch: 0 };
  let scrollTarget = 0;
  let scrollNow = 0;

  function readScroll() {
    const r = hero.getBoundingClientRect();
    scrollTarget = scrollProgress(r.top, r.height);
  }
  readScroll();

  const onScroll = () => readScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const onPointerMove = (e: PointerEvent) => {
    const t = pointerToTarget(e.clientX, e.clientY, hero.getBoundingClientRect());
    target.yaw = t.yaw;
    target.pitch = t.pitch;
  };
  const onPointerLeave = () => {
    target.yaw = 0;
    target.pitch = 0;
  };
  if (opts.finePointer) {
    hero.addEventListener("pointermove", onPointerMove, { passive: true });
    hero.addEventListener("pointerleave", onPointerLeave);
  }

  /* ---------- frame loop with pause/resume ---------- */

  let running = false;
  let raf = 0;
  let heroVisible = true;
  let elapsed = 0; // our own accumulator: Clock.start() zeroes elapsedTime on every resume

  function frame() {
    raf = 0;
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;
    const t = elapsed;

    current.yaw = smooth(current.yaw, target.yaw, dt);
    current.pitch = smooth(current.pitch, target.pitch, dt);
    scrollNow = smooth(scrollNow, scrollTarget, dt, 8);

    rig.rotation.y = current.yaw;
    rig.rotation.x = current.pitch - scrollNow * SCROLL_PITCH;
    rig.position.y = floatOffset(t) + scrollNow * SCROLL_LIFT;

    const step = stepCycler(cycler, dt, screens.length, nextTex !== null);
    cycler = step.state;
    screenMat.uniforms.uMix.value = step.mix;
    if (step.advanced) promoteNext();

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  function setRunning(on: boolean) {
    if (on === running) return;
    running = on;
    if (on) {
      clock.start();
      clock.getDelta(); // swallow the pause so the first dt after resume is small
      if (!raf) raf = requestAnimationFrame(frame);
    } else {
      clock.stop();
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  const io = new IntersectionObserver(
    (entries) => {
      heroVisible = entries.some((e) => e.isIntersecting);
      setRunning(heroVisible && !document.hidden);
    },
    { threshold: 0 },
  );
  io.observe(hero);

  const onVisibility = () => setRunning(heroVisible && !document.hidden);
  document.addEventListener("visibilitychange", onVisibility);

  /* ---------- teardown and context loss ---------- */

  let tornDown = false;
  function teardown() {
    if (tornDown) return;
    tornDown = true;
    setRunning(false);
    aborter.abort();
    io.disconnect();
    ro.disconnect();
    window.removeEventListener("scroll", onScroll);
    document.removeEventListener("visibilitychange", onVisibility);
    hero.removeEventListener("pointermove", onPointerMove);
    hero.removeEventListener("pointerleave", onPointerLeave);
    canvas.removeEventListener("webglcontextlost", onLost);
    currentTex?.dispose();
    nextTex?.dispose();
    for (const d of disposables) d.dispose();
    scene.environment = null;
    renderer.dispose();
  }

  const onLost = (e: Event) => {
    e.preventDefault();
    teardown();
    opts.onContextLost?.();
  };
  canvas.addEventListener("webglcontextlost", onLost);

  // First frame now, so the gate can reveal a finished picture, then start the loop
  // and the preload of the second screenshot.
  renderer.render(scene, camera);
  setRunning(!document.hidden);
  requestNext();

  return teardown;
}
```

- [ ] **Step 3: Build to prove the module compiles into its own chunk**

Nothing imports the module yet, so force a one-off compile check without touching a page:

Run:

```bash
node -e "import('vite').then(async ({build}) => { await build({ logLevel: 'error', build: { write: false, lib: { entry: 'src/scripts/hero-scene.ts', formats: ['es'], fileName: 'hero-scene' }, rollupOptions: { external: [] } } }); console.log('hero-scene compiles'); })"
```

Expected: prints `hero-scene compiles` and exit code 0. A TypeScript syntax error or a bad `three/addons` path fails here with the file and line.

- [ ] **Step 4: Sync the spec's interface lines**

In `docs/superpowers/specs/2026-09-18-hero-3d-scene-design.md`, under "Files and interfaces", replace:

```
- `src/scripts/hero-scene.ts` (new). Exports `mount(container: HTMLElement, opts: { screens: string[]; hero: HTMLElement; finePointer: boolean }): () => void`. The return value tears everything down (cancels the frame loop, disconnects observers, disposes geometry, materials, textures and the renderer). Nothing else is exported.
```

with:

```
- `src/scripts/hero-scene.ts` (new). Exports `mount(container: HTMLElement, opts: { screens: string[]; hero: HTMLElement; finePointer: boolean; onContextLost?: () => void }): Promise<() => void>`. The promise resolves once the first frame has rendered with the first screenshot that decoded (or a dark screen if none did), so the gate reveals a finished picture. The resolved function tears everything down (cancels the frame loop, disconnects observers, disposes geometry, materials, textures and the renderer). `onContextLost` is called after the scene has torn itself down on GPU context loss. Nothing else is exported.
```

Also replace the spec's texture-pipeline bullet under "Screen content":

```
- Texture pipeline: each image is fetched, decoded with `createImageBitmap` at `resizeWidth: 1024`, uploaded with `SRGBColorSpace`, `generateMipmaps: false`, linear filtering. Only the current and next textures are kept; the previous one is disposed after each crossfade completes. The next image is requested as soon as a crossfade finishes, so it is ready before it is needed.
```

with:

```
- Texture pipeline: each image is decoded through an `Image` element (`decode()`), drawn onto a canvas downscaled to 1024 px wide, and uploaded as a `CanvasTexture` with `SRGBColorSpace`, `generateMipmaps: false`, linear filtering. (Chosen over `createImageBitmap` because its orientation and resize options are inconsistent across Safari versions.) Only the current and next textures are kept; the previous one is disposed after each crossfade completes. The next image is requested as soon as a crossfade finishes, so it is ready before it is needed.
```

- [ ] **Step 5: Run the logic tests again**

Run: `npm test`

Expected: PASS, 26 tests. (The scene module is not under test; this confirms the install did not disturb the runner.)

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/scripts/hero-scene.ts docs/superpowers/specs/2026-09-18-hero-3d-scene-design.md
git commit -m "Add the Three.js hero laptop scene module" -m "Primitive-built laptop with a crossfading unlit screen, brand rim light and room environment, screenshot loading that skips broken images, a frame loop that pauses off screen, resize, context-loss handling and full teardown. Not wired into any page yet." -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013oFQtjsfz1KG4oEukJ4N67"
```

---

### Task 3: The HeroScene component, the gate, and wiring into the hero

**Files:**
- Create: `src/components/HeroScene.astro`
- Modify: `src/components/Hero.astro` (frontmatter lines 1-3, markup lines 87-99, styles lines 236-268)

**Interfaces:**
- Consumes from Task 1: `shouldMountScene`, `GateEnv`. From Task 2: `mount`, `MountOptions` (via dynamic import).
- Produces: `<HeroScene />`, no props. Sets class `is-live` on `#home` when the scene is showing.

- [ ] **Step 1: Create the component**

Create `src/components/HeroScene.astro`:

```astro
---
/**
 * The hero's right column: the poster image everyone gets, and the WebGL
 * laptop that replaces it for visitors whose browser and preferences allow.
 * The Three.js module is imported only from the gate script below, and only
 * dynamically, so it never blocks first paint.
 */
import { Image } from "astro:assets";
import heroArt from "../assets/hero.png";
import { portfolioProjects } from "../data/portfolio";

// Screen order is the portfolio order; nothing here names a file.
const screens = portfolioProjects.map((p) => p.image);
---

<div
  class="hero-figure"
  data-hero-scene
  data-screens={JSON.stringify(screens)}
  style={`--hero-aspect: ${heroArt.width} / ${heroArt.height}`}
>
  <Image
    src={heroArt}
    alt="3D render of a laptop with glowing blue connections linking floating dashboard and app screens TheArkTech builds"
    class="hero-art"
    widths={[480, 760, 1100, 1536]}
    sizes="(min-width: 1024px) 34rem, 90vw"
    loading="eager"
  />
  <div class="hero-scene" hidden>
    <canvas aria-hidden="true"></canvas>
  </div>
</div>

<style>
  /* One fixed-aspect box holds both the poster and the canvas, so swapping
     them never moves anything. The aspect is the poster's own. */
  .hero-figure {
    position: relative;
    width: 100%;
    max-width: 34rem;
    margin-inline: auto;
    aspect-ratio: var(--hero-aspect);
  }
  .hero-art,
  .hero-scene {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .hero-art {
    z-index: 1;
    object-fit: contain;
    filter: drop-shadow(0 28px 55px rgba(0, 0, 0, 0.55));
    animation: hero-art-float 8s ease-in-out infinite alternate;
    transition: opacity 0.5s var(--ease-out-quart);
  }
  @keyframes hero-art-float {
    from { transform: translateY(-8px); }
    to   { transform: translateY(10px); }
  }
  .hero-scene {
    z-index: 2;
    opacity: 0;
    transition: opacity 0.5s var(--ease-out-quart);
  }
  .hero-scene canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
  /* `is-live` is set on #home, which lives in Hero.astro, hence :global. */
  :global(#home.is-live) .hero-scene { opacity: 1; }
  :global(#home.is-live) .hero-art { opacity: 0; animation: none; }

  @media (prefers-reduced-motion: reduce) {
    .hero-art { animation: none; }
  }
</style>

<script>
  import { shouldMountScene } from "../scripts/hero-scene-logic";

  const figure = document.querySelector<HTMLElement>("[data-hero-scene]");
  const hero = document.getElementById("home");

  async function boot() {
    if (!figure || !hero) return;
    const box = figure.querySelector<HTMLElement>(".hero-scene");
    const poster = figure.querySelector<HTMLImageElement>(".hero-art");
    if (!box || !poster) return;

    // 1. Is WebGL wanted here at all?
    let allowed = false;
    try {
      const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
      allowed = shouldMountScene({
        reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
        saveData: nav.connection?.saveData === true,
        search: location.search,
        webgl2: !!document.createElement("canvas").getContext("webgl2"),
      });
    } catch {
      allowed = false;
    }
    if (!allowed) return;

    // 2. Wait for the page to finish, then for an idle moment.
    await new Promise<void>((resolve) => {
      if (document.readyState === "complete") resolve();
      else window.addEventListener("load", () => resolve(), { once: true });
    });
    await new Promise<void>((resolve) => {
      if ("requestIdleCallback" in window) {
        (window as Window & { requestIdleCallback: (cb: () => void, o?: { timeout: number }) => number })
          .requestIdleCallback(() => resolve(), { timeout: 1500 });
      } else {
        setTimeout(resolve, 200);
      }
    });

    // 3. Still worth it? Not if the visitor has already scrolled past the hero.
    if (hero.getBoundingClientRect().bottom <= 0) return;

    // 4. Load the scene, render its first frame, then reveal it.
    try {
      const { mount } = await import("../scripts/hero-scene");
      const screens: string[] = JSON.parse(figure.dataset.screens ?? "[]");
      const restorePoster = () => {
        hero.classList.remove("is-live");
        box.hidden = true;
        poster.hidden = false;
      };
      await mount(box, {
        screens,
        hero,
        finePointer: matchMedia("(pointer: fine)").matches,
        onContextLost: restorePoster,
      });
      box.hidden = false;
      // next frame, so the opacity transition actually runs
      requestAnimationFrame(() => hero.classList.add("is-live"));
      // once the crossfade is over the poster is dead weight for the compositor
      setTimeout(() => {
        if (hero.classList.contains("is-live")) poster.hidden = true;
      }, 600);
    } catch (err) {
      console.warn("hero-scene: leaving the poster in place", err);
    }
  }

  boot();
</script>
```

- [ ] **Step 2: Wire it into Hero.astro, frontmatter**

In `src/components/Hero.astro`, replace lines 1-3:

```astro
---
import { Image } from "astro:assets";
import heroArt from "../assets/hero.png";
```

with:

```astro
---
import HeroScene from "./HeroScene.astro";
```

- [ ] **Step 3: Wire it into Hero.astro, markup**

Replace the right column (the block from `<!-- ── RIGHT: product illustration ── -->` through the closing `</div>` of `hero-visual`, lines 87-99 before this change):

```astro
    <!-- ── RIGHT: product illustration ── -->
    <div class="lg:col-span-5 relative hero-visual">
      <div class="hero-figure">
        <Image
          src={heroArt}
          alt="3D render of a laptop with glowing blue connections linking floating dashboard and app screens TheArkTech builds"
          class="hero-art"
          widths={[480, 760, 1100, 1536]}
          sizes="(min-width: 1024px) 34rem, 90vw"
          loading="eager"
        />
      </div>
    </div>
```

with:

```astro
    <!-- ── RIGHT: the laptop — poster for everyone, WebGL scene where allowed ── -->
    <div class="lg:col-span-5 relative hero-visual">
      <HeroScene />
    </div>
```

- [ ] **Step 4: Wire it into Hero.astro, styles**

In the `<style>` block of `src/components/Hero.astro`, delete the `.hero-figure`, `.hero-art` and `@keyframes hero-art-float` rules (they now live in HeroScene.astro). Concretely remove:

```css
  .hero-figure {
    position: relative;
    display: grid;
    place-items: center;
    padding: 1rem 0;
  }
  .hero-art {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 34rem;
    height: auto;
    filter: drop-shadow(0 28px 55px rgba(0,0,0,0.55));
    animation: hero-art-float 8s ease-in-out infinite alternate;
  }
  @keyframes hero-art-float {
    from { transform: translateY(-8px); }
    to   { transform: translateY(10px); }
  }
```

Keep `.hero-visual { position: relative; }` and directly after it add:

```css
  /* Two motion systems in one viewport compete; the scene wins while it is live. */
  #home.is-live .hero-particle { display: none; }
```

In the `@media (prefers-reduced-motion: reduce)` block, delete the line `.hero-art { animation: none; }` (moved to HeroScene.astro). The other lines in that block stay.

- [ ] **Step 5: Build**

Run: `npm run build`

Expected: exit code 0, "34 page(s) built". Any Astro error names the file and line.

- [ ] **Step 6: Verify the built output matches the spec's loading rules**

Run each check from the project root.

Poster still in the HTML:

```bash
grep -c 'class="hero-art' dist/index.html
```

Expected: `1`.

Screen list present and in portfolio order:

```bash
grep -o 'data-screens="[^"]*"' dist/index.html | head -c 300
```

Expected: a JSON array (HTML-escaped quotes are fine) beginning with `/portfolio/harsjewellery.webp`.

The Three.js chunk exists, and it is not one of the page's initial module scripts:

```bash
THREE_CHUNK=$(grep -l "WebGLRenderer" dist/_astro/*.js | head -1); echo "three chunk: $THREE_CHUNK"
grep -o '<script type="module" src="[^"]*"' dist/index.html
```

Expected: `three chunk:` names a file under `dist/_astro/`; the `<script type="module" src=...>` list does NOT include that file's name.

The gate chunk references the Three.js chunk only through a dynamic import:

```bash
grep -l "hero-scene: leaving the poster" dist/_astro/*.js | xargs grep -o 'import("[^"]*")' 
```

Expected: one `import("./<three-chunk-name>.js")` line, where the name matches `$THREE_CHUNK`.

No static `from "three"` outside the scene chunk:

```bash
grep -L "WebGLRenderer" dist/_astro/*.js | xargs grep -l 'from"three"' || echo "no static three imports elsewhere"
```

Expected: `no static three imports elsewhere`.

- [ ] **Step 7: Run the logic tests**

Run: `npm test`

Expected: PASS, 26 tests.

- [ ] **Step 8: Commit**

```bash
git add src/components/HeroScene.astro src/components/Hero.astro
git commit -m "Wire the 3D laptop scene into the hero behind a load gate" -m "HeroScene renders the poster for everyone and a hidden canvas; a small gate script imports the Three.js scene only after load and idle, and only when reduced motion, data saver, scene=off and missing WebGL2 all say no. The poster crossfades out once the first frame is rendered, and the hero particles are hidden while the scene is live." -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013oFQtjsfz1KG4oEukJ4N67"
```

---

### Task 4: Browser verification and tuning

**Files:**
- Possibly modify: `src/scripts/hero-scene.ts` (camera position, light intensities, colour values only, within the spec's "tune by eye within about 20 percent")
- No new files.

**Interfaces:** none.

This task has no unit test; it is the spec's verification steps 3 to 6. Run the dev server first: `npm run dev` (it prints the port; 4321 unless taken).

- [ ] **Step 1: Poster-only view is unchanged**

Open `http://localhost:4321/?scene=off`. Expected: the hero looks exactly like the committed site before this feature: floating PNG laptop, particles visible. Open DevTools > Network and confirm no request for the Three.js chunk was made.

- [ ] **Step 2: Scene appears and behaves on desktop**

Open `http://localhost:4321/`. Expected, in order:
1. The poster shows immediately.
2. Within about a second of load, the canvas fades in and the poster fades out; nothing shifts.
3. The screen shows the Hars Jewellery screenshot first, then crossfades to Zetra Electronics after about 3.5 seconds, and continues in portfolio order.
4. Moving the mouse across the hero turns the laptop smoothly toward the cursor; leaving the hero returns it to rest.
5. The particles are gone while the scene is live (`#home` has class `is-live` in the Elements panel).
6. Scrolling down tips the laptop back slightly; scrolling far past the hero and back resumes the crossfade cycle (check in DevTools > Performance that no frames render while the hero is off screen).

If the laptop is cut off or too small, adjust `CAMERA_DISTANCE` in `src/scripts/hero-scene.ts` (6.2 by default) by no more than ±1.2. If the body reads flat, raise the key light to at most 1.45 or the rim to at most 0.95. Rebuild-free: the dev server hot-reloads.

- [ ] **Step 3: Reduced motion keeps the poster**

In Chrome DevTools > Rendering, set "Emulate CSS media feature prefers-reduced-motion" to `reduce`, then reload. Expected: poster only, no request for the Three.js chunk, particles hidden by the existing reduced-motion rule.

- [ ] **Step 4: Mobile**

In DevTools device mode (or a real phone on the LAN address the dev server prints), reload. Expected: the scene appears, no cursor follow, the laptop floats and tips with scroll, the page scrolls normally over the canvas with no drag conflict, and scrolling the hero shows no visible jank. On a real phone, the pixel ratio cap of 1.5 should keep it smooth.

- [ ] **Step 5: Context-loss recovery**

In DevTools console on the live page run:

```js
document.querySelector(".hero-scene canvas").getContext("webgl2").getExtension("WEBGL_lose_context").loseContext()
```

Expected: the poster reappears and `#home` loses `is-live`. No errors other than the browser's own "context lost" notice.

- [ ] **Step 6: Final build and tests**

Run: `npm run build && npm test`

Expected: build exit 0 with 34 pages; 26 tests pass.

- [ ] **Step 7: Commit any tuning**

Only if Step 2 changed numbers:

```bash
git add src/scripts/hero-scene.ts
git commit -m "Tune hero scene framing and lighting after browser check" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013oFQtjsfz1KG4oEukJ4N67"
```

Then report to the user with the checklist results, one line per step, and the exact port the dev server is on.
