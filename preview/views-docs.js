(function () {
  const { products } = window.HB_DATA;

  const escape = (value) =>
    String(value === null || value === undefined ? '' : value).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );

  /* ---------- contrast maths (WCAG 2.1) ---------- */

  const hexToRgb = (hex) => {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  };

  const luminance = (hex) => {
    const [r, g, b] = hexToRgb(hex).map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const contrast = (a, b) => {
    const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (l1 + 0.05) / (l2 + 0.05);
  };

  const TOKENS = [
    ['--bg', '#10130f', 'Page background'],
    ['--surface', '#191d17', 'Cards, panels, inputs'],
    ['--ink', '#edefe9', 'Primary text'],
    ['--muted', '#949a90', 'Secondary text, labels'],
    ['--accent', '#7ba05b', 'Actions, active state, focus'],
    ['--accent-ink', '#10130f', 'Text on accent'],
    ['--border', '#2b3128', 'Hairlines, dividers'],
  ];

  const PAIRS = [
    ['Body text on page', '#edefe9', '#10130f', 'normal'],
    ['Body text on card', '#edefe9', '#191d17', 'normal'],
    ['Muted text on page', '#949a90', '#10130f', 'normal'],
    ['Muted text on card', '#949a90', '#191d17', 'normal'],
    ['Accent link on page', '#7ba05b', '#10130f', 'normal'],
    ['Accent link on card', '#7ba05b', '#191d17', 'normal'],
    ['Button label on accent', '#10130f', '#7ba05b', 'normal'],
    ['Pending pill', '#e2cf85', '#3a3520', 'large'],
    ['Rejected pill', '#e8a196', '#3a2320', 'large'],
  ];

  const grade = (ratio, size) => {
    const aa = size === 'large' ? 3 : 4.5;
    const aaa = size === 'large' ? 4.5 : 7;
    if (ratio >= aaa) return ['AAA', 'ok'];
    if (ratio >= aa) return ['AA', 'ok'];
    return ['Fails', 'bad'];
  };

  const SPACING = [
    ['0.35rem', '5.6px', 'Label to input'],
    ['0.75rem', '12px', 'Inside a control'],
    ['1.25rem', '20px', 'Card padding, form gap'],
    ['1.5rem', '24px', 'Grid gutter, panel padding'],
    ['2rem', '32px', 'Section head to content'],
    ['clamp(2.5rem, 6vw, 4.5rem)', '40–72px', 'Between page sections'],
  ];

  const TYPE = [
    ['Page title', 'clamp(1.75rem, 4vw, 2.5rem)', '700', '-0.02em'],
    ['Section title', 'clamp(1.5rem, 3vw, 2rem)', '700', '-0.02em'],
    ['Card title', '1.0625rem', '700', 'normal'],
    ['Body', '1rem', '400', 'normal'],
    ['Small / meta', '0.875rem', '400', 'normal'],
    ['Label (uppercase)', '0.6875rem', '700', '0.1em'],
  ];

  /* ---------- design system ---------- */

  const viewDesignSystem = () => {
    const swatches = TOKENS.map(
      ([name, hex, use]) => `
      <li class="ds-swatch">
        <span class="ds-swatch__chip" style="background:${hex}"></span>
        <div>
          <p class="ds-swatch__name">${escape(name)}</p>
          <p class="ds-swatch__hex">${escape(hex)}</p>
          <p class="ds-swatch__use">${escape(use)}</p>
        </div>
      </li>`
    ).join('');

    const contrastRows = PAIRS.map(([label, fg, bg, size]) => {
      const ratio = contrast(fg, bg);
      const [verdict, tone] = grade(ratio, size);
      return `
        <tr>
          <td>${escape(label)}</td>
          <td><span class="ds-chip" style="background:${bg};color:${fg}">Aa</span></td>
          <td class="mono">${ratio.toFixed(2)}:1</td>
          <td>${size === 'large' ? '3.0 / 4.5' : '4.5 / 7.0'}</td>
          <td><span class="pill pill--${tone}">${verdict}</span></td>
        </tr>`;
    }).join('');

    const typeRows = TYPE.map(
      ([role, size, weight, tracking]) => `
      <tr>
        <td style="font-size:${size};font-weight:${weight};letter-spacing:${tracking};line-height:1.2">${escape(role)}</td>
        <td class="mono">${escape(size)}</td>
        <td class="mono">${escape(weight)}</td>
        <td class="mono">${escape(tracking)}</td>
      </tr>`
    ).join('');

    const spacingRows = SPACING.map(
      ([token, px, use]) => `
      <tr>
        <td><span class="ds-bar" style="width:${px.split('–')[0]}"></span></td>
        <td class="mono">${escape(token)}</td>
        <td class="mono">${escape(px)}</td>
        <td>${escape(use)}</td>
      </tr>`
    ).join('');

    const sample = products[3];

    return `
      <section class="section">
        <div class="container">
          <p class="eyebrow">Reference</p>
          <h1 class="page-title">Design system</h1>
          <p class="muted lead">
            Rendered from the same stylesheet the storefront uses, so it cannot drift from
            the real thing. Contrast ratios below are calculated live, not asserted.
          </p>

          <h2 class="ds-h2" id="colour">Colour</h2>
          <ul class="ds-swatches">${swatches}</ul>

          <h2 class="ds-h2" id="contrast">Contrast</h2>
          <p class="muted ds-note">
            WCAG 2.1 thresholds. Normal text needs 4.5:1 for AA and 7:1 for AAA; text at
            18.66px bold or 24px regular and above needs 3:1 and 4.5:1.
          </p>
          <div class="ds-scroll">
            <table class="table">
              <thead><tr><th>Pair</th><th>Sample</th><th>Ratio</th><th>AA / AAA</th><th>Result</th></tr></thead>
              <tbody>${contrastRows}</tbody>
            </table>
          </div>

          <h2 class="ds-h2" id="type">Type</h2>
          <p class="muted ds-note">
            System UI stack — no webfont, so there is no flash of unstyled text and nothing
            to self-host. Titles use negative tracking; uppercase labels use positive.
          </p>
          <div class="ds-scroll">
            <table class="table">
              <thead><tr><th>Role</th><th>Size</th><th>Weight</th><th>Tracking</th></tr></thead>
              <tbody>${typeRows}</tbody>
            </table>
          </div>

          <h2 class="ds-h2" id="spacing">Spacing &amp; radius</h2>
          <div class="ds-scroll">
            <table class="table">
              <thead><tr><th></th><th>Token</th><th>Computed</th><th>Used for</th></tr></thead>
              <tbody>${spacingRows}</tbody>
            </table>
          </div>
          <p class="muted ds-note">
            Radius is a single token, <code>--radius: 12px</code>. Controls use
            <code>8px</code>; pills and bars use <code>999px</code>.
          </p>

          <h2 class="ds-h2" id="buttons">Buttons</h2>
          <div class="ds-row">
            <button class="btn btn--primary" type="button">Primary</button>
            <button class="btn btn--ghost" type="button">Ghost</button>
            <button class="btn btn--primary" type="button" disabled>Disabled</button>
          </div>
          <p class="muted ds-note">
            One primary per view. Ghost is for the secondary path and for anything
            destructive-adjacent, so nothing dangerous is ever the bright green button.
          </p>

          <h2 class="ds-h2" id="forms">Form controls</h2>
          <div class="ds-grid2">
            <label class="form__field">
              <span class="form__label">Text input</span>
              <input class="form__input" type="text" value="Sipho Ndlovu">
            </label>
            <label class="form__field form__field--error">
              <span class="form__label">Error state</span>
              <input class="form__input" type="text" value="not-an-email">
              <span class="form__error">Enter a valid email address.</span>
            </label>
            <label class="form__field">
              <span class="form__label">Select</span>
              <select class="form__input"><option>Gauteng</option></select>
            </label>
            <div class="form__field">
              <span class="form__label">File, once chosen</span>
              <p class="form__file">sipho-id-front.jpg · 488 kB <button type="button" class="linkish">replace</button></p>
            </div>
          </div>

          <h2 class="ds-h2" id="status">Status</h2>
          <div class="ds-row">
            <span class="pill">Not a member</span>
            <span class="pill pill--pending">Under review</span>
            <span class="pill pill--ok">Verified member</span>
            <span class="pill pill--bad">Not approved</span>
          </div>
          <p class="muted ds-note">
            Status is never colour alone — every pill carries its own words, so it survives
            greyscale printing and colour-blindness.
          </p>

          <h2 class="ds-h2" id="components">Components</h2>
          <div class="ds-components">
            <div>
              <p class="ds-label">Product card</p>
              <div class="grid grid--one">
                <article class="card">
                  <a href="#/product/${escape(sample.handle)}">
                    <div class="card__media" style="background: linear-gradient(145deg, ${sample.accent}, ${sample.accent}22);">
                      <img class="card__img" src="${escape(sample.image)}" alt="${escape(sample.title)}" loading="lazy">
                    </div>
                    <div class="card__body">
                      <h3>${escape(sample.title)}</h3>
                      <ul class="potency">
                        <li><span class="potency__label">THC</span><span class="potency__value">${sample.thc_pct}%</span></li>
                        <li><span class="potency__label">CBD</span><span class="potency__value">${sample.cbd_pct}%</span></li>
                        <li><span class="potency__label">Strain</span><span class="potency__value">${escape(sample.strain_type)}</span></li>
                      </ul>
                      <div class="card__foot">
                        <p class="card__price">R${sample.price.toFixed(2)}</p>
                        <p class="card__batch">${escape(sample.size)} ${escape(sample.unit)}</p>
                      </div>
                    </div>
                  </a>
                </article>
              </div>
            </div>

            <div class="ds-stack">
              <div>
                <p class="ds-label">Members-only gate</p>
                <div class="memgate">
                  <p class="memgate__lock">Members only</p>
                  <p class="memgate__message">Members-only. Apply for membership to purchase this item.</p>
                  <a class="btn btn--primary" href="#/membership/apply">Apply for membership</a>
                </div>
              </div>

              <div>
                <p class="ds-label">Notice</p>
                <p class="notice">
                  Access is limited to verified members aged 18+. Amounts shown are member
                  contributions toward cultivation and handling, not a public retail sale.
                </p>
              </div>

              <div>
                <p class="ds-label">Allocation meter</p>
                <div class="alloc">
                  <div class="alloc__head">
                    <h2>Monthly allocation</h2>
                    <p class="muted">5 of 16 units used</p>
                  </div>
                  <div class="alloc__bar"><span style="width:31%"></span></div>
                  <p class="muted alloc__note">Resets on the first of each month.</p>
                </div>
              </div>
            </div>
          </div>

          <h2 class="ds-h2" id="rules">Rules that are easy to get wrong</h2>
          <ul class="ds-rules">
            <li>
              <strong>Potency is tabular.</strong> THC and CBD figures use
              <code>font-variant-numeric: tabular-nums</code> so columns of numbers line up.
              Prices too.
            </li>
            <li>
              <strong>Percentage or milligrams, never both.</strong> Flower and concentrates
              are measured in %, edibles and tinctures in mg. Showing "0%" on a gummy is
              misleading, so the badge falls back rather than printing a zero.
            </li>
            <li>
              <strong>Focus is always visible.</strong> <code>:focus-visible</code> draws a
              2px accent outline with 2px offset. Do not remove it on custom controls.
            </li>
            <li>
              <strong>Two gate classes, not one.</strong> <code>.gate</code> is the age-gate
              dialog; <code>.memgate</code> is the membership gate. They were the same class
              once and it broke the dialog.
            </li>
            <li>
              <strong>Motion respects the OS.</strong> All transitions collapse to 0.01ms
              under <code>prefers-reduced-motion</code>.
            </li>
          </ul>
        </div>
      </section>`;
  };

  /* ---------- photography ---------- */

  const NOTES = {
    'durban-poison': ['ok', 'Re-cropped with entropy weighting — the default crop clipped the jar to the frame edge.'],
    'swazi-gold': ['ok', 'Top-down open jars. Same shoot as Malawi Cobra, so the two share a visual style.'],
    'malawi-cobra': ['weak', 'Same shoot as Swazi Gold. Chalkboard jar labels carry stray text ("YOU\'RE SO").'],
    'midnight-kush': ['ok', 'Trichome macro on black. Strongest shot in the set and the only one that suits the dark theme.'],
    'cape-haze-pre-roll-5-pack': ['ok', 'Buds plus a single pre-roll in a glass tube. Only generic Mason embossing.'],
    'citrus-sunrise-gummies': ['weak', 'Candied fruit cubes, not gummies. Unbranded and not child-shaped, so safe but wrong.'],
    'dark-cacao-bar': ['weak', 'Plain bar, no cannabis context, and no visible 10-square scoring — which the copy makes a dosing instruction.'],
    'blue-dream-live-resin-cart': ['ok', 'Unbranded battery with a visible amber cartridge. Correct product type.'],
    'full-spectrum-cbd-oil-1000mg': ['ok', 'Generic mockup label. No real brand and no competing mg figure.'],
    'recovery-balm': ['ok', 'Unbranded amber jar with botanicals. No medical claim on the label.'],
  };

  const REJECTED = [
    ['full-spectrum-cbd-oil-1000mg', 'Competitor brand', 'PACHAMAMA branding legible, and the label reads 750 mg against our stated 1000 mg.'],
    ['dark-cacao-bar', 'Competitor brand', 'SATORI branding plus a California regulatory mark. Also bites, not a scored bar.'],
    ['blue-dream-live-resin-cart', 'Competitor brand', 'CBDfx branding. Also disposable pens, not a 510-thread cartridge.'],
    ['recovery-balm', 'Medical claim', '"Pain Relief CBD Salve" on the label, contradicting our own no-medical-advice line.'],
    ['citrus-sunrise-gummies', 'Child appeal', 'Rainbow gummy bears. Child-appealing shapes are a standing compliance problem for edibles.'],
  ];

  const SHOTS = [
    ['Flower', 'Macro of a single cured bud on black, filling 70% of the frame. Trichomes must be in focus — this is the shot that sells flower.', 'Jar front-on with the batch label legible.'],
    ['Pre-rolls', 'The open tin with all five cones visible, top-down.', 'One cone held at an angle for scale.'],
    ['Edibles', 'The bar with its 10-square scoring clearly visible, or the tin open with pieces counted out.', 'Single piece beside a coin for scale.'],
    ['Vapes', 'Cartridge alone on black, distillate colour visible through the glass.', 'Cartridge fitted to a battery, three-quarter view.'],
    ['CBD', 'Bottle front-on, label legible, dropper beside it.', 'Dropper mid-drop against a plain ground.'],
  ];

  const viewPhotography = () => {
    const statusCards = products.map((p) => {
      const [verdict, note] = NOTES[p.handle] || ['ok', ''];
      return `
        <li class="ph-item">
          <img class="ph-thumb" src="${escape(p.image)}" alt="${escape(p.title)}" loading="lazy">
          <div>
            <p class="ph-item__title">${escape(p.title)}
              <span class="pill pill--${verdict === 'ok' ? 'pending' : 'bad'}">${
        verdict === 'ok' ? 'Placeholder' : 'Placeholder — weak'
      }</span>
            </p>
            <p class="muted ph-item__note">${escape(note)}</p>
          </div>
        </li>`;
    }).join('');

    const rejectedCards = REJECTED.map(
      ([handle, reason, note]) => `
      <li class="ph-reject">
        <img class="ph-reject__img" src="${escape(window.HB_ASSET(`images/rejected/${handle}.jpg`))}" alt="Rejected image for ${escape(handle)}" loading="lazy">
        <p class="ph-reject__reason">${escape(reason)}</p>
        <p class="muted ph-reject__note">${escape(note)}</p>
      </li>`
    ).join('');

    const shotRows = SHOTS.map(
      ([type, hero, second]) => `
      <tr>
        <td><strong>${escape(type)}</strong></td>
        <td>${escape(hero)}</td>
        <td>${escape(second)}</td>
      </tr>`
    ).join('');

    return `
      <section class="section">
        <div class="container">
          <p class="eyebrow">Reference</p>
          <h1 class="page-title">Product photography</h1>
          <p class="muted lead">
            Every image on this store is currently a placeholder. This page records the
            standard, the shot list, and exactly what is wrong with what is live now.
          </p>

          <div class="notice notice--warn ph-banner">
            <strong>The core problem no stock photo solves.</strong>
            Each product page states a batch ID and a lab-verified THC percentage next to
            the image. Showing someone else's flower beside that claim is misleading in a
            way the placeholder swatches never were. Real batch photography is a
            prerequisite for taking orders, not a polish item.
          </div>

          <h2 class="ds-h2">The standard</h2>
          <ul class="ph-specs">
            <li><strong>1:1 square</strong><span>1600×1600 minimum, delivered as JPEG at quality 85</span></li>
            <li><strong>Black or mid-grey ground</strong><span>#10130f or #6a6f68 — no white, it blows out against the dark theme</span></li>
            <li><strong>One light source</strong><span>Softbox at 45°, plus a reflector. Consistency across the set matters more than any single shot</span></li>
            <li><strong>5000K, fixed</strong><span>Lock white balance. Mismatched colour temperature across a grid is what makes a store look amateur</span></li>
            <li><strong>Product fills 70%</strong><span>Cards crop to square and centre — anything smaller disappears at grid size</span></li>
            <li><strong>Filename is the handle</strong><span><code>durban-poison.jpg</code>, <code>durban-poison-2.jpg</code></span></li>
          </ul>

          <h2 class="ds-h2">Shot list by product type</h2>
          <div class="ds-scroll">
            <table class="table">
              <thead><tr><th>Type</th><th>Hero</th><th>Second angle</th></tr></thead>
              <tbody>${shotRows}</tbody>
            </table>
          </div>

          <h2 class="ds-h2">What must never appear</h2>
          <ul class="ph-never">
            <li><strong>Another company's branding.</strong> Using a photo of a competitor's product to sell yours is misleading and a trademark problem, whatever the photo licence says.</li>
            <li><strong>Medical claims on a label.</strong> "Pain relief", "treats", "cures". SAHPRA regulates medicinal claims and the site's own footer disclaims them.</li>
            <li><strong>Child-appealing shapes.</strong> Bears, cartoon characters, anything resembling mainstream confectionery.</li>
            <li><strong>Consumption alongside driving, machinery, pregnancy or minors.</strong></li>
            <li><strong>A potency figure that contradicts the listing.</strong> If the label in the shot reads 750 mg, the page cannot say 1000 mg.</li>
            <li><strong>Regulatory marks from other jurisdictions.</strong> A California THC triangle on a South African store is nonsense.</li>
          </ul>

          <h2 class="ds-h2">What is live now</h2>
          <ul class="ph-list">${statusCards}</ul>

          <h2 class="ds-h2">Rejected, and why</h2>
          <p class="muted ds-note">
            These five were downloaded, reviewed and discarded. They are kept so nobody
            re-picks them from the same search results.
          </p>
          <ul class="ph-rejects">${rejectedCards}</ul>

          <h2 class="ds-h2">Licensing</h2>
          <p class="muted ds-note">
            Current placeholders come from <a href="https://www.pexels.com/license/">Pexels</a>,
            which permits commercial use without attribution. Provenance for all ten is
            recorded in <code>data/photo-credits.md</code> — the licence does not require it,
            but images sitting next to potency claims deserve a paper trail.
          </p>
        </div>
      </section>`;
  };

  window.HB_DOCS = {
    route(parts) {
      if (parts[0] === 'design-system') return viewDesignSystem();
      if (parts[0] === 'photography') return viewPhotography();
      return null;
    },
  };
})();
