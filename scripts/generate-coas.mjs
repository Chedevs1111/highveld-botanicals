#!/usr/bin/env node
/**
 * Generates specimen certificates of analysis from the product catalogue.
 *
 * The numbers are DERIVED from each product's stated potency, not invented
 * independently — a COA that contradicts its own product page is worse than no
 * COA at all. Total THC is computed with the standard decarboxylation factor
 * (THCA x 0.877 + d9-THC) so the arithmetic on the certificate actually works.
 *
 * Every record carries specimen: true. These are layout and structure
 * placeholders. Replace with real reports from an accredited laboratory before
 * publishing anything a customer might rely on.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { products } = JSON.parse(readFileSync(join(root, 'data/products.json'), 'utf8'));

const DECARB = 0.877;

const LAB = {
  name: 'Karoo Analytical Services (Pty) Ltd',
  short: 'Karoo Analytical',
  accreditation: 'SANAS T-0000 (specimen)',
  address: '12 Voortrekker Road, Bellville, Cape Town, 7530',
  contact: 'reports@karooanalytical.example',
  scope: 'ISO/IEC 17025 — cannabinoid potency, terpene profile, contaminant screening',
};

/* deterministic PRNG so regenerating does not churn the file */
const seeded = (str) => {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
};

const round = (n, dp = 2) => Number(n.toFixed(dp));

/* batch id encodes YYMM, e.g. DP-2607-A -> July 2026 */
const datesFor = (batchId, rnd) => {
  const m = batchId.match(/-(\d{2})(\d{2})-/);
  const year = m ? 2000 + Number(m[1]) : 2026;
  const month = m ? Number(m[2]) : 7;
  const day = 3 + Math.floor(rnd() * 12);
  const received = new Date(Date.UTC(year, month - 1, day));
  const tested = new Date(received.getTime() + (2 + Math.floor(rnd() * 2)) * 86400000);
  const reported = new Date(tested.getTime() + (1 + Math.floor(rnd() * 2)) * 86400000);
  const iso = (d) => d.toISOString().slice(0, 10);
  return { received: iso(received), tested: iso(tested), reported: iso(reported) };
};

const matrixOf = (p) => {
  if (p.category === 'flower') return 'flower';
  if (p.category === 'pre-rolls') return 'flower';
  if (p.category === 'vapes-concentrates') return 'concentrate';
  if (p.type === 'Topical') return 'topical';
  return 'ingestible';
};

const MATRIX_LABEL = {
  flower: 'Dried cannabis flower',
  concentrate: 'Cannabis extract (vape cartridge)',
  ingestible: 'Cannabis-infused edible / oral',
  topical: 'Topical preparation',
};

/* ---------- cannabinoid panel ---------- */

const cannabinoidsPct = (p, rnd) => {
  const target = p.thc_pct ?? 0;
  const cbdTarget = p.cbd_pct ?? 0;
  const concentrate = matrixOf(p) === 'concentrate';

  // extracts are largely decarboxylated already; flower is THCA-dominant
  const d9 = concentrate ? target * (0.94 + rnd() * 0.04) : 0.4 + rnd() * 0.8;
  const thca = Math.max(0, (target - d9) / DECARB);

  const cbd = concentrate ? cbdTarget * 0.9 : 0.05 + rnd() * 0.1;
  const cbda = Math.max(0, (cbdTarget - cbd) / DECARB);

  const rows = [
    { name: 'Δ9-Tetrahydrocannabinol (THC)', key: 'd9_thc', pct: round(d9) },
    { name: 'Tetrahydrocannabinolic acid (THCA)', key: 'thca', pct: round(thca) },
    { name: 'Cannabidiol (CBD)', key: 'cbd', pct: round(cbd) },
    { name: 'Cannabidiolic acid (CBDA)', key: 'cbda', pct: round(cbda) },
    { name: 'Cannabigerol (CBG)', key: 'cbg', pct: round(0.1 + rnd() * 0.9) },
    { name: 'Cannabinol (CBN)', key: 'cbn', pct: round(rnd() * 0.35) },
    { name: 'Cannabichromene (CBC)', key: 'cbc', pct: round(rnd() * 0.4) },
    { name: 'Δ8-Tetrahydrocannabinol', key: 'd8_thc', pct: 0, nd: true },
  ];

  return rows.map((r) => ({ ...r, mg_g: round(r.pct * 10, 1) }));
};

