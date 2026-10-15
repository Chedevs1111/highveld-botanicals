#!/usr/bin/env node
/**
 * Takes real product photography from photos-incoming/ and wires it into the
 * catalogue: validates it, squares and resizes it, installs it, and clears the
 * placeholder flag on every product it covers.
 *
 * Naming convention — the filename is the product handle, plus an optional shot
 * kind matching the shot list on the #/photography page:
 *
 *   durban-poison.jpg          hero      front-on, the card and PDP lead image
 *   durban-poison-macro.jpg    macro     trichomes in focus; the shot that sells flower
 *   durban-poison-scale.jpg    scale     in a hand, or beside a coin
 *   durban-poison-label.jpg    label     packaging with the batch code legible
 *
 * Run with --dry to see what it would do without touching anything.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, copyFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, basename } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const incoming = join(root, 'photos-incoming');
const target = join(root, 'preview/images');
const productsPath = join(root, 'data/products.json');

const dryRun = process.argv.includes('--dry');

const KINDS = ['hero', 'macro', 'scale', 'label'];
const MIN_EDGE = 1200;
const OUTPUT_EDGE = 1600;
const QUALITY = 85;

const catalogue = JSON.parse(readFileSync(productsPath, 'utf8'));
const handles = new Set(catalogue.products.map((p) => p.handle));

/* ---------- make sure there is somewhere to put photos ---------- */

if (!existsSync(incoming)) {
  mkdirSync(incoming, { recursive: true });
  writeFileSync(
    join(incoming, 'README.md'),
    `# Drop product photography here

Name each file after the product handle, with an optional shot kind:

    durban-poison.jpg          hero  — front-on, used on cards and as the PDP lead
    durban-poison-macro.jpg    macro — trichomes in focus
    durban-poison-scale.jpg    scale — in a hand or beside a coin
    durban-poison-label.jpg    label — packaging with the batch code legible

Handles:

${catalogue.products.map((p) => `    ${p.handle}`).join('\n')}

Then run:

    node scripts/ingest-photos.mjs

Requirements: JPEG or PNG, at least ${MIN_EDGE}px on the short edge. Anything
non-square is centre-cropped, so leave headroom around the subject.
`
  );
  console.log(`Created photos-incoming/ with a README listing every handle.`);
  console.log(`Drop your photos in there and run this again.`);
  process.exit(0);
}

/* ---------- read what is waiting ---------- */

const files = readdirSync(incoming).filter((f) => /\.(jpe?g|png)$/i.test(f));

if (files.length === 0) {
  console.log(`Nothing in photos-incoming/.`);
  console.log(`See photos-incoming/README.md for the naming convention.`);
  process.exit(0);
}

const dims = (file) => {
  const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file], { encoding: 'utf8' });
  const w = Number(/pixelWidth:\s*(\d+)/.exec(out)?.[1]);
  const h = Number(/pixelHeight:\s*(\d+)/.exec(out)?.[1]);
  return { w, h };
};

const parsed = [];
const rejected = [];

for (const file of files) {
  const full = join(incoming, file);
  const stem = basename(file, extname(file));

  let handle = stem;
  let kind = 'hero';

  for (const k of KINDS.slice(1)) {
    if (stem.endsWith(`-${k}`)) {
      handle = stem.slice(0, -(k.length + 1));
      kind = k;
      break;
    }
  }

  if (!handles.has(handle)) {
    rejected.push({ file, why: `"${handle}" is not a product handle` });
    continue;
  }

  let d;
  try {
    d = dims(full);
  } catch (error) {
    rejected.push({ file, why: 'not a readable image' });
    continue;
  }

  if (Math.min(d.w, d.h) < MIN_EDGE) {
    rejected.push({ file, why: `short edge ${Math.min(d.w, d.h)}px, needs ${MIN_EDGE}px` });
    continue;
  }

  const ratio = Math.max(d.w, d.h) / Math.min(d.w, d.h);
  parsed.push({ file, full, handle, kind, ...d, willCrop: ratio > 1.02 });
}

