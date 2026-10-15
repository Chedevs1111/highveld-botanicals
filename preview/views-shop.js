(function () {
  const { store, products, categories } = window.HB_DATA;

  const escape = (value) =>
    String(value === null || value === undefined ? '' : value).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );

  const money = (v) => `${store.currency_symbol}${v.toFixed(2)}`;

  /**
   * Potency bands, because the catalogue mixes units. Flower and extracts are
   * measured in %, edibles and tinctures in mg — a single slider over both would
   * be meaningless.
   */
  const POTENCY = [
    { id: 'none', label: 'Non-intoxicating', test: (p) => !p.thc_pct && !p.thc_mg },
    { id: 'dose', label: 'Measured dose (mg)', test: (p) => p.thc_mg > 0 },
    { id: 'low', label: 'Under 20% THC', test: (p) => p.thc_pct > 0 && p.thc_pct < 20 },
    { id: 'high', label: '20–50% THC', test: (p) => p.thc_pct >= 20 && p.thc_pct < 50 },
    { id: 'conc', label: 'Concentrate, 50%+', test: (p) => p.thc_pct >= 50 },
  ];

  const SORTS = [
    ['featured', 'Featured'],
    ['price-asc', 'Price, low to high'],
    ['price-desc', 'Price, high to low'],
    ['potency-desc', 'Strongest first'],
    ['name-asc', 'Name, A–Z'],
  ];

  const uniqueSorted = (key) =>
    [...new Set(products.flatMap((p) => (Array.isArray(p[key]) ? p[key] : [p[key]])))]
      .filter(Boolean)
      .sort();

  /* ---------- filter state lives entirely in the URL ---------- */

  const readState = (parts, query) => ({
    cat: query.get('cat') || parts[1] || '',
    strain: query.getAll('strain'),
    effect: query.getAll('effect'),
    terp: query.getAll('terp'),
    potency: query.getAll('potency'),
    tier: query.get('tier') || '',
    stock: query.get('stock') === '1',
    pmin: query.get('pmin') ? Number(query.get('pmin')) : null,
    pmax: query.get('pmax') ? Number(query.get('pmax')) : null,
    sort: query.get('sort') || 'featured',
    q: query.get('q') || '',
  });

  const toHash = (s) => {
    const p = new URLSearchParams();
    if (s.cat) p.set('cat', s.cat);
    s.strain.forEach((v) => p.append('strain', v));
    s.effect.forEach((v) => p.append('effect', v));
    s.terp.forEach((v) => p.append('terp', v));
    s.potency.forEach((v) => p.append('potency', v));
    if (s.tier) p.set('tier', s.tier);
    if (s.stock) p.set('stock', '1');
    if (s.pmin !== null) p.set('pmin', String(s.pmin));
    if (s.pmax !== null) p.set('pmax', String(s.pmax));
    if (s.sort && s.sort !== 'featured') p.set('sort', s.sort);
    if (s.q) p.set('q', s.q);
    const qs = p.toString();
    return `#/shop${qs ? `?${qs}` : ''}`;
  };

  const apply = (s) => {
    const q = s.q.trim().toLowerCase();

    let list = products.filter((p) => {
      if (s.cat && p.category !== s.cat) return false;
      if (s.strain.length && !s.strain.includes(p.strain_type)) return false;
      if (s.effect.length && !s.effect.some((e) => p.effects.includes(e))) return false;
      if (s.terp.length && !s.terp.some((t) => p.terpenes.includes(t))) return false;
      if (s.potency.length) {
        const bands = POTENCY.filter((b) => b.test(p)).map((b) => b.id);
        if (!s.potency.some((b) => bands.includes(b))) return false;
      }
      if (s.tier === 'open' && p.member_tier !== 'open') return false;
      if (s.tier === 'members' && p.member_tier === 'open') return false;
      if (s.stock && p.stock === 0) return false;
      if (s.pmin !== null && p.price < s.pmin) return false;
      if (s.pmax !== null && p.price > s.pmax) return false;
      if (q) {
        const hay = [p.title, p.type, p.strain_type, p.lineage, p.batch_id, ...p.terpenes, ...p.effects]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const strength = (p) => (p.thc_pct != null ? p.thc_pct : (p.thc_mg || 0) / 10);

    if (s.sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
    if (s.sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);
    if (s.sort === 'potency-desc') list = [...list].sort((a, b) => strength(b) - strength(a));
    if (s.sort === 'name-asc') list = [...list].sort((a, b) => a.title.localeCompare(b.title));

    return list;
  };

  /* ---------- chips describing what is currently applied ---------- */

  const activeChips = (s) => {
    const chips = [];
    const push = (key, value, label) => chips.push({ key, value, label });

    if (s.cat) {
      const c = categories.find((x) => x.handle === s.cat);
      push('cat', s.cat, c ? c.title : s.cat);
    }
    s.strain.forEach((v) => push('strain', v, v));
    s.effect.forEach((v) => push('effect', v, v));
    s.terp.forEach((v) => push('terp', v, v));
    s.potency.forEach((v) => {
      const b = POTENCY.find((x) => x.id === v);
      push('potency', v, b ? b.label : v);
    });
    if (s.tier) push('tier', s.tier, s.tier === 'open' ? 'No membership needed' : 'Members only');
    if (s.stock) push('stock', '1', 'In stock');
    if (s.pmin !== null) push('pmin', String(s.pmin), `From ${money(s.pmin)}`);
    if (s.pmax !== null) push('pmax', String(s.pmax), `Up to ${money(s.pmax)}`);
    if (s.q) push('q', s.q, `“${s.q}”`);
    return chips;
  };

  const facetGroup = (title, name, options, selected, counts) => `
    <details class="facet" ${selected.length ? 'open' : ''}>
      <summary class="facet__summary">
        ${escape(title)}${selected.length ? ` <span class="facet__count">${selected.length}</span>` : ''}
      </summary>
      <div class="facet__body">
        ${options
          .map(
            (o) => `
          <label class="facet__opt${counts[o.value] === 0 ? ' facet__opt--empty' : ''}">
            <input type="checkbox" data-facet="${escape(name)}" value="${escape(o.value)}" ${
              selected.includes(o.value) ? 'checked' : ''
            }>
            <span>${escape(o.label)}</span>
            <span class="facet__n">${counts[o.value] ?? 0}</span>
          </label>`
          )
          .join('')}
      </div>
    </details>`;

  /* ---------- view ---------- */

  const viewShop = (parts, query) => {
    const s = readState(parts, query);
    const results = apply(s);
    const chips = activeChips(s);
    const current = categories.find((c) => c.handle === s.cat);

    // counts are computed against the other facets, so a zero means "adding this
    // narrows to nothing" rather than "this value does not exist"
    const countFor = (name, value) => {
      const probe = { ...s, [name]: name === 'cat' || name === 'tier' ? value : [...s[name], value] };
      if (Array.isArray(s[name]) && s[name].includes(value)) probe[name] = s[name];
      return apply(probe).length;
    };

    const counts = (name, values) =>
      Object.fromEntries(values.map((v) => [v, countFor(name, v)]));

    const strainValues = uniqueSorted('strain_type');
    const effectValues = uniqueSorted('effects');
    const terpValues = uniqueSorted('terpenes');

    const prices = products.map((p) => p.price);
    const floor = Math.floor(Math.min(...prices) / 50) * 50;
    const ceil = Math.ceil(Math.max(...prices) / 50) * 50;

    return `
      <section class="section">
        <div class="container">
          <div class="section__head">
            <div>
              <p class="eyebrow">${escape(current ? 'Collection' : 'Shop')}</p>
              <h1 class="page-title">${escape(current ? current.title : 'The collection')}</h1>
              <p class="muted">${escape(
                current ? current.blurb : 'Everything currently in stock, across all categories.'
              )}</p>
            </div>
          </div>

          <div class="shop">
            <aside class="shop__facets">
              <div class="shop__facets-head">
                <h2 class="ds-label">Filter</h2>
                ${chips.length ? '<button class="linkish" type="button" data-clear-all>Clear all</button>' : ''}
              </div>

              <label class="form__field">
                <span class="form__label">Search products</span>
                <input class="form__input" type="search" id="shop-q" value="${escape(
                  s.q
                )}" placeholder="strain, terpene, batch…" autocomplete="off">
              </label>

              ${facetGroup(
                'Category',
                'cat',
                categories.map((c) => ({ value: c.handle, label: c.title })),
                s.cat ? [s.cat] : [],
                counts('cat', categories.map((c) => c.handle))
              )}

              ${facetGroup(
                'Strain type',
                'strain',
                strainValues.map((v) => ({ value: v, label: v })),
                s.strain,
                counts('strain', strainValues)
              )}

              ${facetGroup(
                'Potency',
                'potency',
                POTENCY.map((b) => ({ value: b.id, label: b.label })),
                s.potency,
                counts('potency', POTENCY.map((b) => b.id))
              )}

              ${facetGroup(
                'Reported effects',
                'effect',
                effectValues.map((v) => ({ value: v, label: v })),
                s.effect,
                counts('effect', effectValues)
              )}

              ${facetGroup(
                'Terpenes',
                'terp',
                terpValues.map((v) => ({ value: v, label: v })),
                s.terp,
                counts('terp', terpValues)
              )}

              ${facetGroup(
                'Access',
                'tier',
                [
                  { value: 'open', label: 'No membership needed' },
                  { value: 'members', label: 'Members only' },
                ],
                s.tier ? [s.tier] : [],
                counts('tier', ['open', 'members'])
              )}

              <div class="facet facet--static">
                <p class="facet__summary">Price</p>
                <div class="facet__body">
                  <div class="pricerow">
                    <label>
                      <span class="form__label">From</span>
                      <input class="form__input" type="number" id="pmin" min="${floor}" max="${ceil}" step="50"
                             value="${s.pmin ?? ''}" placeholder="${floor}">
                    </label>
                    <label>
                      <span class="form__label">To</span>
                      <input class="form__input" type="number" id="pmax" min="${floor}" max="${ceil}" step="50"
                             value="${s.pmax ?? ''}" placeholder="${ceil}">
                    </label>
                  </div>
                  <label class="facet__opt">
                    <input type="checkbox" id="instock" ${s.stock ? 'checked' : ''}>
                    <span>In stock only</span>
                  </label>
                </div>
              </div>
            </aside>

            <div class="shop__results">
              <div class="shop__bar">
                <p class="muted shop__count">
                  ${results.length} of ${products.length} product${products.length === 1 ? '' : 's'}
                </p>
                <label class="shop__sort">
                  <span class="form__label">Sort</span>
                  <select class="form__input" id="shop-sort">
                    ${SORTS.map(
                      ([v, l]) => `<option value="${v}"${s.sort === v ? ' selected' : ''}>${escape(l)}</option>`
                    ).join('')}
                  </select>
                </label>
              </div>

              ${
                chips.length
                  ? `<ul class="chips">
                       ${chips
                         .map(
                           (c) => `
                         <li>
                           <button class="chip chip--active" type="button"
                                   data-remove-facet="${escape(c.key)}" data-value="${escape(c.value)}">
                             ${escape(c.label)} <span aria-hidden="true">×</span>
                             <span class="visually-hidden">remove filter</span>
                           </button>
                         </li>`
                         )
                         .join('')}
                     </ul>`
                  : ''
              }

              ${
                results.length
                  ? `<div class="grid">${results.map((p) => window.HB_CARD(p)).join('')}</div>`
                  : `<div class="empty shop__empty">
                       <p class="muted">Nothing matches all of those filters at once.</p>
                       <button class="btn btn--ghost" type="button" data-clear-all>Clear all filters</button>
                     </div>`
              }
            </div>
          </div>
        </div>
      </section>`;
  };

  /* ---------- events ---------- */

  const app = document.getElementById('app');

  const state = () => {
    const hash = window.location.hash || '#/';
    const [path, qs = ''] = hash.replace(/^#\//, '').split('?');
    return readState(path.split('/').filter(Boolean), new URLSearchParams(qs));
  };

  const go = (s) => {
    window.location.hash = toHash(s);
  };

  app.addEventListener('click', (event) => {
    if (event.target.closest('[data-clear-all]')) {
      window.location.hash = '#/shop';
      return;
    }

    const remove = event.target.closest('[data-remove-facet]');
    if (remove) {
      const s = state();
      const key = remove.dataset.removeFacet;
      const value = remove.dataset.value;
      if (Array.isArray(s[key])) s[key] = s[key].filter((v) => v !== value);
      else if (key === 'stock') s.stock = false;
      else if (key === 'pmin' || key === 'pmax') s[key] = null;
      else s[key] = '';
      go(s);
    }
  });

  app.addEventListener('change', (event) => {
    const facet = event.target.closest('[data-facet]');
    if (facet) {
      const s = state();
      const name = facet.dataset.facet;
      const value = facet.value;

      if (name === 'cat' || name === 'tier') {
        s[name] = facet.checked ? value : '';
      } else {
        s[name] = facet.checked ? [...s[name], value] : s[name].filter((v) => v !== value);
      }
      go(s);
      return;
    }

    if (event.target.id === 'shop-sort') {
      const s = state();
      s.sort = event.target.value;
      go(s);
      return;
    }

    if (event.target.id === 'instock') {
      const s = state();
      s.stock = event.target.checked;
      go(s);
      return;
    }

    if (event.target.id === 'pmin' || event.target.id === 'pmax') {
      const s = state();
      const v = event.target.value.trim();
      s[event.target.id] = v === '' ? null : Number(v);
      go(s);
    }
  });

  let searchTimer = null;
  app.addEventListener('input', (event) => {
    if (event.target.id !== 'shop-q') return;
    const value = event.target.value;
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      const s = state();
      s.q = value;
      go(s);
      const input = document.getElementById('shop-q');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }, 250);
  });

  window.HB_SHOP = {
    route(parts, query) {
      if (parts[0] !== 'shop') return null;
      return viewShop(parts, query);
    },
    POTENCY,
  };
})();
