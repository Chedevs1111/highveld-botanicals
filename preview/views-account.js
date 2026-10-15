(function () {
  const { store, products } = window.HB_DATA;
  const byHandle = new Map(products.map((p) => [p.handle, p]));

  const escape = (value) =>
    String(value === null || value === undefined ? '' : value).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );

  const money = (v) => `${store.currency_symbol}${v.toFixed(2)}`;

  const date = (iso) =>
    iso ? new Date(iso).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  const dateTime = (iso) =>
    iso
      ? new Date(iso).toLocaleString('en-ZA', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';

  const CART_KEY = 'hb:preview-cart';

  let orderQuery = '';
  let orderFilter = '';
  let flash = null;

  const NAV = [
    ['#/account', 'Overview'],
    ['#/account/orders', 'Orders'],
    ['#/account/membership', 'Membership'],
    ['#/account/details', 'Details'],
    ['#/account/privacy', 'Privacy'],
  ];

  const shell = (activeHash, title, body) => `
    <section class="section">
      <div class="container">
        <p class="eyebrow">Account</p>
        <h1 class="page-title">${escape(title)}</h1>

        <nav class="acctnav" aria-label="Account">
          ${NAV.map(
            ([href, label]) =>
              `<a href="${href}"${href === activeHash ? ' aria-current="page"' : ''}>${escape(label)}</a>`
          ).join('')}
        </nav>

        ${flash ? `<p class="notice notice--warn acct-flash">${escape(flash)}</p>` : ''}

        ${body}
      </div>
    </section>`;

  const signedOut = (activeHash, title) =>
    shell(
      activeHash,
      title,
      `<p class="muted">You are not a member yet. Everything except the CBD range needs a verified membership.</p>
       <a class="btn btn--primary" href="#/membership/apply">Apply for membership</a>`
    );

  /* ---------- overview ---------- */

  const nextAction = (orders) => {
    const O = window.HB_ORDER;

    const awaiting = orders.find((o) => o.status === 'awaiting_payment');
    if (awaiting) {
      const isEft = awaiting.payment.method === 'eft';
      return `
        <div class="nextact">
          <div>
            <p class="nextact__label">Needs your attention</p>
            <p class="nextact__title">
              ${
                isEft
                  ? `Pay ${money(awaiting.totals.total)} for ${escape(awaiting.id)}`
                  : `${escape(awaiting.id)} is held for collection`
              }
            </p>
            <p class="muted nextact__body">
              ${
                isEft
                  ? `Reference <span class="mono">${escape(awaiting.payment.reference)}</span> — due ${date(
                      awaiting.payment.due_by
                    )}. Nothing is released until the transfer clears.`
                  : `Bring ${money(awaiting.totals.total)} in cash. Held for 72 hours.`
              }
            </p>
          </div>
          <a class="btn btn--primary" href="#/order/${escape(awaiting.id)}">View order</a>
        </div>`;
    }

    const ready = orders.find((o) => o.status === 'ready');
    if (ready) {
      const point = O.COLLECTION_POINTS.find((p) => p.id === ready.fulfilment.point);
      return `
        <div class="nextact">
          <div>
            <p class="nextact__label">Ready for you</p>
            <p class="nextact__title">${escape(ready.id)} is ready for collection</p>
            <p class="muted nextact__body">
              ${escape(point ? point.name : 'Your collection point')}${
        point ? ` · ${escape(point.hours)}` : ''
      }. Bring the ID you verified with.
            </p>
          </div>
          <a class="btn btn--primary" href="#/order/${escape(ready.id)}">Collection details</a>
        </div>`;
    }

    return '';
  };

  const viewOverview = () => {
    const M = window.HB_MEMBER;
    const O = window.HB_ORDER;
    const member = M.syncMemberFromQueue();
    const orders = O.getOrders();

    if (!member.id && orders.length === 0) return signedOut('#/account', 'Your account');

    const statusCopy = window.HB_VIEWS.STATUS_COPY[member.status];
    const alloc = M.allocation();
    const open = orders.filter((o) => !['collected', 'cancelled'].includes(o.status));
    const spend = orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.totals.total, 0);
    const recent = orders.slice(0, 3);

    const tiles = `
      <ul class="tiles">
        <li class="tile">
          <p class="tile__label">Membership</p>
          <p class="tile__value"><span class="pill pill--${statusCopy.tone}">${escape(statusCopy.label)}</span></p>
          <p class="muted tile__note">${
            member.id ? `${escape(member.id)}${member.tier ? ` · ${escape(member.tier)} tier` : ''}` : 'Not a member'
          }</p>
        </li>

        <li class="tile">
          <p class="tile__label">Allocation</p>
          ${
            alloc
              ? `<p class="tile__value">${alloc.remaining}<span class="tile__of"> / ${alloc.total}</span></p>
                 <div class="alloc__bar tile__bar"><span style="width:${(alloc.used / alloc.total) * 100}%"></span></div>
                 <p class="muted tile__note">units left this month</p>`
              : `<p class="tile__value tile__value--muted">—</p>
                 <p class="muted tile__note">Verified members only</p>`
          }
        </li>

        <li class="tile">
          <p class="tile__label">Open orders</p>
          <p class="tile__value">${open.length}</p>
          <p class="muted tile__note">${
            open.length ? 'awaiting payment or collection' : 'nothing outstanding'
          }</p>
        </li>

        <li class="tile">
          <p class="tile__label">Lifetime</p>
          <p class="tile__value">${money(spend)}</p>
          <p class="muted tile__note">across ${orders.length} order${orders.length === 1 ? '' : 's'}</p>
        </li>
      </ul>`;

    const recentBlock = recent.length
      ? `<div class="detail">
           <div class="detail__head">
             <h2 class="detail__title">Recent orders</h2>
             <a href="#/account/orders">View all</a>
           </div>
           <ul class="orderlist">
             ${recent.map(orderRow).join('')}
           </ul>
         </div>`
      : `<div class="detail">
           <h2 class="detail__title">Recent orders</h2>
           <p class="muted" style="margin:.75rem 0 1rem">You have not placed an order yet.</p>
           <a class="btn btn--primary" href="#/shop">Browse the collection</a>
         </div>`;

    return shell(
      '#/account',
      `Hello${member.first_name ? `, ${member.first_name}` : ''}`,
      `${nextAction(orders)}
       ${tiles}
       ${recentBlock}

       <div class="detail">
         <h2 class="detail__title">Shortcuts</h2>
         <div class="ds-row" style="margin-top:.875rem">
           <a class="btn btn--ghost" href="#/shop">Browse the collection</a>
           <a class="btn btn--ghost" href="#/lab-results">Verify a batch</a>
           <a class="btn btn--ghost" href="#/account/privacy">Your documents</a>
         </div>
       </div>`
    );
  };

  /* ---------- orders ---------- */

  const orderRow = (o) => {
    const O = window.HB_ORDER;
    const s = O.STATUS[o.status];
    const thumbs = o.lines
      .slice(0, 3)
      .map((l) => {
        const p = byHandle.get(l.handle);
        return p && p.image
          ? `<img class="orderlist__thumb" src="${escape(p.image)}" alt="" loading="lazy">`
          : '';
      })
      .join('');

    const count = o.lines.reduce((n, l) => n + l.qty, 0);

    return `
      <li class="orderlist__item">
        <div class="orderlist__thumbs">${thumbs}${
      o.lines.length > 3 ? `<span class="orderlist__more">+${o.lines.length - 3}</span>` : ''
    }</div>
        <div class="orderlist__main">
          <p class="orderlist__id"><a href="#/order/${escape(o.id)}" class="mono">${escape(o.id)}</a></p>
          <p class="muted orderlist__meta">
            ${date(o.placed_at)} · ${count} item${count === 1 ? '' : 's'} ·
            ${o.fulfilment.method === 'collection' ? 'Collection' : 'Courier'}
          </p>
        </div>
        <p class="orderlist__total mono">${money(o.totals.total)}</p>
        <span class="pill pill--${s.tone}">${escape(s.label)}</span>
        <div class="orderlist__actions">
          <a class="btn btn--ghost btn--small" href="#/order/${escape(o.id)}">View</a>
          <button class="btn btn--ghost btn--small" type="button" data-reorder="${escape(o.id)}">Reorder</button>
        </div>
      </li>`;
  };

  const viewOrders = () => {
    const O = window.HB_ORDER;
    const all = O.getOrders();

    if (all.length === 0) {
      return shell(
        '#/account/orders',
        'Your orders',
        `<p class="muted">You have not placed an order yet.</p>
         <a class="btn btn--primary" href="#/shop">Browse the collection</a>`
      );
    }

    const q = orderQuery.trim().toLowerCase();
    const rows = all
      .filter((o) => (orderFilter ? o.status === orderFilter : true))
      .filter((o) =>
        q
          ? o.id.toLowerCase().includes(q) ||
            o.lines.some((l) => l.title.toLowerCase().includes(q) || l.batch_id.toLowerCase().includes(q))
          : true
      );

    const counts = all.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {});

    const chips = [['', `All (${all.length})`]]
      .concat(
        Object.keys(O.STATUS)
          .filter((k) => counts[k])
          .map((k) => [k, `${O.STATUS[k].label} (${counts[k]})`])
      )
      .map(
        ([value, label]) =>
          `<button class="chip" type="button" aria-pressed="${value === orderFilter}" data-orderfilter="${escape(
            value
          )}">${escape(label)}</button>`
      )
      .join('');

    return shell(
      '#/account/orders',
      'Your orders',
      `<div class="lab-verify">
         <label class="form__field lab-verify__field">
           <span class="form__label">Find an order</span>
           <input class="form__input" type="search" id="order-search" value="${escape(
             orderQuery
           )}" placeholder="Order number, product or batch" autocomplete="off">
         </label>
       </div>

       <div class="filters">${chips}</div>

       ${
         rows.length
           ? `<ul class="orderlist">${rows.map(orderRow).join('')}</ul>`
           : `<p class="muted empty">No order matches that. <button class="linkish" type="button" data-orderclear>Clear filters</button></p>`
       }`
    );
  };

  /* ---------- membership ---------- */

  const viewMembership = () => {
    const M = window.HB_MEMBER;
    const member = M.syncMemberFromQueue();

    if (!member.id) return signedOut('#/account/membership', 'Membership');

    const statusCopy = window.HB_VIEWS.STATUS_COPY[member.status];
    const alloc = M.allocation();

    return shell(
      '#/account/membership',
      'Membership',
      `<div class="statuscard statuscard--${statusCopy.tone}">
         <div><p class="statuscard__label">Status</p><p class="statuscard__value">${escape(
           statusCopy.label
         )}</p></div>
         <div><p class="statuscard__label">Member number</p><p class="statuscard__value">${escape(
           member.id
         )}</p></div>
         ${
           member.tier
             ? `<div><p class="statuscard__label">Tier</p><p class="statuscard__value">${escape(
                 member.tier
               )}</p></div>`
             : ''
         }
         ${
           member.expires_at
             ? `<div><p class="statuscard__label">Valid until</p><p class="statuscard__value">${date(
                 member.expires_at
               )}</p></div>`
             : ''
         }
       </div>

       ${
         member.status === 'pending'
           ? `<p class="notice">Submitted ${dateTime(
               member.submitted_at
             )}. A person reviews every application, usually within two business days.</p>`
           : ''
       }

       ${
         member.status === 'rejected'
           ? `<p class="notice notice--warn"><strong>Not approved.</strong> ${escape(
               member.rejection_reason || 'No reason recorded.'
             )}</p>
              <a class="btn btn--primary" href="#/membership/apply" data-reapply>Submit a new application</a>`
           : ''
       }

       ${
         alloc
           ? `<div class="alloc">
                <div class="alloc__head">
                  <h2>Monthly allocation</h2>
                  <p class="muted">${alloc.used} of ${alloc.total} units used</p>
                </div>
                <div class="alloc__bar"><span style="width:${(alloc.used / alloc.total) * 100}%"></span></div>
                <p class="muted alloc__note">
                  ${alloc.remaining} units remaining. Resets on the first of each month.
                  One unit is one item of any product.
                </p>
              </div>`
           : ''
       }

       <div class="detail">
         <h2 class="detail__title">History</h2>
         <ul class="audit" style="margin-top:.875rem">
           ${(member.audit || [])
             .slice()
             .reverse()
             .map(
               (e) => `
             <li>
               <span class="audit__action">${escape(e.action)}</span>
               <span class="audit__note">${escape(e.note)}</span>
               <span class="audit__meta">${escape(e.actor)} · ${dateTime(e.at)}</span>
             </li>`
             )
             .join('')}
         </ul>
       </div>`
    );
  };

  /* ---------- details ---------- */

  const viewDetails = () => {
    const M = window.HB_MEMBER;
    const member = M.syncMemberFromQueue();

    if (!member.id) return signedOut('#/account/details', 'Your details');

    const a = member.address || {};

    return shell(
      '#/account/details',
      'Your details',
      `<div class="detail">
         <h2 class="detail__title">Contact</h2>
         <dl class="detail__list">
           <div><dt>Name</dt><dd>${escape(member.first_name)} ${escape(member.last_name)}</dd></div>
           <div><dt>Email</dt><dd>${escape(member.email)}</dd></div>
           <div><dt>Date of birth</dt><dd>${escape(member.dob)}</dd></div>
         </dl>
       </div>

       <div class="detail">
         <h2 class="detail__title">Address</h2>
         <dl class="detail__list">
           <div><dt>Street</dt><dd>${escape(a.line1)}</dd></div>
           <div><dt>Suburb</dt><dd>${escape(a.suburb)}</dd></div>
           <div><dt>City</dt><dd>${escape(a.city)}</dd></div>
           <div><dt>Province</dt><dd>${escape(a.province)}</dd></div>
           <div><dt>Postal code</dt><dd>${escape(a.postal_code)}</dd></div>
         </dl>
         <p class="muted detail__note">
           This is the address you verified with. Changing it needs a fresh proof of address,
           because residency is part of what was checked — email us to start that.
         </p>
       </div>

       <div class="detail">
         <h2 class="detail__title">Preferred collection point</h2>
         <div class="choices" style="margin-top:.875rem">
           ${window.HB_ORDER.COLLECTION_POINTS.map(
             (pt) => `
             <label class="choice">
               <input type="radio" name="pref_point" value="${escape(pt.id)}" ${
               member.preferred_point === pt.id ? 'checked' : ''
             }>
               <span>
                 <strong>${escape(pt.name)}</strong>
                 <span class="muted">${escape(pt.address)}<br>${escape(pt.hours)}</span>
               </span>
             </label>`
           ).join('')}
         </div>
         <p class="muted detail__note">Pre-selected at checkout. You can still change it per order.</p>
       </div>`
    );
  };

  /* ---------- privacy ---------- */

  const viewPrivacy = () => {
    const M = window.HB_MEMBER;
    const L = window.HB_LEGAL;
    const member = M.syncMemberFromQueue();

    if (!member.id) return signedOut('#/account/privacy', 'Privacy');

    return shell(
      '#/account/privacy',
      'Privacy and documents',
      `<div class="detail">
         <h2 class="detail__title">Identity on file</h2>
         <dl class="detail__list">
           <div><dt>ID number</dt><dd>•••• ${escape(member.id_last4)}</dd></div>
           <div><dt>ID document</dt><dd>${escape(
             member.id_document ? member.id_document.filename : '—'
           )}</dd></div>
           <div><dt>Proof of address</dt><dd>${escape(
             member.address_proof ? member.address_proof.filename : '—'
           )}</dd></div>
         </dl>
         <p class="muted detail__note">
           Only the last four digits of your ID number are shown here, and the documents
           themselves are not readable from this page or anywhere else in the storefront.
         </p>
       </div>

       <div class="detail">
         <h2 class="detail__title">Your rights under POPIA</h2>
         <ul class="ds-rules" style="margin-top:.875rem">
           <li><strong>Access.</strong> You can ask for a copy of everything we hold about you.</li>
           <li><strong>Correction.</strong> You can have inaccurate details fixed.</li>
           <li><strong>Deletion.</strong> You can ask us to delete your documents. We do it within ${L.retention.deletion_request_days} days.</li>
           <li><strong>Objection.</strong> You can object to processing, though it ends your membership — age and residency verification is the whole basis for it.</li>
         </ul>

         <div class="ds-row" style="margin-top:1.25rem">
           <button class="btn btn--ghost" type="button" data-privacy="export">Request a copy of my data</button>
           <button class="btn btn--ghost" type="button" data-privacy="delete">Request deletion</button>
         </div>

         <p class="muted detail__note">
           Retention: identity documents are deleted ${L.retention.identity_documents_months} months after a
           membership ends. Order records are kept for ${L.retention.order_records_years} years where law
           requires it, with the identity documents stripped.
           Full detail in the <a href="#/privacy">privacy policy</a>.
         </p>
       </div>`
    );
  };

  /* ---------- reorder ---------- */

  const reorder = (orderId) => {
    const O = window.HB_ORDER;
    const M = window.HB_MEMBER;
    const order = O.getOrder(orderId);
    if (!order) return;

    let cart = {};
    try {
      cart = JSON.parse(window.localStorage.getItem(CART_KEY)) || {};
    } catch (error) {
      cart = {};
    }

    const added = [];
    const skipped = [];

    for (const line of order.lines) {
      const product = byHandle.get(line.handle);
      if (!product) {
        skipped.push(`${line.title} is no longer listed`);
        continue;
      }
      if (product.stock === 0) {
        skipped.push(`${product.title} is out of stock`);
        continue;
      }
      if (product.batch_id !== line.batch_id) {
        skipped.push(`${product.title} is now batch ${product.batch_id}, not ${line.batch_id}`);
      }
      const want = Math.min(M.LIMITS.max_per_item, (cart[line.handle] || 0) + line.qty, product.stock);
      cart[line.handle] = want;
      added.push(product.title);
    }

    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (error) {
      window.HB_STORAGE_FAILED = true;
    }

    const parts = [];
    if (added.length) parts.push(`Added ${added.length} item${added.length === 1 ? '' : 's'} to your cart.`);
    if (skipped.length) parts.push(skipped.join('. ') + '.');

    const alloc = M.allocation();
    if (alloc) {
      const units = Object.entries(cart)
        .filter(([h]) => byHandle.get(h) && byHandle.get(h).member_tier !== 'open')
        .reduce((s, [, q]) => s + q, 0);
      if (units > alloc.remaining) {
        parts.push(`Heads up: that is ${units} units against ${alloc.remaining} remaining this month.`);
      }
    }

    flash = parts.join(' ');
  };

  /* ---------- events ---------- */

  const app = document.getElementById('app');

  app.addEventListener('click', (event) => {
    const re = event.target.closest('[data-reorder]');
    if (re) {
      reorder(re.dataset.reorder);
      window.HB_RENDER();
      return;
    }

    const chip = event.target.closest('[data-orderfilter]');
    if (chip) {
      orderFilter = chip.dataset.orderfilter;
      flash = null;
      window.HB_RENDER();
      return;
    }

    if (event.target.closest('[data-orderclear]')) {
      orderFilter = '';
      orderQuery = '';
      window.HB_RENDER();
      return;
    }

    const priv = event.target.closest('[data-privacy]');
    if (priv) {
      const L = window.HB_LEGAL;
      flash =
        priv.dataset.privacy === 'export'
          ? `Request logged. On the live build this queues a data export and emails you a link within ${L.retention.export_request_days} days.`
          : `Request logged. On the live build this opens a deletion request — your documents are removed within ${L.retention.deletion_request_days} days and your membership ends.`;
      window.HB_RENDER();
    }
  });

  app.addEventListener('input', (event) => {
    if (event.target.id !== 'order-search') return;
    orderQuery = event.target.value;
    flash = null;
    window.HB_RENDER();
    const input = document.getElementById('order-search');
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  });

  app.addEventListener('change', (event) => {
    if (event.target.name !== 'pref_point') return;
    const M = window.HB_MEMBER;
    M.setMember({ ...M.getMember(), preferred_point: event.target.value });
    flash = 'Preferred collection point saved.';
    window.HB_RENDER();
  });

  window.HB_ACCOUNT = {
    route(parts) {
      if (parts[0] === 'orders') return viewOrders();
      if (parts[0] !== 'account') return null;

      const sub = parts[1] || '';
      if (sub === '') return viewOverview();
      if (sub === 'orders') return viewOrders();
      if (sub === 'membership') return viewMembership();
      if (sub === 'details') return viewDetails();
      if (sub === 'privacy') return viewPrivacy();
      return null;
    },
    clearFlash() {
      flash = null;
    },
  };
})();