const cannabinoidsMg = (p, rnd) => {
  const thc = p.thc_mg ?? 0;
  const cbd = p.cbd_mg ?? 0;
  const unitLabel = p.unit === 'pieces' ? 'per piece' : 'per unit';

  // solve the neutral form from the target so that
  // acid x 0.877 + neutral == the figure printed on the product page
  const split = (target) => {
    const acid = round(target * rnd() * 0.02, 2);
    return { acid, neutral: round(Math.max(0, target - acid * DECARB), 2) };
  };

  const t = split(thc);
  const c = split(cbd);

  const rows = [
    { name: 'Δ9-Tetrahydrocannabinol (THC)', key: 'd9_thc', mg: t.neutral },
    { name: 'Tetrahydrocannabinolic acid (THCA)', key: 'thca', mg: t.acid },
    { name: 'Cannabidiol (CBD)', key: 'cbd', mg: c.neutral },
    { name: 'Cannabidiolic acid (CBDA)', key: 'cbda', mg: c.acid },
    { name: 'Cannabigerol (CBG)', key: 'cbg', mg: round(cbd > 0 ? cbd * 0.03 * rnd() : thc * 0.02 * rnd(), 2) },
    { name: 'Cannabinol (CBN)', key: 'cbn', mg: round(thc * 0.01 * rnd(), 2) },
  ];

  return { rows, unitLabel };
};

/* ---------- terpenes ---------- */

const terpeneRows = (p, rnd) => {
  const base = matrixOf(p) === 'flower' ? 9 : 4;
  return p.terpenes.map((name, i) => {
    const mg = round(base * Math.pow(0.55, i) * (0.75 + rnd() * 0.5), 2);
    return { name, mg_g: mg, pct: round(mg / 10, 3) };
  });
};

/* ---------- safety panels ---------- */

const safetyPanels = (p, rnd) => {
  const matrix = matrixOf(p);

  const panels = [
    {
      panel: 'Pesticide residues',
      method: 'LC-MS/MS · GC-MS/MS',
      analytes: 66,
      result: 'Pass',
      detail: 'No analyte detected above the limit of quantitation.',
    },
    {
      panel: 'Heavy metals',
      method: 'ICP-MS',
      analytes: 4,
      result: 'Pass',
      detail: `Pb ${round(rnd() * 0.08, 3)}, Cd ${round(rnd() * 0.04, 3)}, As ${round(rnd() * 0.06, 3)}, Hg ${round(rnd() * 0.02, 3)} ppm — all below action limits.`,
    },
    {
      panel: 'Microbial contaminants',
      method: 'qPCR · plate count',
      analytes: 5,
      result: 'Pass',
      detail: 'E. coli, Salmonella spp., Aspergillus (flavus, fumigatus, niger, terreus) not detected. TYMC below limit.',
    },
    {
      panel: 'Mycotoxins',
      method: 'LC-MS/MS',
      analytes: 5,
      result: 'Pass',
      detail: 'Aflatoxins B1, B2, G1, G2 and Ochratoxin A not detected.',
    },
  ];

  if (matrix === 'flower') {
    panels.push({
      panel: 'Foreign matter',
      method: 'Visual · magnification',
      analytes: null,
      result: 'Pass',
      detail: 'No visible mould, insect fragments, or extraneous material.',
    });
  }

  if (matrix === 'concentrate') {
    panels.push({
      panel: 'Residual solvents',
      method: 'HS-GC-FID',
      analytes: 21,
      result: 'Pass',
      detail: 'Butane, propane, ethanol, hexane and heptane below action limits. Extraction was hydrocarbon-free.',
    });
  }

  if (matrix === 'ingestible') {
    panels.push({
      panel: 'Dose homogeneity',
      method: 'HPLC-DAD, n=10',
      analytes: null,
      result: 'Pass',
      detail: `Relative standard deviation ${round(2 + rnd() * 3, 1)}% across ten units — within the ±15% tolerance.`,
    });
  }

  if (matrix === 'topical') {
    panels.push({
      panel: 'Preservative efficacy',
      method: 'ISO 11930',
      analytes: null,
      result: 'Pass',
      detail: 'Criterion A met at 28 days.',
    });
  }

  return panels;
};

