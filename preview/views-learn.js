(function () {
  const { topics, articles } = window.HB_DATA;
  const bySlug = new Map(articles.map((a) => [a.slug, a]));

  const escape = (value) =>
    String(value === null || value === undefined ? '' : value).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );

  const date = (iso) =>
    iso ? new Date(iso).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

  /** Minimal inline formatting: **bold** only. Everything else is escaped. */
  const inline = (text) =>
    escape(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  const block = (b) => {
    switch (b.t) {
      case 'h2':
        return `<h2 class="prose__h2">${escape(b.v)}</h2>`;
      case 'p':
        return `<p class="prose__p">${inline(b.v)}</p>`;
      case 'list':
        return `<ul class="prose__list">${b.v.map((i) => `<li>${inline(i)}</li>`).join('')}</ul>`;
      case 'callout':
        return `<div class="prose__callout">${inline(b.v)}</div>`;
      case 'table':
        return `
          <div class="ds-scroll">
            <table class="table prose__table">
              <thead><tr>${b.head.map((h) => `<th>${escape(h)}</th>`).join('')}</tr></thead>
              <tbody>${b.rows
                .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
                .join('')}</tbody>
            </table>
          </div>`;
      case 'link':
        return `<p class="prose__p"><a class="btn btn--ghost btn--small" href="${escape(b.href)}">${escape(
          b.label
        )}</a></p>`;
      default:
        return '';
    }
  };

  const meta = (a) =>
    `${a.reading_minutes} min read${a.updated ? ` · updated ${date(a.updated)}` : ''}`;

  const cardFor = (a) => `
    <li class="artcard${a.placeholder ? ' artcard--placeholder' : ''}">
      <a href="#/learn/${escape(a.slug)}">
        ${
          a.safety_critical
            ? '<span class="artcard__flag">Safety</span>'
            : a.placeholder
            ? '<span class="artcard__flag artcard__flag--muted">Placeholder</span>'
            : ''
        }
        <h3 class="artcard__title">${escape(a.title)}</h3>
        <p class="muted artcard__stand">${escape(a.standfirst)}</p>
        <p class="artcard__meta">${escape(meta(a))}</p>
      </a>
    </li>`;

  /* ---------- education hub ---------- */

  const viewLearn = () => {
    const guides = articles.filter((a) => a.type === 'guide');
    const safety = guides.filter((a) => a.safety_critical);

    return `
      <section class="section">
        <div class="container">
          <p class="eyebrow">Learn</p>
          <h1 class="page-title">Education</h1>
          <p class="muted lead">
            How to dose, how to read a certificate, what the labels on a jar do and do not
            tell you. Written to be accurate rather than reassuring.
          </p>

          <div class="notice notice--warn pol-lede">
            <strong>Start here if you are new.</strong>
            ${safety
              .map((a) => `<a href="#/learn/${escape(a.slug)}">${escape(a.title)}</a>`)
              .join(' and ')}
            are the two that matter most. Everything else can wait.
          </div>

          ${topics
            .map((t) => {
              const items = guides.filter((a) => a.topic === t.handle);
              if (!items.length) return '';
              return `
                <div class="topic">
                  <div class="topic__head">
                    <h2 class="ds-h2 topic__title">${escape(t.title)}</h2>
                    <p class="muted topic__blurb">${escape(t.blurb)}</p>
                  </div>
                  <ul class="artgrid">${items.map(cardFor).join('')}</ul>
                </div>`;
            })
            .join('')}

          <div class="faq-foot">
            <h2 class="detail__title">Looking for something shorter?</h2>
            <p class="muted" style="margin:.5rem 0 1rem">
              The FAQ answers the quick questions. The blog is where we write about what we grow.
            </p>
            <a class="btn btn--ghost" href="#/faq">FAQ</a>
            <a class="btn btn--ghost" href="#/blog" style="margin-left:.5rem">Blog</a>
          </div>
        </div>
      </section>`;
  };

  /* ---------- blog ---------- */

  const viewBlog = () => {
    const posts = articles
      .filter((a) => a.type === 'post')
      .sort((a, b) => (a.updated < b.updated ? 1 : -1));

    const real = posts.filter((p) => !p.placeholder);
    const placeholders = posts.filter((p) => p.placeholder);

    return `
      <section class="section">
        <div class="container">
          <p class="eyebrow">Blog</p>
          <h1 class="page-title">Writing</h1>
          <p class="muted lead">
            What we grow, how we test it, and the reasoning behind how this place is run.
          </p>

          <ul class="artgrid">${real.map(cardFor).join('')}</ul>

          ${
            placeholders.length
              ? `<div class="coa-specimen" role="note" style="margin-top:2rem">
                   <strong>${placeholders.length} placeholder ${
                  placeholders.length === 1 ? 'entry' : 'entries'
                }.</strong>
                   The blog is wired and ready, but dated company news has to be written by
                   someone who was there. ${placeholders
                     .map((p) => `<a href="#/learn/${escape(p.slug)}">${escape(p.title)}</a>`)
                     .join(', ')}.
                 </div>`
              : ''
          }

          <div class="faq-foot">
            <h2 class="detail__title">Looking to learn rather than read?</h2>
            <p class="muted" style="margin:.5rem 0 1rem">
              The education guides cover dosing, testing, storage and safety.
            </p>
            <a class="btn btn--primary" href="#/learn">Education guides</a>
          </div>
        </div>
      </section>`;
  };

  /* ---------- article ---------- */

  const viewArticle = (slug) => {
    const a = bySlug.get(slug);

    if (!a) {
      return `
        <section class="section">
          <div class="container narrow">
            <h1 class="page-title">Not found</h1>
            <p class="muted">There is no article at “${escape(slug)}”.</p>
            <a class="btn btn--primary" href="#/learn">All guides</a>
          </div>
        </section>`;
    }

    const topic = topics.find((t) => t.handle === a.topic);
    const backHref = a.type === 'post' ? '#/blog' : '#/learn';
    const backLabel = a.type === 'post' ? 'All writing' : 'All guides';

    const related = articles
      .filter((x) => x.topic === a.topic && x.slug !== a.slug && !x.placeholder)
      .slice(0, 3);

    return `
      <section class="section">
        <div class="container narrow">
          <p class="coa-back"><a href="${backHref}">← ${escape(backLabel)}</a></p>

          <p class="eyebrow">${escape(topic ? topic.title : a.type)}</p>
          <h1 class="page-title">${escape(a.title)}</h1>
          <p class="muted lead">${escape(a.standfirst)}</p>
          <p class="muted prose__meta">${escape(meta(a))}</p>

          ${
            a.safety_critical
              ? `<div class="notice notice--warn pol-lede">
                   <strong>Safety information.</strong> General guidance, not medical advice,
                   and it knows nothing about you. If any of it applies to your situation,
                   talk to a doctor or a pharmacist.
                 </div>`
              : ''
          }

          <article class="prose">
            ${a.body.map(block).join('')}
          </article>

          ${
            related.length
              ? `<div class="related">
                   <h2 class="detail__title">More on ${escape(topic ? topic.title.toLowerCase() : 'this')}</h2>
                   <ul class="artgrid">${related.map(cardFor).join('')}</ul>
                 </div>`
              : ''
          }

          <p class="muted pol-updated">
            Questions this did not answer? <a href="#/faq">FAQ</a> or
            <a href="#/contact">contact us</a>.
          </p>
        </div>
      </section>`;
  };

  window.HB_LEARN = {
    route(parts) {
      if (parts[0] === 'blog') return viewBlog();
      if (parts[0] !== 'learn') return null;
      return parts[1] ? viewArticle(decodeURIComponent(parts[1])) : viewLearn();
    },
  };
})();
