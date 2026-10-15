(function () {
  const { store, categories, products } = window.HB_DATA;
  const app = document.getElementById('app');
  const byHandle = new Map(products.map((p) => [p.handle, p]));

  const money = (value) => `${store.currency_symbol}${value.toFixed(2)}`;
  const escape = (value) =>
    String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const initials = (title) =>
    title
      .replace(/[^A-Za-z ]/g, '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');

  const swatch = (accent) =>
    `background: linear-gradient(145deg, ${accent}, ${accent}22);`;

  /* ---------- cart ---------- */

  const CART_KEY = 'hb:preview-cart';

  const readCart = () => {
    try {
      return JSON.parse(window.localStorage.getItem(CART_KEY)) || {};
    } catch (error) {
      return {};
    }
  };

  const writeCart = (cart) => {
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (error) {
      window.HB_CART_FALLBACK = cart;
    }
    paintCount();
  };

  const cartLines = () =>
    Object.entries(readCart())
      .filter(([handle, qty]) => byHandle.has(handle) && qty > 0)
      .map(([handle, qty]) => ({ product: byHandle.get(handle), qty }));

  const cartTotal = () => cartLines().reduce((sum, l) => sum + l.product.price * l.qty, 0);

  const paintCount = () => {
    const count = cartLines().reduce((sum, l) => sum + l.qty, 0);
    document.getElementById('cart-count').textContent = String(count);
  };

  /* ---------- components ---------- */

  const potency = (p, size) => {
    const items = [];
    if (p.thc_pct !== null) items.push(['THC', `${p.thc_pct}%`]);
    else if (p.thc_mg !== null) items.push(['THC', `${p.thc_mg}mg`]);
    if (p.cbd_pct !== null) items.push(['CBD', `${p.cbd_pct}%`]);
    else if (p.cbd_mg !== null) items.push(['CBD', `${p.cbd_mg}mg`]);
    items.push(['Strain', p.strain_type]);

    return `<ul class="potency${size === 'large' ? ' potency--large' : ''}">${items
      .map(
        ([label, value]) =>
          `<li><span class="potency__label">${escape(label)}</span><span class="potency__value">${escape(value)}</span></li>`
      )
      .join('')}</ul>`;
  };

  const flag = (p) => {
    if (p.stock === 0) return '<span class="card__flag">Sold out</span>';
    if (p.member_tier === 'premium') return '<span class="card__flag">Premium</span>';
    if (p.member_tier === 'open') return '<span class="card__flag card__flag--open">No membership</span>';
    return '';
  };

  const GATE_CTA = {
    unverified: ['Apply for membership', '#/membership/apply'],
    pending: ['Check your application', '#/account'],
    rejected: ['Apply again', '#/account'],
    expired: ['Renew membership', '#/account'],
    allocation: ['View your allocation', '#/account'],
  };

  const buyBlock = (p) => {
    const gate = window.HB_MEMBER.canPurchase(p);

    if (!gate.allowed) {
      const [label, href] = GATE_CTA[gate.reason] || GATE_CTA.unverified;
      return `
        <div class="memgate">
          <p class="memgate__lock">Members only</p>
          <p class="memgate__message">${escape(gate.message)}</p>
          <a class="btn btn--primary" href="${href}">${escape(label)}</a>
        </div>`;
    }

    return `
      <div class="pdp__buy">
        <label class="pdp__qty">
          <span>Quantity</span>
          <input type="number" id="qty" value="1" min="1" max="${window.HB_MEMBER.LIMITS.max_per_item}">
        </label>
        <button class="btn btn--primary pdp__add" type="button" data-add="${escape(p.handle)}" ${
      p.stock === 0 ? 'disabled' : ''
    }>
          ${p.stock === 0 ? 'Sold out' : 'Add to cart'}
        </button>
      </div>
      <p class="muted" style="margin:0;font-size:.75rem">Limited to ${window.HB_MEMBER.LIMITS.max_per_item} per member, per order. ${p.stock} in stock.</p>`;
  };

  const media = (p, cls, eager) =>
    p.image
      ? `<img class="${cls}" src="${escape(p.image)}" alt="${escape(p.title)}" width="1000" height="1000"
           loading="${eager ? 'eager' : 'lazy'}" decoding="async">`
      : `<span class="${cls}__mark">${escape(initials(p.title))}</span>`;

  const card = (p) => `
    <article class="card">
      <a href="#/product/${escape(p.handle)}">
        <div class="card__media" style="${swatch(p.accent)}">
          ${media(p, 'card__img')}
          ${flag(p)}
        </div>
        <div class="card__body">
          <h3>${escape(p.title)}</h3>
          ${potency(p)}
          <div class="card__foot">
            <p class="card__price">
              ${p.compare_at ? `<s>${money(p.compare_at)}</s>` : ''}${money(p.price)}
            </p>
            <p class="card__batch">${escape(p.size)} ${escape(p.unit)}</p>
          </div>
        </div>
      </a>
    </article>`;

  /* ---------- views ---------- */

  const viewHome = () => {
    const featured = products.filter((p) => p.member_tier !== 'open').slice(0, 4);
    const cbd = products.filter((p) => p.member_tier === 'open');

    return `
      <section class="hero">
        <div class="container hero__inner">
          <div>
            <p class="eyebrow">Members only</p>
            <h1>Landrace genetics, kept honest.</h1>
            <p class="hero__body">
              A small, verified collective growing South African landrace cultivars.
              Every batch is lab-tested and the certificate is on the product page.
            </p>
            <div class="hero__actions">
              <a class="btn btn--primary" href="#/shop">Browse the collection</a>
              <a class="btn btn--ghost" href="#/shop/cbd-wellness">CBD &amp; wellness</a>
            </div>
            <ul class="hero__trust">
              <li><strong>100%</strong><span>Batch tested</span></li>
              <li><strong>5</strong><span>Landrace lines</span></li>
              <li><strong>18+</strong><span>Verified members</span></li>
            </ul>
          </div>
          <div class="hero__panel">
            <h2>How it works</h2>
            <ol>
              ${window.HB_ABOUT.stages()
                .map((s) => `<li><strong>${escape(s.short[0])}.</strong> ${escape(s.short[1])}</li>`)
                .join('')}
            </ol>
            <a class="btn btn--ghost btn--small" href="#/how-it-works" style="margin-top:1rem">Read more</a>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="container">
          <div class="section__head">
            <div><p class="eyebrow">This week</p><h2>Current batches</h2></div>
            <a class="btn btn--ghost" href="#/shop">View all</a>
          </div>
          <div class="grid">${featured.map(card).join('')}</div>
        </div>
      </section>

      <section class="section">
        <div class="container">
          <div class="section__head">
            <div><p class="eyebrow">No membership required</p><h2>CBD &amp; wellness</h2></div>
            <a class="btn btn--ghost" href="#/shop/cbd-wellness">View all</a>
          </div>
          <div class="grid">${cbd.map(card).join('')}</div>
        </div>
      </section>`;
  };

  const viewProduct = (handle) => {
    const p = byHandle.get(handle);
    if (!p) return viewNotFound();

    return `
      <section class="section">
        <div class="container pdp">
          <div class="pdp__gallery">
            <div class="pdp__media" style="${swatch(p.accent)}">
              ${
                p.images && p.images.length
                  ? `<img class="pdp__img" id="pdp-lead" src="${escape(p.images[0].src)}"
                       alt="${escape(p.images[0].alt)}" width="1600" height="1600" decoding="async">`
                  : media(p, 'pdp__img', true)
              }
            </div>
            ${
              p.images && p.images.length > 1
                ? `<ul class="pdp__thumbs">
                     ${p.images
                       .map(
                         (img, i) => `
                       <li>
                         <button class="pdp__thumb${i === 0 ? ' pdp__thumb--active' : ''}" type="button"
                                 data-shot="${escape(img.src)}" data-alt="${escape(img.alt)}"
                                 aria-label="${escape(img.alt)}">
                           <img src="${escape(img.src)}" alt="" loading="lazy">
                         </button>
                       </li>`
                       )
                       .join('')}
                   </ul>`
                : ''
            }
          </div>

          <div class="pdp__info">
            <p class="eyebrow">${escape(p.type)}</p>
            <h1>${escape(p.title)}</h1>
            <p class="pdp__price">
              ${p.compare_at ? `<s>${money(p.compare_at)}</s>` : ''}${money(p.price)}
              <span class="muted" style="font-size:.9375rem;font-weight:400"> · ${escape(p.size)} ${escape(p.unit)}</span>
            </p>

            <p class="notice">${escape(store.compliance_note)}</p>

            ${potency(p, 'large')}

            ${
              p.member_tier === 'premium'
                ? '<p class="notice notice--warn">High potency. If this is your first batch from this line, start at a quarter of your usual amount.</p>'
                : ''
            }

            ${buyBlock(p)}

            <p class="pdp__description">${escape(p.description)}</p>

            <dl class="specs">
              <div><dt>Lineage</dt><dd>${escape(p.lineage)}</dd></div>
              <div><dt>Terpenes</dt><dd>${escape(p.terpenes.join(' · '))}</dd></div>
              <div><dt>Reported effects</dt><dd>${escape(p.effects.join(' · '))}</dd></div>
              <div><dt>Batch &amp; lab report</dt><dd><a href="#/lab-results/${escape(p.batch_id)}">${escape(p.batch_id)}</a> <span class="muted">· view certificate</span></dd></div>
              <div><dt>SKU</dt><dd>${escape(p.sku)}</dd></div>
            </dl>
          </div>
        </div>
      </section>`;
  };

  const gateNotice = (blocked) => {
    const gate = window.HB_MEMBER.canPurchase(blocked[0].product);
    const [label, href] = GATE_CTA[gate.reason] || GATE_CTA.unverified;
    const names = blocked.map((l) => l.product.title).join(', ');

    return `
      <div class="memgate memgate--cart">
        <p class="memgate__lock">Verification required</p>
        <p class="memgate__message">
          ${escape(gate.message)} Affected: ${escape(names)}.
          You can still check out with the CBD range on its own.
        </p>
        <a class="btn btn--primary" href="${href}">${escape(label)}</a>
      </div>`;
  };

  const viewCart = () => {
    const lines = cartLines();
    const blocked = lines.filter((l) => !window.HB_MEMBER.canPurchase(l.product).allowed);

    if (lines.length === 0) {
      return `
        <section class="section">
          <div class="container">
            <div class="section__head"><h1>Your cart</h1></div>
            <p class="muted">Your cart is empty.</p>
            <a class="btn btn--primary" href="#/shop">Browse the collection</a>
          </div>
        </section>`;
    }

    return `
      <section class="section">
        <div class="container">
          <div class="section__head"><h1>Your cart</h1></div>

          <ul class="cart__items">
            ${lines
              .map(
                ({ product: p, qty }) => `
              <li class="cart__item">
                <div class="cart__thumb" style="${swatch(p.accent)}">
                  ${p.image ? `<img src="${escape(p.image)}" alt="${escape(p.title)}">` : escape(initials(p.title))}
                </div>
                <div>
                  <p class="cart__name">${escape(p.title)}</p>
                  <p class="cart__meta">${escape(p.size)} ${escape(p.unit)} · Batch ${escape(p.batch_id)}</p>
                  <button class="cart__remove" type="button" data-remove="${escape(p.handle)}">Remove</button>
                </div>
                <label>
                  <span class="visually-hidden">Quantity</span>
                  <input type="number" min="1" max="${window.HB_MEMBER.LIMITS.max_per_item}" value="${qty}" data-qty="${escape(p.handle)}">
                </label>
                <p class="cart__line">${money(p.price * qty)}</p>
              </li>`
              )
              .join('')}
          </ul>

          ${blocked.length > 0 ? gateNotice(blocked) : ''}

          <div class="cart__foot">
            <div>
              <p class="cart__subtotal"><span>Subtotal</span><strong>${money(cartTotal())}</strong></p>
              <p class="muted" style="margin:.35rem 0 0;font-size:.75rem">
                Delivery and verification are confirmed at the next step.
              </p>
            </div>
            ${
              blocked.length > 0
                ? '<button class="btn btn--primary" type="button" disabled>Checkout</button>'
                : '<a class="btn btn--primary" href="#/checkout">Checkout</a>'
            }
          </div>

          <p class="notice" style="margin-top:1.5rem">
            Orders are released only after membership and age verification are confirmed.
            Unverified orders are refunded in full. This preview does not process payments.
          </p>
        </div>
      </section>`;
  };

  const viewNotFound = () => `
    <section class="section">
      <div class="container">
        <h1>Not found</h1>
        <p class="muted">That page does not exist in this preview.</p>
        <a class="btn btn--primary" href="#/">Back home</a>
      </div>
    </section>`;

  /* ---------- router ---------- */

  const NAV = [
    ['#/shop', 'Shop'],
    ...categories.map((c) => [`#/shop/${c.handle}`, c.title]),
    ['#/lab-results', 'Lab results'],
    ['#/learn', 'Learn'],
    ['#/how-it-works', 'How it works'],
    ['#/admin/verifications', 'Admin'],
  ];

  const paintStatus = () => {
    const member = window.HB_MEMBER.getMember();
    const copy = window.HB_VIEWS.STATUS_COPY[member.status];
    const el = document.getElementById('member-status');
    el.innerHTML = `<span class="pill pill--${copy.tone}">${escape(copy.label)}</span>`;
  };

  const paintNav = (hash) => {
    document.getElementById('nav-links').innerHTML = NAV.map(
      ([href, label]) =>
        `<li><a href="${href}"${href === hash ? ' aria-current="page"' : ''}>${escape(label)}</a></li>`
    ).join('');
  };

  const render = () => {
    const hash = window.location.hash || '#/';
    const [path, qs = ''] = hash.replace(/^#\//, '').split('?');
    const parts = path.split('/').filter(Boolean);
    const query = new URLSearchParams(qs);

    let html =
      window.HB_SHOP.route(parts, query) ||
      window.HB_SEARCH.route(parts, query) ||
      window.HB_ACCOUNT.route(parts) ||
      window.HB_VIEWS.route(parts) ||
      window.HB_DOCS.route(parts) ||
      window.HB_LAB.route(parts) ||
      window.HB_CHECKOUT.route(parts) ||
      window.HB_POLICY.route(parts) ||
      window.HB_SUPPORT.route(parts) ||
      window.HB_ABOUT.route(parts) ||
      window.HB_LEARN.route(parts);

    if (html === null || html === undefined) {
      if (parts.length === 0) html = viewHome();
      else if (parts[0] === 'product') html = viewProduct(parts[1]);
      else if (parts[0] === 'cart') html = viewCart();
      else html = viewNotFound();
    }

    app.innerHTML = html;
    paintNav(hash);
    paintCount();
    paintStatus();
  };

  window.HB_RENDER = render;

  /* shared renderers used by the shop and search modules */
  window.HB_CARD = card;
  window.HB_POTENCY = potency;

  /* ---------- events ---------- */

  app.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-category]');
    if (chip) {
      const value = chip.dataset.category;
      window.location.hash = value ? `#/shop/${value}` : '#/shop';
      return;
    }

    const shot = event.target.closest('[data-shot]');
    if (shot) {
      const lead = document.getElementById('pdp-lead');
      if (lead) {
        lead.src = shot.dataset.shot;
        lead.alt = shot.dataset.alt;
      }
      document
        .querySelectorAll('.pdp__thumb')
        .forEach((b) => b.classList.toggle('pdp__thumb--active', b === shot));
      return;
    }

    const add = event.target.closest('[data-add]');
    if (add) {
      const qtyInput = document.getElementById('qty');
      const cap = window.HB_MEMBER.LIMITS.max_per_item;
      const qty = Math.max(1, Math.min(cap, Number(qtyInput && qtyInput.value) || 1));
      const cart = readCart();
      cart[add.dataset.add] = Math.min(cap, (cart[add.dataset.add] || 0) + qty);
      writeCart(cart);
      add.textContent = 'Added ✓';
      window.setTimeout(() => {
        add.textContent = 'Add to cart';
      }, 1400);
      return;
    }

    const remove = event.target.closest('[data-remove]');
    if (remove) {
      const cart = readCart();
      delete cart[remove.dataset.remove];
      writeCart(cart);
      render();
      return;
    }

  });

  app.addEventListener('change', (event) => {
    const qty = event.target.closest('[data-qty]');
    if (!qty) return;
    const cart = readCart();
    cart[qty.dataset.qty] = Math.max(1, Math.min(window.HB_MEMBER.LIMITS.max_per_item, Number(qty.value) || 1));
    writeCart(cart);
    render();
  });

  window.addEventListener('hashchange', () => {
    render();
    window.scrollTo(0, 0);
  });

  /* ---------- age gate ---------- */

  const gate = document.getElementById('age-gate');
  const GATE_KEY = 'hb:preview-age-verified';

  let verifiedUntil = 0;
  try {
    verifiedUntil = Number(window.localStorage.getItem(GATE_KEY)) || 0;
  } catch (error) {
    verifiedUntil = 0;
  }

  if (verifiedUntil <= Date.now()) {
    gate.showModal();
    document.body.style.overflow = 'hidden';
    gate.addEventListener('cancel', (event) => event.preventDefault());
  }

  document.getElementById('gate-accept').addEventListener('click', () => {
    try {
      window.localStorage.setItem(GATE_KEY, String(Date.now() + 30 * 86400000));
    } catch (error) {
      gate.dataset.storageUnavailable = 'true';
    }
    gate.close();
    document.body.style.overflow = '';
  });

  document.getElementById('gate-decline').addEventListener('click', () => {
    document.getElementById('gate-declined').hidden = false;
    document.getElementById('gate-accept').disabled = true;
  });

  render();
})();
