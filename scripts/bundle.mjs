#!/usr/bin/env node
/**
 * Bundles the multi-file preview into one self-contained HTML file that opens
 * from disk with no server, no network and no build step.
 *
 * Everything is inlined: stylesheet, every module in load order, and every
 * image as a data URI. Two things are added that the served version does not
 * need — an in-memory localStorage shim (browsers restrict storage on file://,
 * and without it the cart and membership state silently stop working) and a
 * banner making clear this is a preview build.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const preview = join(root, 'preview');
const dist = join(root, 'dist');
mkdirSync(dist, { recursive: true });

/* ---------- collect images as data URIs ---------- */

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

const images = new Map();
for (const file of walk(join(preview, 'images'))) {
  const key = relative(preview, file).split('\\').join('/');
  const b64 = readFileSync(file).toString('base64');
  images.set(key, `data:image/jpeg;base64,${b64}`);
}

const inlineImages = (text) => {
  let out = text;
  // longest first so images/rejected/x.jpg is not partially matched by images/x.jpg
  const literal = [...images.keys()].filter((k) => !k.startsWith('images/rejected/'));
  for (const key of literal.sort((a, b) => b.length - a.length)) {
    out = out.split(key).join(images.get(key));
  }
  return out;
};

/* ---------- runtime asset map ---------- */

/**
 * Only the images whose paths are built at render time rather than written as
 * literals — currently the rejected-photo gallery. Everything else is caught by
 * string replacement, and including it here too would inline it twice and
 * double the file size.
 */
const dynamic = [...images.keys()].filter((k) => k.startsWith('images/rejected/'));
const assetMap = `window.HB_IMAGES = ${JSON.stringify(
  Object.fromEntries(dynamic.map((k) => [k, images.get(k)]))
)};\n`;

/* ---------- storage shim ---------- */

const shim = `
(function () {
  var usable = false;
  try {
    window.localStorage.setItem('__hb', '1');
    window.localStorage.removeItem('__hb');
    usable = true;
  } catch (e) {
    usable = false;
  }
  if (usable) return;

  // file:// often blocks localStorage. Without this the cart, membership and
  // order state fail silently and the demo looks broken rather than restricted.
  var mem = {};
  var shimmed = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
    setItem: function (k, v) { mem[k] = String(v); },
    removeItem: function (k) { delete mem[k]; },
    clear: function () { mem = {}; },
    key: function (i) { return Object.keys(mem)[i] != null ? Object.keys(mem)[i] : null; }
  };
  Object.defineProperty(shimmed, 'length', { get: function () { return Object.keys(mem).length; } });

  try {
    Object.defineProperty(window, 'localStorage', { value: shimmed, configurable: true });
  } catch (e) {
    window.localStorage = shimmed;
  }
  window.HB_STORAGE_IN_MEMORY = true;
})();
`;

/* ---------- assemble ---------- */

let html = readFileSync(join(preview, 'index.html'), 'utf8');

const css = readFileSync(join(preview, 'styles.css'), 'utf8');
html = html.replace(
  '    <link rel="stylesheet" href="styles.css">',
  `    <style>\n${inlineImages(css)}\n    </style>`
);

const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
const bundled = scripts
  .map((name) => {
    const body = readFileSync(join(preview, name), 'utf8');
    return `/* ===== ${name} ===== */\n${body}`;
  })
  .join('\n');

html = html.replace(
  /\n\s*<script src="[^"]+"><\/script>/g,
  ''
).replace(
  '  </body>',
  `    <script>\n${shim}\n${assetMap}\n${inlineImages(bundled)}\n    </script>\n  </body>`
);

html = html.replace(
  '<title>Highveld Botanicals — storefront preview</title>',
  '<title>Highveld Botanicals — single-file preview</title>'
);

html = html.replace(
  '<p class="header__notice">Preview build · Members only · Verified 18+</p>',
  '<p class="header__notice">Single-file preview · Members only · Verified 18+ · No orders are processed</p>'
);

const out = join(dist, 'highveld-botanicals.html');
writeFileSync(out, html);

const kb = (n) => `${(n / 1024).toFixed(0)} kB`;
const problems = [];
for (const [key, uri] of images) {
  const occurrences = html.split(uri).length - 1;
  if (occurrences === 0) problems.push(`${key}: collected but never inlined`);
  if (occurrences > 1) problems.push(`${key}: inlined ${occurrences} times — wasted bytes`);
}
if (problems.length > 0) {
  console.error('Image bundling problems:');
  problems.forEach((m) => console.error(`  ✗ ${m}`));
  process.exit(1);
}

console.log(`Bundled ${scripts.length} modules and ${images.size} images`);
console.log(`  ${relative(root, out)} — ${kb(Buffer.byteLength(html))}`);
console.log(`  opens from disk, no server required`);