/* ---------- assemble ---------- */

const coas = products.map((p) => {
  const rnd = seeded(p.batch_id);
  const matrix = matrixOf(p);
  const dates = datesFor(p.batch_id, rnd);
  const pctBased = matrix === 'flower' || matrix === 'concentrate';

  const record = {
    batch_id: p.batch_id,
    product_handle: p.handle,
    product_title: p.title,
    sku: p.sku,
    matrix,
    matrix_label: MATRIX_LABEL[matrix],
    specimen: true,
    lab: LAB,
    sample: {
      lab_sample_id: `KA-${p.batch_id.slice(-6).replace('-', '')}-${Math.floor(rnd() * 900 + 100)}`,
      received: dates.received,
      tested: dates.tested,
      reported: dates.reported,
      sample_size: pctBased ? '5.0 g' : `${Math.ceil(rnd() * 5 + 5)} units`,
      batch_size: pctBased ? `${(2 + Math.floor(rnd() * 6)) * 400} g` : `${(2 + Math.floor(rnd() * 8)) * 100} units`,
      methods: pctBased
        ? 'Cannabinoids by HPLC-DAD; terpenes by GC-MS headspace'
        : 'Cannabinoids by HPLC-DAD following solvent extraction',
    },
    basis: pctBased ? 'percent' : 'milligram',
    terpenes: terpeneRows(p, rnd),
    safety: safetyPanels(p, rnd),
    analyst: 'N. Petersen, Signatory Analyst',
    verification_code: `${p.batch_id}-${Math.floor(rnd() * 8999 + 1000)}`,
  };

  if (pctBased) {
    const rows = cannabinoidsPct(p, rnd);
    const get = (k) => rows.find((r) => r.key === k).pct;
    record.cannabinoids = rows;
    record.totals = {
      total_thc_pct: round(get('thca') * DECARB + get('d9_thc')),
      total_cbd_pct: round(get('cbda') * DECARB + get('cbd')),
      total_cannabinoids_pct: round(rows.reduce((s, r) => s + r.pct, 0)),
    };
    if (matrix === 'flower') {
      record.moisture_pct = round(9 + rnd() * 3, 1);
      record.water_activity = round(0.52 + rnd() * 0.08, 2);
    }
  } else {
    const { rows, unitLabel } = cannabinoidsMg(p, rnd);
    const get = (k) => rows.find((r) => r.key === k).mg;
    record.cannabinoids = rows;
    record.unit_label = unitLabel;
    record.totals = {
      total_thc_mg: round(get('thca') * DECARB + get('d9_thc'), 2),
      total_cbd_mg: round(get('cbda') * DECARB + get('cbd'), 2),
      units_per_pack: p.unit === 'pieces' ? Number(p.size) : 1,
    };
    record.totals.total_thc_pack_mg = round(record.totals.total_thc_mg * record.totals.units_per_pack, 1);
  }

  return record;
});

writeFileSync(join(root, 'data/lab-results.json'), JSON.stringify({ lab: LAB, coas }, null, 2) + '\n');
console.log(`Wrote data/lab-results.json (${coas.length} specimen certificates)`);
