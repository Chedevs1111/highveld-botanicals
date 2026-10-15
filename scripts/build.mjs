#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalogue = JSON.parse(readFileSync(join(root, 'data/products.json'), 'utf8'));
const { store, categories, products } = catalogue;
const { coas } = JSON.parse(readFileSync(join(root, 'data/lab-results.json'), 'utf8'));
const { topics, articles } = JSON.parse(readFileSync(join(root, 'data/articles.json'), 'utf8'));

/**
 * A product page that claims a potency its own certificate does not support is
 * the single most damaging thing this store could publish. Fail the build.
 */
const TOLERANCE = 0.1;
const byBatch = new Map(coas.map((c) => [c.batch_id, c]));
const problems = [];

for (const p of products) {
  const coa = byBatch.get(p.batch_id);
  if (!coa) {
    problems.push(`${p.handle}: no certificate for batch ${p.batch_id}`);
    continue;
  }
  if (coa.product_handle !== p.handle) {
    problems.push(`${p.handle}: batch ${p.batch_id} belongs to ${coa.product_handle}`);
  }

  // check both cannabinoids — on the CBD line, the CBD figure IS the potency claim
  const pct = coa.basis === 'percent';
  const unit = pct ? '%' : 'mg';

  const checks = [
    ['THC', pct ? p.thc_pct : p.thc_mg, pct ? coa.totals.total_thc_pct : coa.totals.total_thc_mg],
    ['CBD', pct ? p.cbd_pct : p.cbd_mg, pct ? coa.totals.total_cbd_pct : coa.totals.total_cbd_mg],
  ];

  for (const [name, claimed, certified] of checks) {
    if (claimed === null || claimed === undefined) continue;
    const drift = Math.abs(claimed - certified);
    if (drift > TOLERANCE) {
      problems.push(
        `${p.handle}: listing claims ${claimed}${unit} ${name}, ` +
          `certificate ${coa.batch_id} reports ${certified}${unit} (drift ${drift.toFixed(2)})`
      );
    }
  }

  const failed = coa.safety.filter((s) => s.result !== 'Pass');
  if (failed.length > 0) {
    problems.push(`${p.handle}: batch ${p.batch_id} has a failing panel — ${failed.map((f) => f.panel).join(', ')}`);
  }
}

const topicHandles = new Set(topics.map((t) => t.handle));
const seenSlugs = new Set();

for (const a of articles) {
  if (!topicHandles.has(a.topic)) {
    problems.push(`article "${a.slug}": unknown topic "${a.topic}"`);
  }
  if (seenSlugs.has(a.slug)) {
    problems.push(`article "${a.slug}": duplicate slug`);
  }
  seenSlugs.add(a.slug);
  if (!a.body || a.body.length === 0) {
    problems.push(`article "${a.slug}": empty body`);
  }

  // an article quoting real certificate numbers must still agree with that certificate
  if (a.verify_against_batch) {
    const coa = byBatch.get(a.verify_against_batch);
    if (!coa) {
      problems.push(`article "${a.slug}": cites batch ${a.verify_against_batch}, which has no certificate`);
    } else {
      const text = JSON.stringify(a.body);
      const get = (k) => coa.cannabinoids.find((r) => r.key === k);
      const expected = [
        [`${get('thca').pct}%`, 'THCA'],
        [`${get('d9_thc').pct}%`, 'Δ9-THC'],
        [`${coa.totals.total_thc_pct}%`, 'total THC'],
      ];
      for (const [value, label] of expected) {
        if (!text.includes(value)) {
          problems.push(
            `article "${a.slug}": worked example no longer matches ${a.verify_against_batch} — ` +
              `certificate ${label} is ${value}`
          );
        }
      }
    }
  }
}

if (problems.length > 0) {
  console.error('Catalogue does not reconcile with its certificates:\n');
  problems.forEach((m) => console.error(`  ✗ ${m}`));
  console.error('\nFix the catalogue or regenerate the certificates. Refusing to build.');
  process.exit(1);
}

// photography status — placeholders are fine in development, never at launch
const placeholders = products.filter((p) => p.photo?.placeholder);
const strict = process.argv.includes('--strict');

