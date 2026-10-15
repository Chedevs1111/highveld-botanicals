(function () {
  const { products, coas } = window.HB_DATA;
  const byBatch = new Map(coas.map((c) => [c.batch_id, c]));
  const productByHandle = new Map(products.map((p) => [p.handle, p]));

  const escape = (value) =>
    String(value === null || value === undefined ? '' : value).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );

  const date = (iso) =>
    iso ? new Date(iso).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  const MATRIX_FILTERS = [
    ['', 'All'],
    ['flower', 'Flower & pre-rolls'],
    ['concentrate', 'Concentrates'],
    ['ingestible', 'Edibles & oral'],
    ['topical', 'Topicals'],
  ];

  let query = '';
  let matrixFilter = '';

  /* lead with whichever cannabinoid actually dominates — "0 mg THC" tells a
     CBD customer nothing about what they are holding */
  const headlinePotency = (c) => {
    if (c.basis === 'percent') {
      const { total_thc_pct: thc, total_cbd_pct: cbd } = c.totals;
      return cbd > thc ? `${cbd}% CBD` : `${thc}% THC`;
    }
    const { total_thc_mg: thc, total_cbd_mg: cbd } = c.totals;
    const unit = c.unit_label || 'per unit';
    return cbd > thc ? `${cbd} mg CBD ${unit}` : `${thc} mg THC ${unit}`;
  };

  const allPass = (c) => c.safety.every((s) => s.result === 'Pass');

  /* ---------- index ---------- */

  const viewIndex = () => {
    const q = query.trim().toLowerCase();

    const rows = coas
      .filter((c) => (matrixFilter ? c.matrix === matrixFilter : true))
      .filter((c) =>
        q
          ? c.batch_id.toLowerCase().includes(q) ||
            c.product_title.toLowerCase().includes(q) ||
            c.verification_code.toLowerCase().includes(q)
          : true
      )
      .sort((a, b) => (a.sample.reported < b.sample.reported ? 1 : -1));

    const chips = MATRIX_FILTERS.map(
      ([value, label]) =>
        `<button class="chip" type="button" aria-pressed="${value === matrixFilter}" data-matrix="${escape(
          value
        )}">${escape(label)}</button>`
    ).join('');

    const body = rows.length
      ? rows
          .map((c) => {
            const p = productByHandle.get(c.product_handle);
            return `
        <tr>
          <td class="mono"><a href="#/lab-results/${escape(c.batch_id)}">${escape(c.batch_id)}</a></td>
          <td>
            <span class="lab-row__product">
              ${p && p.image ? `<img class="lab-row__thumb" src="${escape(p.image)}" alt="" loading="lazy">` : ''}
              ${escape(c.product_title)}
            </span>
          </td>
          <td class="muted">${escape(c.matrix_label)}</td>
          <td class="mono">${escape(headlinePotency(c))}</td>
          <td class="muted">${date(c.sample.reported)}</td>
          <td><span class="pill pill--${allPass(c) ? 'ok' : 'bad'}">${allPass(c) ? 'All panels pass' : 'Review'}</span></td>
          <td><a href="#/lab-results/${escape(c.batch_id)}">Certificate</a></td>
        </tr>`;
          })
          .join('')
      : `<tr><td colspan="7" class="muted lab-empty">No certificate matches “${escape(query)}”. Check the batch code on the packaging.</td></tr>`;

    return `
      <section class="section">
        <div class="container">
          <p class="eyebrow">Transparency</p>
          <h1 class="page-title">Lab results</h1>
          <p class="muted lead">
            Every batch is tested by an independent laboratory before release — cannabinoid
            potency, terpene profile, pesticides, heavy metals, microbials and mycotoxins.
            Certificates are filed by batch code, which is printed on your packaging.
          </p>

          <div class="lab-verify">
            <label class="form__field lab-verify__field">
              <span class="form__label">Verify a batch</span>
              <input
                class="form__input"
                type="search"
                id="lab-search"
                value="${escape(query)}"
                placeholder="e.g. DP-2607-A"
                autocomplete="off"
              >
            </label>
            <p class="muted lab-verify__hint">
              Type the batch code from your jar, tin or carton. If it does not appear here,
              do not consume the product — contact us.
            </p>
          </div>

          <div class="filters">${chips}</div>

          <div class="ds-scroll">
            <table class="table">
              <thead>
                <tr><th>Batch</th><th>Product</th><th>Matrix</th><th>Potency</th><th>Reported</th><th>Panels</th><th></th></tr>
              </thead>
              <tbody>${body}</tbody>
            </table>
          </div>

          <p class="notice lab-specimen">
            <strong>These are specimen certificates.</strong> They are structural placeholders
            generated from the catalogue to build and test these pages. They are not real
            laboratory reports and must be replaced with signed certificates from an
            accredited laboratory before this store accepts an order.
          </p>
        </div>
      </section>`;
  };

  /* ---------- certificate ---------- */

  const cannabinoidTable = (c) => {
    if (c.basis === 'percent') {
      const rows = c.cannabinoids
        .map(
          (r) => `
        <tr>
          <td>${escape(r.name)}</td>
          <td class="mono">${r.nd ? 'ND' : `${r.pct.toFixed(2)}%`}</td>
          <td class="mono">${r.nd ? '—' : `${r.mg_g.toFixed(1)}`}</td>
        </tr>`
        )
        .join('');

      return `
        <table class="table coa-table">
          <thead><tr><th>Analyte</th><th>Result (% w/w)</th><th>mg/g</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr class="coa-total">
              <td><strong>Total THC</strong> <span class="muted">(THCA × 0.877 + Δ9-THC)</span></td>
              <td class="mono"><strong>${c.totals.total_thc_pct.toFixed(2)}%</strong></td>
              <td class="mono">${(c.totals.total_thc_pct * 10).toFixed(1)}</td>
            </tr>
            <tr class="coa-total">
              <td><strong>Total CBD</strong> <span class="muted">(CBDA × 0.877 + CBD)</span></td>
              <td class="mono"><strong>${c.totals.total_cbd_pct.toFixed(2)}%</strong></td>
              <td class="mono">${(c.totals.total_cbd_pct * 10).toFixed(1)}</td>
            </tr>
            <tr>
              <td class="muted">Total cannabinoids</td>
              <td class="mono muted">${c.totals.total_cannabinoids_pct.toFixed(2)}%</td>
              <td></td>
            </tr>
          </tfoot>
        </table>`;
    }

    const rows = c.cannabinoids
      .map(
        (r) => `
      <tr>
        <td>${escape(r.name)}</td>
        <td class="mono">${r.mg.toFixed(2)} mg</td>
      </tr>`
      )
      .join('');

    return `
      <table class="table coa-table">
        <thead><tr><th>Analyte</th><th>Result (${escape(c.unit_label || 'per unit')})</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr class="coa-total">
            <td><strong>Total THC</strong> <span class="muted">(THCA × 0.877 + Δ9-THC)</span></td>
            <td class="mono"><strong>${c.totals.total_thc_mg.toFixed(2)} mg</strong></td>
          </tr>
          <tr class="coa-total">
            <td><strong>Total CBD</strong></td>
            <td class="mono"><strong>${c.totals.total_cbd_mg.toFixed(2)} mg</strong></td>
          </tr>
          <tr>
            <td class="muted">Total THC per pack (${c.totals.units_per_pack} ${
      c.totals.units_per_pack === 1 ? 'unit' : 'units'
    })</td>
            <td class="mono muted">${c.totals.total_thc_pack_mg.toFixed(1)} mg</td>
          </tr>
        </tfoot>
      </table>`;
  };

  const viewCertificate = (batchId) => {
    const c = byBatch.get(batchId);
    if (!c) {
      return `
        <section class="section">
          <div class="container narrow">
            <h1 class="page-title">No certificate for “${escape(batchId)}”</h1>
            <p class="muted">
              That batch code is not on file. Check it against your packaging — if it is
              correct and still does not appear, do not consume the product and contact us.
            </p>
            <a class="btn btn--primary" href="#/lab-results">All lab results</a>
          </div>
        </section>`;
    }

    const p = productByHandle.get(c.product_handle);

    const terpeneRows = c.terpenes
      .map(
        (t) => `
      <tr>
        <td>${escape(t.name)}</td>
        <td class="mono">${t.mg_g.toFixed(2)}</td>
        <td class="mono">${t.pct.toFixed(3)}%</td>
      </tr>`
      )
      .join('');

    const safetyRows = c.safety
      .map(
        (s) => `
      <tr>
        <td>
          <strong>${escape(s.panel)}</strong>
          <span class="muted coa-method">${escape(s.method)}${s.analytes ? ` · ${s.analytes} analytes` : ''}</span>
        </td>
        <td class="muted coa-detail">${escape(s.detail)}</td>
        <td><span class="pill pill--${s.result === 'Pass' ? 'ok' : 'bad'}">${escape(s.result)}</span></td>
      </tr>`
      )
      .join('');

    const physical =
      c.moisture_pct !== undefined
        ? `
      <div class="coa-block">
        <h2 class="coa-h2">Physical</h2>
        <table class="table coa-table">
          <tbody>
            <tr><td>Moisture content</td><td class="mono">${c.moisture_pct.toFixed(1)}%</td><td><span class="pill pill--ok">Pass</span></td></tr>
            <tr><td>Water activity (a<sub>w</sub>)</td><td class="mono">${c.water_activity.toFixed(2)}</td><td><span class="pill pill--ok">Pass</span></td></tr>
          </tbody>
        </table>
        <p class="muted coa-note">
          Water activity below 0.65 inhibits mould growth. Moisture above 13% risks
          microbial spoilage; below 8% degrades the terpene profile.
        </p>
      </div>`
        : '';

    return `
      <section class="section">
        <div class="container">
          <p class="coa-back"><a href="#/lab-results">← All lab results</a></p>

          <div class="coa-specimen" role="note">
            <strong>SPECIMEN — not a real laboratory report.</strong>
            Generated from the catalogue to build and test this page. Replace with a signed
            certificate from an accredited laboratory before publishing.
          </div>

          <article class="coa">
            <header class="coa-head">
              <div>
                <p class="eyebrow">Certificate of analysis</p>
                <h1 class="coa-title">${escape(c.product_title)}</h1>
                <p class="muted coa-sub">
                  Batch <span class="mono">${escape(c.batch_id)}</span> ·
                  ${escape(c.matrix_label)} ·
                  SKU <span class="mono">${escape(c.sku)}</span>
                </p>
              </div>
              <div class="coa-verdict">
                <span class="pill pill--${allPass(c) ? 'ok' : 'bad'}">${
      allPass(c) ? 'All panels pass' : 'Review required'
    }</span>
                <button class="btn btn--ghost coa-print" type="button" data-print>Print</button>
              </div>
            </header>

            <div class="coa-meta">
              <div>
                <h2 class="coa-h3">Laboratory</h2>
                <p>${escape(c.lab.name)}</p>
                <p class="muted">${escape(c.lab.address)}</p>
                <p class="muted">${escape(c.lab.accreditation)}</p>
                <p class="muted">${escape(c.lab.scope)}</p>
              </div>
              <div>
                <h2 class="coa-h3">Sample</h2>
                <dl class="coa-dl">
                  <div><dt>Lab sample ID</dt><dd class="mono">${escape(c.sample.lab_sample_id)}</dd></div>
                  <div><dt>Received</dt><dd>${date(c.sample.received)}</dd></div>
                  <div><dt>Tested</dt><dd>${date(c.sample.tested)}</dd></div>
                  <div><dt>Reported</dt><dd>${date(c.sample.reported)}</dd></div>
                  <div><dt>Sample size</dt><dd>${escape(c.sample.sample_size)}</dd></div>
                  <div><dt>Batch size</dt><dd>${escape(c.sample.batch_size)}</dd></div>
                </dl>
              </div>
            </div>

            <div class="coa-block">
              <h2 class="coa-h2">Cannabinoid profile</h2>
              ${cannabinoidTable(c)}
              <p class="muted coa-note">
                ND = not detected above the limit of quantitation. Acid forms are converted
                to their neutral equivalents using the 0.877 molecular-weight factor, which
                is what the listed potency on the product page reflects.
              </p>
            </div>

            <div class="coa-block">
              <h2 class="coa-h2">Terpene profile</h2>
              <table class="table coa-table">
                <thead><tr><th>Terpene</th><th>mg/g</th><th>% w/w</th></tr></thead>
                <tbody>${terpeneRows}</tbody>
              </table>
            </div>

            <div class="coa-block">
              <h2 class="coa-h2">Contaminant screening</h2>
              <table class="table coa-table coa-safety">
                <thead><tr><th>Panel</th><th>Findings</th><th>Result</th></tr></thead>
                <tbody>${safetyRows}</tbody>
              </table>
            </div>

            ${physical}

            <footer class="coa-foot">
              <div>
                <h2 class="coa-h3">Methods</h2>
                <p class="muted">${escape(c.sample.methods)}</p>
              </div>
              <div>
                <h2 class="coa-h3">Authorised by</h2>
                <p>${escape(c.analyst)}</p>
                <p class="muted">Verification code <span class="mono">${escape(c.verification_code)}</span></p>
              </div>
            </footer>

            <p class="muted coa-disclaimer">
              This certificate relates only to the sample tested. Results apply to batch
              ${escape(c.batch_id)} and may not be reproduced except in full.
              Nothing in this document is a medical claim.
            </p>
          </article>

          ${
            p
              ? `<p class="coa-product"><a href="#/product/${escape(p.handle)}">← Back to ${escape(p.title)}</a></p>`
              : ''
          }
        </div>
      </section>`;
  };

  /* ---------- events ---------- */

  const app = document.getElementById('app');

  app.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-matrix]');
    if (chip) {
      matrixFilter = chip.dataset.matrix;
      window.HB_RENDER();
      const input = document.getElementById('lab-search');
      if (input) input.focus();
      return;
    }

    if (event.target.closest('[data-print]')) {
      window.print();
    }
  });

  app.addEventListener('input', (event) => {
    if (event.target.id !== 'lab-search') return;
    query = event.target.value;
    window.HB_RENDER();
    const input = document.getElementById('lab-search');
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  });

  window.HB_LAB = {
    route(parts) {
      if (parts[0] !== 'lab-results') return null;
      return parts[1] ? viewCertificate(decodeURIComponent(parts[1])) : viewIndex();
    },
  };
})();
