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
  const room = new RoomEnvironment();
  const envTexture = pmrem.fromScene(room, 0.04).texture;
  room.dispose();
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
  glowTex.colorSpace = SRGBColorSpace;
  const glow = new Mesh(
    track(new PlaneGeometry(6, 4)),
    track(new MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false })),
  );
  glow.rotation.x = -90 * DEG;
  glow.position.set(0, -0.02, -0.4);
  glow.renderOrder = -2;
  laptop.add(glow);

  const shadowTex = track(new CanvasTexture(radialCanvas(256, "rgba(0,0,0,0.55)", "rgba(0,0,0,0)")));
  shadowTex.colorSpace = SRGBColorSpace;
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
  let resizeRaf = 0;
  const ro = new ResizeObserver(() => {
    if (resizeQueued) return;
    resizeQueued = true;
    resizeRaf = requestAnimationFrame(() => {
      resizeQueued = false;
      if (tornDown) return;
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
    cancelAnimationFrame(resizeRaf);
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
