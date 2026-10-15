(function () {
  const { store, products, articles, topics, coas } = window.HB_DATA;

  const escape = (value) =>
    String(value === null || value === undefined ? '' : value).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );

  const money = (v) => `${store.currency_symbol}${v.toFixed(2)}`;

  const KINDS = [
    ['', 'Everything'],
    ['product', 'Products'],
    ['article', 'Guides & writing'],
    ['faq', 'FAQ'],
    ['batch', 'Lab results'],
  ];

  /** Flattens article body blocks into plain text for indexing. */
  const articleText = (a) =>
    a.body
      .map((b) => {
        if (b.t === 'list') return b.v.join(' ');
        if (b.t === 'table') return [...b.head, ...b.rows.flat()].join(' ');
        if (b.t === 'link') return b.label;
        return b.v || '';
      })
      .join(' ');

  /**
   * Built fresh each search so it always reflects current data — the FAQ in
   * particular is generated from live constants, not stored.
   */
  const buildIndex = () => {
    const entries = [];

    for (const p of products) {
      entries.push({
        kind: 'product',
        title: p.title,
        blurb: p.short_description,
        href: `#/product/${p.handle}`,
        meta: `${p.type} · ${p.strain_type} · ${money(p.price)}`,
        image: p.image,
        text: [p.title, p.type, p.strain_type, p.lineage, p.batch_id, p.short_description, p.description,
               ...p.terpenes, ...p.effects].join(' '),
      });
    }

    for (const a of articles) {
      if (a.placeholder) continue;
      const topic = topics.find((t) => t.handle === a.topic);
      entries.push({
        kind: 'article',
        title: a.title,
        blurb: a.standfirst,
        href: `#/learn/${a.slug}`,
        meta: `${a.type === 'post' ? 'Writing' : 'Guide'} · ${topic ? topic.title : ''} · ${a.reading_minutes} min`,
        text: [a.title, a.standfirst, articleText(a)].join(' '),
      });
    }

    for (const f of window.HB_SUPPORT.faq()) {
      const cat = (window.HB_SUPPORT.CATEGORIES.find(([v]) => v === f.cat) || [])[1];
      entries.push({
        kind: 'faq',
        title: f.q,
        blurb: f.a.replace(/\s+/g, ' ').trim(),
        href: '#/faq',
        meta: `FAQ · ${cat || f.cat}`,
        text: `${f.q} ${f.a}`,
      });
    }

    for (const c of coas) {
      entries.push({
        kind: 'batch',
        title: c.batch_id,
        blurb: `${c.product_title} — ${c.matrix_label}`,
        href: `#/lab-results/${c.batch_id}`,
        meta: `Certificate · reported ${new Date(c.sample.reported).toLocaleDateString('en-ZA', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })}`,
        text: [c.batch_id, c.product_title, c.sku, c.matrix_label, c.verification_code,
               ...c.terpenes.map((t) => t.name)].join(' '),
      });
    }

    return entries;
  };

  /** Title hits outrank body hits, and a whole-word hit outranks a substring. */
  const score = (entry, q) => {
    const title = entry.title.toLowerCase();
    const text = entry.text.toLowerCase();
    if (!text.includes(q)) return 0;

    let n = 1;
    if (title.includes(q)) n += 6;
    if (title === q) n += 10;
    if (new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text)) n += 3;
    if (entry.blurb && entry.blurb.toLowerCase().includes(q)) n += 2;
    return n;
  };

  const excerpt = (entry, q) => {
    const text = entry.text.replace(/\s+/g, ' ');
    const i = text.toLowerCase().indexOf(q);
    if (i < 0) return entry.blurb || '';
    const from = Math.max(0, i - 60);
    const slice = text.slice(from, from + 180);
    return `${from > 0 ? '…' : ''}${slice}${from + 180 < text.length ? '…' : ''}`;
  };

  const mark = (text, q) => {
    const safe = escape(text);
    if (!q) return safe;
    const pattern = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
    return safe.replace(pattern, '<mark>$1</mark>');
  };

  const KIND_LABEL = { product: 'Product', article: 'Guide', faq: 'FAQ', batch: 'Batch' };

  const viewSearch = (query) => {
    const raw = query.get('q') || '';
    const kind = query.get('kind') || '';
    const q = raw.trim().toLowerCase();

    if (!q) {
      const suggestions = ['durban', 'dosing', 'courier', 'allocation', 'terpenes', 'DP-2607-A'];
      return `
        <section class="section">
          <div class="container narrow">
            <p class="eyebrow">Search</p>
            <h1 class="page-title">Search</h1>
            <p class="muted lead">Products, guides, FAQ answers and lab certificates, all at once.</p>

            <label class="form__field">
              <span class="form__label">What are you looking for?</span>
              <input class="form__input" type="search" id="search-q" value="" autocomplete="off"
                     placeholder="strain, batch code, question…">
            </label>

            <p class="muted ds-note" style="margin-top:1.5rem">Try:</p>
            <div class="filters">
              ${suggestions
                .map((t) => `<button class="chip" type="button" data-suggest="${escape(t)}">${escape(t)}</button>`)
                .join('')}
            </div>
          </div>
        </section>`;
    }

    const all = buildIndex()
      .map((e) => ({ ...e, n: score(e, q) }))
      .filter((e) => e.n > 0)
      .sort((a, b) => b.n - a.n);

    const counts = all.reduce((acc, e) => {
      acc[e.kind] = (acc[e.kind] || 0) + 1;
      return acc;
    }, {});

    const shown = kind ? all.filter((e) => e.kind === kind) : all;

    const chips = KINDS.filter(([v]) => v === '' || counts[v])
      .map(
        ([v, label]) =>
          `<button class="chip" type="button" aria-pressed="${v === kind}" data-kind="${escape(v)}">${escape(
            label
          )} (${v ? counts[v] : all.length})</button>`
      )
      .join('');

    return `
      <section class="section">
        <div class="container narrow">
          <p class="eyebrow">Search</p>
          <h1 class="page-title">Search</h1>

          <label class="form__field">
            <span class="form__label">What are you looking for?</span>
            <input class="form__input" type="search" id="search-q" value="${escape(raw)}" autocomplete="off">
          </label>

          <p class="muted searchmeta">
            ${all.length} result${all.length === 1 ? '' : 's'} for “${escape(raw)}”
          </p>

          ${all.length ? `<div class="filters">${chips}</div>` : ''}

          ${
            shown.length
              ? `<ul class="results">
                   ${shown
                     .map(
                       (e) => `
                     <li class="result">
                       <a href="${escape(e.href)}">
                         <p class="result__kind">${escape(KIND_LABEL[e.kind])}</p>
                         <h2 class="result__title">${mark(e.title, q)}</h2>
                         <p class="result__excerpt">${mark(excerpt(e, q), q)}</p>
                         <p class="result__meta">${escape(e.meta)}</p>
                       </a>
                     </li>`
                     )
                     .join('')}
                 </ul>`
              : `<div class="empty">
                   <p class="muted">Nothing matches “${escape(raw)}”.</p>
                   <p class="muted">
                     Try a shorter word, or <a href="#/contact">ask us directly</a> — we would rather
                     answer than have you guess.
                   </p>
                 </div>`
          }
        </div>
      </section>`;
  };

  /* ---------- events ---------- */

  const app = document.getElementById('app');

  const go = (q, kind) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (kind) p.set('kind', kind);
    const qs = p.toString();
    window.location.hash = `#/search${qs ? `?${qs}` : ''}`;
  };

  const currentQ = () => new URLSearchParams((window.location.hash.split('?')[1] || '')).get('q') || '';
  const currentKind = () => new URLSearchParams((window.location.hash.split('?')[1] || '')).get('kind') || '';

  app.addEventListener('click', (event) => {
    const kindBtn = event.target.closest('[data-kind]');
    if (kindBtn) {
      go(currentQ(), kindBtn.dataset.kind);
      return;
    }
    const suggest = event.target.closest('[data-suggest]');
    if (suggest) go(suggest.dataset.suggest, '');
  });

  let timer = null;
  app.addEventListener('input', (event) => {
    if (event.target.id !== 'search-q') return;
    const value = event.target.value;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      go(value, currentKind());
      const input = document.getElementById('search-q');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }, 260);
  });

  window.HB_SEARCH = {
    route(parts, query) {
      if (parts[0] !== 'search') return null;
      return viewSearch(query);
    },
  };
})();