if (placeholders.length > 0) {
  const line = `${placeholders.length} of ${products.length} products still use placeholder imagery`;
  if (strict) {
    console.error(`\n✗ ${line}. Refusing to build with --strict.\n`);
    placeholders.forEach((p) => console.error(`    · ${p.handle}`));
    console.error(`\n  Shoot them, drop the files in photos-incoming/, then:`);
    console.error(`    node scripts/ingest-photos.mjs\n`);
    process.exit(1);
  }
  console.warn(`⚠ ${line} — run with --strict to make this fail`);
} else {
  console.log(`All ${products.length} products have their own photography`);
}

console.log(`Potency reconciles with all ${coas.length} certificates`);
console.log(`${articles.length} articles across ${topics.length} topics resolve`);

const csvCell = (value) => {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const columns = [
  'Handle',
  'Title',
  'Body (HTML)',
  'Vendor',
  'Type',
  'Tags',
  'Published',
  'Option1 Name',
  'Option1 Value',
  'Variant SKU',
  'Variant Grams',
  'Variant Inventory Tracker',
  'Variant Inventory Qty',
  'Variant Inventory Policy',
  'Variant Fulfillment Service',
  'Variant Price',
  'Variant Compare At Price',
  'Variant Requires Shipping',
  'Variant Taxable',
  'Gift Card',
  'SEO Title',
  'SEO Description',
  'Status',
  'Image Src',
  'Image Position',
  'Image Alt Text',
  'Strain Type (product.metafields.custom.strain_type)',
  'THC Percentage (product.metafields.custom.thc_percentage)',
  'CBD Percentage (product.metafields.custom.cbd_percentage)',
  'THC mg (product.metafields.custom.thc_mg)',
  'CBD mg (product.metafields.custom.cbd_mg)',
  'Terpenes (product.metafields.custom.terpenes)',
  'Effects (product.metafields.custom.effects)',
  'Batch ID (product.metafields.custom.batch_id)',
  'COA URL (product.metafields.custom.coa_url)',
  'Member Tier (product.metafields.custom.member_tier)',
  'Age Restricted (product.metafields.custom.age_restricted)',
];

const rows = products.map((p) => {
  const tags = [
    p.type,
    p.strain_type,
    `tier:${p.member_tier}`,
    p.member_tier === 'open' ? 'non-intoxicating' : 'members-only',
    ...p.effects,
  ].join(', ');

  return [
    p.handle,
    p.title,
    `<p>${p.description}</p>`,
    store.name,
    p.type,
    tags,
    'TRUE',
    'Size',
    `${p.size} ${p.unit}`,
    p.sku,
    p.weight_g,
    'shopify',
    p.stock,
    'deny',
    'manual',
    p.price.toFixed(2),
    p.compare_at ? p.compare_at.toFixed(2) : '',
    'TRUE',
    'TRUE',
    'FALSE',
    `${p.title} — ${p.type} | ${store.name}`,
    p.short_description.slice(0, 320),
    'draft',
    p.photo ? p.photo.cdn : '',
    p.photo ? 1 : '',
    p.photo ? `${p.title} — placeholder image, replace with batch photography` : '',
    p.strain_type,
    p.thc_pct ?? '',
    p.cbd_pct ?? '',
    p.thc_mg ?? '',
    p.cbd_mg ?? '',
    JSON.stringify(p.terpenes),
    JSON.stringify(p.effects),
    p.batch_id,
    p.coa_url,
    p.member_tier,
    p.member_tier === 'open' ? 'false' : 'true',
  ].map(csvCell).join(',');
});

writeFileSync(join(root, 'data/products.csv'), [columns.map(csvCell).join(','), ...rows].join('\n') + '\n');

const bundle = `window.HB_DATA = ${JSON.stringify({ store, categories, products, coas, topics, articles })};\n`;
writeFileSync(join(root, 'preview/data.js'), bundle);

console.log(`Wrote data/products.csv (${products.length} products, ${columns.length} columns)`);
console.log(`Wrote preview/data.js (${(bundle.length / 1024).toFixed(1)} kB)`);
