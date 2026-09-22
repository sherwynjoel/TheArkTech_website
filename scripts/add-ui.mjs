#!/usr/bin/env node
/**
 * Add a shadcn-registry component (21st.dev, Aceternity UI, Skiper UI, ...)
 * without the shadcn CLI's interactive React-19 prompt.
 *
 *   node scripts/add-ui.mjs https://ui.aceternity.com/registry/bento-grid.json
 *   node scripts/add-ui.mjs https://skiper-ui.com/r/skiper40.json
 *   node scripts/add-ui.mjs https://21st.dev/r/<author>/<component>
 *
 * It downloads the registry item, writes each file under src/components/ui/,
 * follows registryDependencies, and prints the npm install command for any
 * npm dependencies not yet in package.json. It never runs npm itself.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const uiDir = path.join(root, "src", "components", "ui");
const pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
const installed = new Set([...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})]);

const urls = process.argv.slice(2);
if (urls.length === 0) {
  console.error("usage: node scripts/add-ui.mjs <registry-item-url> [...more]");
  process.exit(1);
}

const seen = new Set();
const missingDeps = new Set();

async function addItem(url) {
  if (seen.has(url)) return;
  seen.add(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const item = await res.json();
  const files = item.files ?? [];
  if (files.length === 0) throw new Error(`${url}: no files in registry item`);
  await fs.mkdir(uiDir, { recursive: true });
  for (const f of files) {
    const name = path.basename(f.path ?? f.name ?? `${item.name}.tsx`);
    const target = path.join(uiDir, name);
    const content = f.content;
    if (typeof content !== "string") throw new Error(`${url}: file ${name} has no inline content`);
    await fs.writeFile(target, content.replace(/\r\n/g, "\n"), "utf8");
    console.log(`wrote src/components/ui/${name}  (${item.name})`);
    // Many registry components are written for Next.js. This is an Astro site:
    // next/link becomes <a>, next/image becomes <img>, next/navigation has no equivalent.
    const nextImports = [...content.matchAll(/from\s+["'](next\/[^"']+)["']/g)].map((m) => m[1]);
    if (nextImports.length) {
      console.log(`  WARNING: ${name} imports ${[...new Set(nextImports)].join(", ")} which do not exist in Astro. Replace them before using the component.`);
    }
  }
  for (const d of item.dependencies ?? []) {
    const bare = d.replace(/(?<=.)@.*$/, "");
    if (!installed.has(bare)) missingDeps.add(d);
  }
  for (const dep of item.registryDependencies ?? []) {
    // Registry deps are either full URLs or names on the same registry.
    const depUrl = /^https?:/.test(dep) ? dep : url.replace(/[^/]+\.json$/, `${dep}.json`);
    await addItem(depUrl);
  }
}

for (const url of urls) await addItem(url);

if (missingDeps.size) {
  console.log(`\ninstall the packages these components import:\n  npm install ${[...missingDeps].join(" ")} --legacy-peer-deps`);
} else {
  console.log("\nall npm dependencies already installed");
}