/* ---------- report ---------- */

console.log(`Found ${files.length} file${files.length === 1 ? '' : 's'} in photos-incoming/\n`);

if (rejected.length) {
  console.log('Skipped:');
  rejected.forEach((r) => console.log(`  ✗ ${r.file} — ${r.why}`));
  console.log('');
}

if (parsed.length === 0) {
  console.error('Nothing usable. Fix the names or sizes above and run again.');
  process.exit(1);
}

console.log('Will install:');
for (const p of parsed) {
  const crop = p.willCrop ? ` (centre-cropped from ${p.w}×${p.h})` : '';
  console.log(`  ✓ ${p.handle} — ${p.kind}${crop}`);
}
console.log('');

if (dryRun) {
  console.log('Dry run, nothing written. Drop --dry to apply.');
  process.exit(0);
}

/* ---------- square, resize, install ---------- */

const tmp = join(root, '.photo-tmp');
mkdirSync(tmp, { recursive: true });

for (const p of parsed) {
  const edge = Math.min(p.w, p.h);
  const staged = join(tmp, `${p.handle}-${p.kind}.jpg`);
  const out = join(target, p.kind === 'hero' ? `${p.handle}.jpg` : `${p.handle}-${p.kind}.jpg`);

  copyFileSync(p.full, staged);
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', String(QUALITY), staged], { stdio: 'ignore' });
  execFileSync('sips', ['-c', String(edge), String(edge), staged], { stdio: 'ignore' });
  execFileSync('sips', ['-Z', String(OUTPUT_EDGE), staged], { stdio: 'ignore' });
  copyFileSync(staged, out);
}

rmSync(tmp, { recursive: true, force: true });

/* ---------- update the catalogue ---------- */

const byHandle = new Map();
for (const p of parsed) {
  if (!byHandle.has(p.handle)) byHandle.set(p.handle, []);
  byHandle.get(p.handle).push(p.kind);
}

const ALT = {
  hero: (t) => `${t}, front on`,
  macro: (t) => `${t}, close detail`,
  scale: (t) => `${t} shown for scale`,
  label: (t) => `${t} packaging, batch code visible`,
};

let updated = 0;

for (const product of catalogue.products) {
  const kinds = byHandle.get(product.handle);
  if (!kinds) continue;

  const existing = new Map((product.images || []).map((i) => [i.kind, i]));

  for (const kind of kinds) {
    existing.set(kind, {
      kind,
      src: kind === 'hero' ? `images/${product.handle}.jpg` : `images/${product.handle}-${kind}.jpg`,
      alt: ALT[kind](product.title),
    });
  }

  product.images = KINDS.filter((k) => existing.has(k)).map((k) => existing.get(k));

  if (existing.has('hero')) {
    product.image = existing.get('hero').src;
    // the photo block described where a stock placeholder came from; it no longer applies
    product.photo = { source: 'own', placeholder: false, shot_kinds: product.images.map((i) => i.kind) };
    updated += 1;
  }
}

writeFileSync(productsPath, `${JSON.stringify(catalogue, null, 2)}\n`);

const remaining = catalogue.products.filter((p) => p.photo?.placeholder);

console.log(`Installed ${parsed.length} image${parsed.length === 1 ? '' : 's'} across ${byHandle.size} product${
  byHandle.size === 1 ? '' : 's'
}.`);
console.log(`${updated} product${updated === 1 ? '' : 's'} moved off placeholder imagery.\n`);

if (remaining.length) {
  console.log(`Still on placeholders (${remaining.length}):`);
  remaining.forEach((p) => console.log(`  · ${p.handle}`));
  console.log('');
} else {
  console.log('Every product now has its own photography.\n');
}

console.log('Next: node scripts/build.mjs && node scripts/bundle.mjs');
