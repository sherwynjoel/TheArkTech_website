# Hero 3D scene: design

Date: 2026-09-18. Status: approved in conversation, pending written review.

## Goal

Replace the static laptop render in the home-page hero with a real-time 3D laptop whose screen cycles through the ten live client sites. The scene follows the cursor, tilts with scroll, and carries proof (real work) rather than decoration. The page must load exactly as fast as today for every visitor, and visitors who cannot or should not run WebGL must see the current image unchanged.

## Non-goals

- No 3D anywhere but the hero. No card tilt, no scroll-driven story, no second device.
- No downloadable 3D model. The laptop is built from primitives.
- No drag, click, or keyboard interaction with the scene.
- No change to hero copy, buttons, badges, or layout, other than the right column swapping its image for the scene component.
- No React in the hero.

## Stack and dependency

- One new dependency: `three` (current 0.186). Imported only from `src/scripts/hero-scene.ts` and only via dynamic `import()` at runtime, so Vite emits it as a separate chunk that never blocks first paint.
- No `@react-three/fiber`, no `drei`, no GSAP.

## Scene

Units: 1 unit = 10 cm. All numbers below are targets; tune by eye within about 20 percent.

- **Base**: rounded box 3.0 wide, 0.12 tall, 2.0 deep, corner radius 0.06. Slightly darker inset plane on top for the keyboard well (2.6 x 1.1) and a trackpad rectangle (0.9 x 0.6).
- **Lid**: rounded box 3.0 wide, 1.95 tall, 0.08 thick, corner radius 0.06, pivoted at its bottom back edge, open at 105 degrees from the base.
- **Screen**: plane 2.8 x 1.75 (16:10, matching the 1280 x 800 screenshots), inset 0.01 in front of the lid's inner face, leaving a bezel of about 0.1.
- **Body material**: `MeshStandardMaterial`, colour near `#0f1420`, metalness 0.6, roughness 0.45. Environment map from `RoomEnvironment` through `PMREMGenerator`, so no HDR file is fetched.
- **Lights**: one directional key light from top-right at intensity about 1.2, one cool rim light from behind-left tinted `--brand-bright` (`#60a5fa`) at about 0.8, ambient from the environment map only.
- **Grounding**: a radial-gradient sprite in brand blue under the device (matches the page's existing `.hero-glow`), and a contact shadow plane textured with a canvas-drawn radial gradient. No shadow maps.
- **Camera**: perspective, 32 degree vertical FOV, positioned above and to the front-left so the open screen faces the headline copy. Renderer has `alpha: true`; the hero backdrop shows through.

## Screen content

- Source: `portfolioProjects` in `src/data/portfolio.ts`, in that order. `HeroScene.astro` serialises the `image` paths into a `data-screens` JSON attribute. The script never hardcodes a path.
- Screen material: a small custom `ShaderMaterial` with two sampler uniforms and a `mix` float. Unlit, so screenshots render at true colour.
- Timing: hold 3.5 s, crossfade 0.8 s, ease-out. Loop forever while the scene is running.
- Texture pipeline: each image is decoded through an `Image` element (`decode()`), drawn onto a canvas downscaled to 1024 px wide, and uploaded as a `CanvasTexture` with `SRGBColorSpace`, `generateMipmaps: false`, linear filtering. (Chosen over `createImageBitmap` because its orientation and resize options are inconsistent across Safari versions.) Only the current and next textures are kept; the previous one is disposed after each crossfade completes. The next image is requested as soon as a crossfade finishes, so it is ready before it is needed.
- If a screenshot fails to load, skip it and continue with the next. If the first one fails, the scene still starts with a dark screen and tries the next.

## Interaction

- **Pointer, fine-pointer devices only** (`matchMedia("(pointer: fine)")`). Pointer position across the whole `#home` section maps to a target yaw of plus or minus 12 degrees and pitch of plus or minus 8 degrees. Each frame the current rotation moves toward the target with exponential smoothing (factor about `1 - exp(-dt * 6)`). On `pointerleave` the target returns to rest.
- **Scroll, all devices.** Scroll progress of the hero (0 at rest, 1 when it has scrolled out) adds up to 10 degrees of backward pitch and 0.3 units of upward drift, both eased.
- **Idle float.** Vertical bob of amplitude 0.04 units with a 4 s period, always on.
- Rotation and drift are applied to a single parent group. The lid angle is fixed.

## Loading and fallback

1. `HeroScene.astro` renders the existing `<Image>` poster exactly as today, plus a `<div class="hero-scene" hidden>` containing a `<canvas aria-hidden="true">`. Both share one fixed-aspect box so nothing shifts.
2. A small component `<script>` in `HeroScene.astro` (bundled by Astro as a deferred module, a few hundred bytes, no three.js import) decides whether to try WebGL. It gives up immediately, leaving the poster, if any of these hold: `prefers-reduced-motion: reduce`; `navigator.connection.saveData === true`; the URL has `scene=off`; `document.createElement("canvas").getContext("webgl2")` is null.
3. Otherwise, after `window.load` and then `requestIdleCallback` (fallback `setTimeout` 200 ms), it checks that the hero is still at least partly in view; if not, it gives up. If so it does `import("../scripts/hero-scene.ts")` and calls `mount(container, options)`.
4. `mount` builds the scene, loads the first screenshot, renders one frame, then un-hides the canvas box and adds `is-live` to the hero. CSS crossfades the canvas in over 500 ms and the poster out over the same time; the poster stays in the DOM at opacity 0 so its alt text remains the accessible description of the hero visual.
5. Any exception during steps 3 or 4 is caught, logged with `console.warn`, and leaves the poster untouched.
6. While `is-live` is set, `.hero-particle` elements are `display: none`.

## Performance budget

- Pixel ratio: `min(devicePixelRatio, 2)` on fine-pointer devices, `min(devicePixelRatio, 1.5)` otherwise.
- Antialias on. No shadow maps, no post-processing, no tone-mapping pass beyond the renderer default.
- Mesh count about six. Geometry is created once.
- GPU textures: at most two screenshots at 1024 px wide plus the small environment and shadow textures.
- Render loop uses `requestAnimationFrame`, and is paused when the hero is out of view (IntersectionObserver on `#home`) or the document is hidden (`visibilitychange`). Resumes when either condition clears.
- Resize handled with a `ResizeObserver` on the container, debounced to the next frame.
- Target: 60 fps on a mid-range Android phone from 2023; no dropped frames on a laptop.

## Files and interfaces

- `src/components/HeroScene.astro` (new). Props: none. Reads `portfolioProjects` and the hero art import. Renders poster, canvas box, `data-screens`, and the small gate script.
- `src/scripts/hero-scene.ts` (new). Exports `mount(container: HTMLElement, opts: { screens: string[]; hero: HTMLElement; finePointer: boolean; onContextLost?: () => void }): Promise<() => void>`. The promise resolves once the first frame has rendered with the first screenshot that decoded (or a dark screen if none did), so the gate reveals a finished picture. The resolved function tears everything down (cancels the frame loop, disconnects observers, disposes geometry, materials, textures and the renderer). `onContextLost` is called after the scene has torn itself down on GPU context loss. Nothing else is exported.
- `src/components/Hero.astro` (edit). The right column renders `<HeroScene />` instead of the `<Image>`; the `heroArt` import and `.hero-art` styles move into `HeroScene.astro`. The `.hero-visual` wrapper and grid stay. One new rule: `#home.is-live .hero-particle { display: none; }`.
- `package.json`: add `three`. Lockfile updated by npm.

## Data flow

`portfolio.ts` -> `HeroScene.astro` (build time, JSON in `data-screens`) -> gate script (runtime, reads the attribute) -> `mount()` (receives `screens: string[]`) -> texture pipeline.

## Error handling

- Gate script: every check is inside try/catch; any throw means "leave the poster".
- `mount`: a throw before the first frame propagates to the gate, which warns and leaves the poster. After the scene is live, a WebGL context loss (`webglcontextlost`) tears the scene down and restores the poster.
- Texture loads: failures skip to the next image; the loop never stalls on a bad URL.

## Accessibility and motion

- `prefers-reduced-motion: reduce` never loads the scene. The existing reduced-motion rules for the hero keep working because the poster is the same element as today.
- The canvas is `aria-hidden="true"`. The poster keeps its alt text and remains the accessible description of the hero visual.
- No focusable elements are added. No cursor changes over the canvas.

## Verification

1. `npm run build` exits 0.
2. In `dist/index.html`: the poster `<img>` is present in the HTML; none of the page's `<script type="module" src>` entries is the chunk that contains three.js; that chunk exists under `dist/_astro/` and is referenced only by a dynamic import inside the gate chunk.
3. `http://localhost:4321/?scene=off` renders identically to the current hero.
4. In a real browser: the poster shows first, the canvas fades in after load, the screen cycles through screenshots in portfolio order, the device follows the cursor and returns to rest, the particles are gone while the scene is live, and scrolling away then back resumes the loop.
5. With reduced motion enabled in the OS, the poster stays and no request for the scene chunk is made.
6. Mobile check on a phone: scene appears, no drag conflict with scrolling, no visible jank while scrolling the hero.

There is no automated test harness in this project; steps 4 to 6 are a manual checklist.
