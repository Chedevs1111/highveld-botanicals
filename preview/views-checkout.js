(function () {
  const { store, products } = window.HB_DATA;
  const byHandle = new Map(products.map((p) => [p.handle, p]));

  const escape = (value) =>
    String(value === null || value === undefined ? '' : value).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );

  const money = (v) => `${store.currency_symbol}${v.toFixed(2)}`;

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

  const date = (iso) =>
    iso ? new Date(iso).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  const CART_KEY = 'hb:preview-cart';

  const cartLines = () => {
    let cart = {};
    try {
      cart = JSON.parse(window.localStorage.getItem(CART_KEY)) || {};
    } catch (error) {
      cart = {};
    }
    return Object.entries(cart)
      .filter(([handle, qty]) => byHandle.has(handle) && qty > 0)
      .map(([handle, qty]) => ({ product: byHandle.get(handle), qty }));
  };

  const clearCart = () => {
    try {
      window.localStorage.removeItem(CART_KEY);
    } catch (error) {
      /* nothing to clear */
    }
  };

  /* ---------- checkout state ---------- */

  const STEPS = ['Contact', 'Fulfilment', 'Payment', 'Review'];
  let step = 1;
  let draft = { contact: {}, fulfilment: { method: 'collection' }, payment: { method: 'eft' }, declarations: {} };
  let errors = {};
  let blockers = [];

  const reset = () => {
    step = 1;
    draft = { contact: {}, fulfilment: { method: 'collection' }, payment: { method: 'eft' }, declarations: {} };
    errors = {};
    blockers = [];
  };

  const field = (name, label, type, value, extra) => `
    <label class="form__field${errors[name] ? ' form__field--error' : ''}">
      <span class="form__label">${escape(label)}</span>
      <input class="form__input" type="${type}" name="${name}" value="${escape(value || '')}" ${extra || ''}>
      ${errors[name] ? `<span class="form__error">${escape(errors[name])}</span>` : ''}
    </label>`;

  const stepDots = () => `
    <ol class="steps">
      ${STEPS.map(
        (label, i) => `
        <li class="steps__item${i + 1 === step ? ' steps__item--current' : ''}${
          i + 1 < step ? ' steps__item--done' : ''
        }">
          <span class="steps__num">${i + 1 < step ? '✓' : i + 1}</span>
          <span class="steps__label">${escape(label)}</span>
        </li>`
      ).join('')}
    </ol>`;

  const summaryPanel = (lines) => {
    const O = window.HB_ORDER;
    const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
    const fee = O.shippingFee(draft.fulfilment.method, subtotal);
    const units = lines.filter((l) => l.product.member_tier !== 'open').reduce((s, l) => s + l.qty, 0);
    const shortfall = O.SHIPPING.free_over - subtotal;

    return `
      <aside class="checkout__summary">
        <h2 class="ds-label">Order summary</h2>
        <ul class="sumlines">
          ${lines
            .map(
              (l) => `
            <li>
              <img class="sumlines__thumb" src="${escape(l.product.image)}" alt="" loading="lazy">
              <div>
                <p class="sumlines__title">${escape(l.product.title)}</p>
                <p class="muted sumlines__meta">
                  ${escape(l.product.size)} ${escape(l.product.unit)} · × ${l.qty}
                  <br>Batch ${escape(l.product.batch_id)}
                </p>
              </div>
              <p class="sumlines__price">${money(l.product.price * l.qty)}</p>
            </li>`
            )
            .join('')}
        </ul>

        <dl class="sumtotals">
          <div><dt>Subtotal</dt><dd>${money(subtotal)}</dd></div>
          <div><dt>${draft.fulfilment.method === 'courier' ? 'Courier' : 'Collection'}</dt><dd>${
      fee ? money(fee) : 'Free'
    }</dd></div>
          <div class="sumtotals__total"><dt>Total</dt><dd>${money(subtotal + fee)}</dd></div>
        </dl>

        ${
          draft.fulfilment.method === 'courier' && shortfall > 0
            ? `<p class="muted sumnote">Add ${money(shortfall)} for free courier.</p>`
            : ''
        }

        ${
          units > 0
            ? `<p class="muted sumnote">Uses <strong>${units}</strong> of your monthly allocation.</p>`
            : '<p class="muted sumnote">Non-intoxicating items only — no allocation used.</p>'
        }

        <p class="muted sumnote">${escape(store.compliance_note)}</p>
      </aside>`;
  };

  /* ---------- checkout ---------- */

  const viewCheckout = () => {
    const O = window.HB_ORDER;
    const M = window.HB_MEMBER;
    const lines = cartLines();

    if (lines.length === 0) {
      return `
        <section class="section">
          <div class="container narrow">
            <h1 class="page-title">Nothing to check out</h1>
            <p class="muted">Your cart is empty.</p>
            <a class="btn btn--primary" href="#/shop">Browse the collection</a>
          </div>
        </section>`;
    }

    const member = M.getMember();
    const alloc = M.allocation();
    const hardBlocks = O.validate(lines, null);

    // honour the collection point saved under Account → Details
    if (!draft.fulfilment.point && member.preferred_point) {
      draft.fulfilment.point = member.preferred_point;
    }

    if (hardBlocks.some((b) => b.field === 'membership')) {
      return `
        <section class="section">
          <div class="container narrow">
            <p class="eyebrow">Checkout</p>
            <h1 class="page-title">Verification required</h1>
            <div class="memgate">
              <p class="memgate__lock">Members only</p>
              <p class="memgate__message">${escape(hardBlocks.find((b) => b.field === 'membership').message)}</p>
              <a class="btn btn--primary" href="#/membership/apply">Apply for membership</a>
            </div>
            <p class="muted" style="margin-top:1.5rem">
              You can still check out with the CBD range on its own — remove the members-only
              items from your <a href="#/cart">cart</a> to continue.
            </p>
          </div>
        </section>`;
    }

    let body = '';

    if (step === 1) {
      const c = draft.contact;
      body = `
        ${
          member.status === 'approved'
            ? `<div class="verifybar">
                 <span class="pill pill--ok">Verified member</span>
                 <span class="muted">${escape(member.id)} · ${escape(member.tier || 'standard')} tier${
                alloc ? ` · ${alloc.remaining} of ${alloc.total} units left` : ''
              }</span>
               </div>`
            : `<p class="notice">You are checking out with non-intoxicating items only, so no membership is needed.</p>`
        }

        <div class="form__row">
          ${field('first_name', 'First name', 'text', c.first_name || member.first_name)}
          ${field('last_name', 'Last name', 'text', c.last_name || member.last_name)}
        </div>
        ${field('email', 'Email address', 'email', c.email || member.email)}
        ${field('phone', 'Mobile number', 'tel', c.phone, 'placeholder="071 234 5678"')}
        <p class="form__hint">
          We send the collection code to this number. It is checked against your ID at handover.
        </p>`;
    }

    if (step === 2) {
      const f = draft.fulfilment;
      const restricted = lines.some((l) => l.product.member_tier !== 'open');

      body = `
        <div class="choices${errors.fulfilment ? ' form__field--error' : ''}">
          <label class="choice">
            <input type="radio" name="method" value="collection" ${f.method === 'collection' ? 'checked' : ''}>
            <span>
              <strong>Collect in person</strong>
              <span class="muted">Free. ID checked at handover — bring the same document you verified with.</span>
            </span>
          </label>

          <label class="choice${restricted ? ' choice--disabled' : ''}">
            <input type="radio" name="method" value="courier" ${f.method === 'courier' ? 'checked' : ''} ${
        restricted ? 'disabled' : ''
      }>
            <span>
              <strong>Verified courier — ${money(window.HB_ORDER.COURIER_FEE)}</strong>
              <span class="muted">
                ${
                  restricted
                    ? 'Not available for members-only items. Those are handed over in person so ID can be checked.'
                    : 'Available for the CBD range. Signature required on delivery.'
                }
              </span>
            </span>
          </label>
          ${errors.fulfilment ? `<span class="form__error">${escape(errors.fulfilment)}</span>` : ''}
        </div>

        ${
          f.method === 'collection'
            ? `<div class="choices${errors.point ? ' form__field--error' : ''}">
                 <h2 class="ds-label" style="margin-top:1rem">Collection point</h2>
                 ${window.HB_ORDER.COLLECTION_POINTS.map(
                   (pt) => `
                   <label class="choice">
                     <input type="radio" name="point" value="${escape(pt.id)}" ${f.point === pt.id ? 'checked' : ''}>
                     <span>
                       <strong>${escape(pt.name)}</strong>
                       <span class="muted">${escape(pt.address)}<br>${escape(pt.hours)}</span>
                     </span>
                   </label>`
                 ).join('')}
                 ${errors.point ? `<span class="form__error">${escape(errors.point)}</span>` : ''}
               </div>`
            : `<div class="form__stack">
                 ${field('line1', 'Delivery address', 'text', f.line1)}
                 <div class="form__row">
                   ${field('suburb', 'Suburb', 'text', f.suburb)}
                   ${field('city', 'City', 'text', f.city)}
                 </div>
                 ${field('postal_code', 'Postal code', 'text', f.postal_code, 'inputmode="numeric"')}
               </div>`
        }`;
    }

    if (step === 3) {
      const pm = draft.payment.method;
      body = `
        <p class="notice">
          <strong>We do not take card payments.</strong> Card networks and the mainstream
          payment gateways prohibit these products in their acceptable-use policies, so
          there is no card form here and never will be. EFT or cash, both below.
        </p>

        <div class="choices">
          ${window.HB_ORDER.PAYMENT_METHODS.map(
            (m) => `
            <label class="choice">
              <input type="radio" name="payment" value="${escape(m.id)}" ${pm === m.id ? 'checked' : ''}>
              <span>
                <strong>${escape(m.label)}</strong>
                <span class="muted">${escape(m.blurb)}</span>
              </span>
            </label>`
          ).join('')}
        </div>

        ${
          pm === 'eft'
            ? `<div class="bankbox">
                 <h2 class="ds-label">Where to pay</h2>
                 <dl class="coa-dl">
                   <div><dt>Account name</dt><dd>${escape(window.HB_ORDER.BANK.account_name)}</dd></div>
                   <div><dt>Bank</dt><dd>${escape(window.HB_ORDER.BANK.bank)}</dd></div>
                   <div><dt>Account</dt><dd class="mono">${escape(window.HB_ORDER.BANK.account_number)}</dd></div>
                   <div><dt>Branch code</dt><dd class="mono">${escape(window.HB_ORDER.BANK.branch_code)}</dd></div>
                   <div><dt>Reference</dt><dd class="muted">Your order number, shown after you place the order</dd></div>
                 </dl>
                 <p class="muted sumnote">
                   Full details and the reference appear on your confirmation. Nothing is
                   released until the transfer clears.
                 </p>
               </div>`
            : ''
        }`;
    }

    if (step === 4) {
      const f = draft.fulfilment;
      const point = window.HB_ORDER.COLLECTION_POINTS.find((p) => p.id === f.point);
      const pm = window.HB_ORDER.PAYMENT_METHODS.find((m) => m.id === draft.payment.method);

      const check = (name, label) => `
        <label class="form__check">
          <input type="checkbox" name="${name}" ${draft.declarations[name] ? 'checked' : ''}>
          <span>${label}</span>
        </label>`;

      body = `
        ${
          blockers.length
            ? `<div class="memgate" style="margin-bottom:1.25rem">
                 <p class="memgate__lock">Cannot place this order</p>
                 ${blockers.map((b) => `<p class="memgate__message">${escape(b.message)}</p>`).join('')}
                 <a class="btn btn--ghost" href="#/cart">Edit cart</a>
               </div>`
            : ''
        }

        <div class="summary">
          <h2>Confirm the details</h2>
          <dl>
            <div><dt>Name</dt><dd>${escape(draft.contact.first_name)} ${escape(draft.contact.last_name)}</dd></div>
            <div><dt>Email</dt><dd>${escape(draft.contact.email)}</dd></div>
            <div><dt>Mobile</dt><dd>${escape(draft.contact.phone)}</dd></div>
            <div><dt>Fulfilment</dt><dd>${
              f.method === 'collection'
                ? `Collect — ${escape(point ? point.name : '')}<br><span class="muted">${escape(
                    point ? point.address : ''
                  )}</span>`
                : `Courier — ${escape(f.line1)}, ${escape(f.suburb)}, ${escape(f.city)} ${escape(f.postal_code)}`
            }</dd></div>
            <div><dt>Payment</dt><dd>${escape(pm ? pm.label : '')}</dd></div>
          </dl>
        </div>

        <div class="form__checks${errors.declarations ? ' form__field--error' : ''}">
          ${check('own_use', 'This order is for my own private use and I will not resell any of it.')}
          ${check('id_present', 'I will present the same ID I verified with at handover.')}
          ${check('storage', 'I will store these products securely and out of reach of children and animals.')}
          ${check('terms', 'I accept the terms and the collective\'s constitution.')}
          ${errors.declarations ? `<span class="form__error">${escape(errors.declarations)}</span>` : ''}
        </div>`;
    }

    return `
      <section class="section">
        <div class="container">
          <p class="eyebrow">Checkout</p>
          <h1 class="page-title">Place your order</h1>
          ${stepDots()}

          <div class="checkout">
            <form class="form" id="checkout-form" novalidate>
              ${body}
              ${errors.form ? `<p class="form__error form__error--top">${escape(errors.form)}</p>` : ''}
              <div class="form__actions">
                ${
                  step > 1
                    ? '<button class="btn btn--ghost" type="button" data-co-back>Back</button>'
                    : '<a class="btn btn--ghost" href="#/cart">Back to cart</a>'
                }
                <button class="btn btn--primary" type="button" data-co-next ${
                  step === STEPS.length && blockers.length ? 'disabled' : ''
                }>
                  ${step === STEPS.length ? 'Place order' : 'Continue'}
                </button>
              </div>
            </form>

            ${summaryPanel(lines)}
          </div>
        </div>
      </section>`;
  };

  /* ---------- confirmation / order detail ---------- */

  const viewOrder = (id, justPlaced) => {
    const O = window.HB_ORDER;
    const order = O.getOrder(id);

    if (!order) {
      return `
        <section class="section">
          <div class="container narrow">
            <h1 class="page-title">Order not found</h1>
            <p class="muted">No order with the number “${escape(id)}”.</p>
            <a class="btn btn--primary" href="#/orders">Your orders</a>
          </div>
        </section>`;
    }

    const status = O.STATUS[order.status];
    const point = O.COLLECTION_POINTS.find((p) => p.id === order.fulfilment.point);
    const isEft = order.payment.method === 'eft';

    return `
      <section class="section">
        <div class="container">
          ${
            justPlaced
              ? `<div class="placed">
                   <p class="placed__tick" aria-hidden="true">✓</p>
                   <div>
                     <h1 class="placed__title">Order placed</h1>
                     <p class="muted">
                       We have emailed a copy to ${escape(order.member.email)}.
                       Nothing is released until ${
                         isEft ? 'your transfer clears' : 'you pay at handover'
                       } and your ID is checked.
                     </p>
                   </div>
                 </div>`
              : `<p class="coa-back"><a href="#/orders">← Your orders</a></p>`
          }

          <article class="coa">
            <header class="coa-head">
              <div>
                <p class="eyebrow">Order</p>
                <h1 class="coa-title mono">${escape(order.id)}</h1>
                <p class="muted coa-sub">Placed ${dateTime(order.placed_at)}</p>
              </div>
              <div class="coa-verdict">
                <span class="pill pill--${status.tone}">${escape(status.label)}</span>
                <button class="btn btn--ghost coa-print" type="button" data-print>Print</button>
              </div>
            </header>

            ${
              order.status === 'awaiting_payment' && isEft
                ? `<div class="paybox">
                     <h2 class="coa-h2">Pay by ${date(order.payment.due_by)}</h2>
                     <dl class="coa-dl">
                       <div><dt>Account name</dt><dd>${escape(order.payment.bank.account_name)}</dd></div>
                       <div><dt>Bank</dt><dd>${escape(order.payment.bank.bank)}</dd></div>
                       <div><dt>Account</dt><dd class="mono">${escape(order.payment.bank.account_number)}</dd></div>
                       <div><dt>Branch code</dt><dd class="mono">${escape(order.payment.bank.branch_code)}</dd></div>
                       <div><dt>Amount</dt><dd class="mono"><strong>${money(order.totals.total)}</strong></dd></div>
                       <div><dt>Reference</dt><dd class="mono"><strong>${escape(order.payment.reference)}</strong></dd></div>
                     </dl>
                     <p class="muted sumnote">
                       Use the reference exactly as shown — it is how we match your transfer to
                       this order. Unreferenced payments take several days to trace.
                     </p>
                   </div>`
                : ''
            }

            ${
              order.status === 'awaiting_payment' && !isEft
                ? `<div class="paybox">
                     <h2 class="coa-h2">Pay ${money(order.totals.total)} at collection</h2>
                     <p class="muted sumnote">
                       Bring the exact amount. Collection points hold no change and have no card
                       machine. Your order is held for 72 hours.
                     </p>
                   </div>`
                : ''
            }

            <div class="coa-meta">
              <div>
                <h2 class="coa-h3">${order.fulfilment.method === 'collection' ? 'Collection' : 'Delivery'}</h2>
                ${
                  point
                    ? `<p>${escape(point.name)}</p>
                       <p class="muted">${escape(point.address)}</p>
                       <p class="muted">${escape(point.hours)}</p>`
                    : `<p>${escape(order.fulfilment.line1)}</p>
                       <p class="muted">${escape(order.fulfilment.suburb)}, ${escape(order.fulfilment.city)} ${escape(
                        order.fulfilment.postal_code
                      )}</p>`
                }
              </div>
              <div>
                <h2 class="coa-h3">Member</h2>
                <p>${escape(order.member.name)}</p>
                <p class="muted">${escape(order.member.email)}</p>
                <p class="muted">${escape(order.member.phone)}</p>
                ${
                  order.member.verified
                    ? `<p class="muted">${escape(order.member.id)} · ${escape(order.member.tier || 'standard')} tier</p>`
                    : '<p class="muted">Non-intoxicating items only</p>'
                }
              </div>
            </div>

            <div class="coa-block">
              <h2 class="coa-h2">Items</h2>
              <div class="ds-scroll">
                <table class="table coa-table">
                  <thead><tr><th>Item</th><th>Batch</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead>
                  <tbody>
                    ${order.lines
                      .map(
                        (l) => `
                      <tr>
                        <td>
                          <a href="#/product/${escape(l.handle)}">${escape(l.title)}</a>
                          <span class="muted coa-method">${escape(l.size)} ${escape(l.unit)} · ${escape(l.sku)}</span>
                        </td>
                        <td class="mono"><a href="#/lab-results/${escape(l.batch_id)}">${escape(l.batch_id)}</a></td>
                        <td class="mono">${l.qty}</td>
                        <td class="mono">${money(l.unit_price)}</td>
                        <td class="mono">${money(l.line_total)}</td>
                      </tr>`
                      )
                      .join('')}
                  </tbody>
                  <tfoot>
                    <tr><td colspan="4">Subtotal</td><td class="mono">${money(order.totals.subtotal)}</td></tr>
                    <tr><td colspan="4">${
                      order.fulfilment.method === 'courier' ? 'Courier' : 'Collection'
                    }</td><td class="mono">${order.totals.fee ? money(order.totals.fee) : 'Free'}</td></tr>
                    <tr class="coa-total"><td colspan="4"><strong>Total</strong></td><td class="mono"><strong>${money(
                      order.totals.total
                    )}</strong></td></tr>
                  </tfoot>
                </table>
              </div>
              <p class="muted coa-note">
                Every batch above links to its certificate of analysis. Check the batch code on
                your packaging matches what is printed here.
              </p>
            </div>

            ${
              order.fulfilment.method === 'collection'
                ? `<div class="coa-block">
                     <h2 class="coa-h2">What to bring</h2>
                     <ul class="ds-rules">
                       <li><strong>The ID you verified with.</strong> Same document, not a photo of it. Handover is refused without it.</li>
                       <li><strong>Your order number.</strong> ${escape(order.id)}</li>
                       ${
                         !isEft
                           ? `<li><strong>${money(order.totals.total)} in cash.</strong> Exact amount — no change is held.</li>`
                           : ''
                       }
                     </ul>
                     <p class="muted coa-note">
                       Collection is by the named member only. We cannot hand over to a friend,
                       partner or courier on your behalf.
                     </p>
                   </div>`
                : ''
            }

            <div class="coa-block">
              <h2 class="coa-h2">Progress</h2>
              <ul class="audit">
                ${order.timeline
                  .slice()
                  .reverse()
                  .map(
                    (t) => `
                  <li>
                    <span class="audit__action">${escape(t.action.replace(/_/g, ' '))}</span>
                    <span class="audit__note">${escape(t.note)}</span>
                    <span class="audit__meta">${escape(t.actor)} · ${dateTime(t.at)}</span>
                  </li>`
                  )
                  .join('')}
              </ul>

              ${(() => {
                const el = O.returnEligibility(order);
                if (!el.can) return '';
                const label =
                  el.reason === 'cancel'
                    ? 'Cancel this order'
                    : el.reason === 'sealed'
                    ? 'Return unopened items'
                    : 'Report a problem';
                return `
                  <div class="returnbox">
                    <p class="ds-label">Something wrong?</p>
                    <p class="returnbox__msg">${escape(el.message)}</p>
                    <div class="ds-row">
                      <button class="btn btn--ghost" type="button" data-return="${escape(order.id)}" data-reason="${escape(
                  el.reason
                )}">${escape(label)}</button>
                      <a class="btn btn--ghost" href="#/returns">Returns policy</a>
                    </div>
                  </div>`;
              })()}

              ${
                !['cancelled', 'refunded'].includes(order.status)
                  ? `<div class="staffbox">
                       <p class="ds-label">Staff actions — preview only</p>
                       <div class="ds-row">
                         ${
                           order.status === 'awaiting_payment'
                             ? `<button class="btn btn--ghost" type="button" data-advance="${escape(
                                 order.id
                               )}" data-status="payment_received">Mark payment received</button>`
                             : ''
                         }
                         ${
                           order.status === 'payment_received'
                             ? `<button class="btn btn--ghost" type="button" data-advance="${escape(
                                 order.id
                               )}" data-status="ready">Mark ready for collection</button>`
                             : ''
                         }
                         ${
                           order.status === 'ready'
                             ? `<button class="btn btn--primary" type="button" data-advance="${escape(
                                 order.id
                               )}" data-status="collected">Confirm handover (ID checked)</button>`
                             : ''
                         }
                         ${
                           order.status === 'return_requested'
                             ? `<button class="btn btn--primary" type="button" data-advance="${escape(
                                 order.id
                               )}" data-status="refunded">Approve refund</button>`
                             : ''
                         }
                         <button class="btn btn--ghost" type="button" data-advance="${escape(
                           order.id
                         )}" data-status="cancelled">Cancel</button>
                       </div>
                       <p class="muted sumnote">
                         On the live build these live in the admin app, not the storefront.
                       </p>
                     </div>`
                  : ''
              }
            </div>

            <p class="muted coa-disclaimer">
              ${escape(store.compliance_note)}
              Nothing in this document is a medical claim. This preview does not process payments.
            </p>
          </article>
        </div>
      </section>`;
  };

  /* ---------- order list ---------- */

  /* ---------- validation ---------- */

  const collect = (form) => {
    errors = {};
    const get = (n) => {
      const el = form.querySelector(`[name="${n}"]`);
      return el ? el.value.trim() : '';
    };
    const radio = (n) => {
      const el = form.querySelector(`[name="${n}"]:checked`);
      return el ? el.value : '';
    };

    if (step === 1) {
      draft.contact = {
        first_name: get('first_name'),
        last_name: get('last_name'),
        email: get('email'),
        phone: get('phone'),
      };
      if (!draft.contact.first_name) errors.first_name = 'Required.';
      if (!draft.contact.last_name) errors.last_name = 'Required.';
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.contact.email)) errors.email = 'Enter a valid email address.';
      if (draft.contact.phone.replace(/\D/g, '').length < 9) errors.phone = 'Enter a valid mobile number.';
    }

    if (step === 2) {
      const method = radio('method') || draft.fulfilment.method;
      draft.fulfilment = { ...draft.fulfilment, method };

      if (method === 'collection') {
        draft.fulfilment.point = radio('point') || draft.fulfilment.point || '';
        if (!draft.fulfilment.point) errors.point = 'Choose a collection point.';
      } else {
        Object.assign(draft.fulfilment, {
          line1: get('line1'),
          suburb: get('suburb'),
          city: get('city'),
          postal_code: get('postal_code'),
        });
        if (!draft.fulfilment.line1) errors.line1 = 'Required.';
        if (!draft.fulfilment.suburb) errors.suburb = 'Required.';
        if (!draft.fulfilment.city) errors.city = 'Required.';
        if (!/^\d{4}$/.test(draft.fulfilment.postal_code)) errors.postal_code = 'South African postal codes are 4 digits.';
      }
    }

    if (step === 3) {
      draft.payment = { method: radio('payment') || draft.payment.method };
    }

    if (step === 4) {
      ['own_use', 'id_present', 'storage', 'terms'].forEach((n) => {
        const el = form.querySelector(`[name="${n}"]`);
        draft.declarations[n] = Boolean(el && el.checked);
      });
      if (!Object.values(draft.declarations).every(Boolean)) {
        errors.declarations = 'All four declarations must be accepted.';
      }
    }

    return Object.keys(errors).length === 0;
  };

  /* ---------- events ---------- */

  const app = document.getElementById('app');
  let lastPlaced = null;

  app.addEventListener('click', (event) => {
    const back = event.target.closest('[data-co-back]');
    if (back) {
      const form = document.getElementById('checkout-form');
      if (form) collect(form);
      errors = {};
      step = Math.max(1, step - 1);
      window.HB_RENDER();
      return;
    }

    const next = event.target.closest('[data-co-next]');
    if (next) {
      const form = document.getElementById('checkout-form');
      if (!collect(form)) {
        window.HB_RENDER();
        return;
      }

      if (step < STEPS.length) {
        step += 1;
        // re-check on entering review so a stale cart cannot slip through
        if (step === STEPS.length) {
          blockers = window.HB_ORDER.validate(cartLines(), draft.fulfilment);
        }
        window.HB_RENDER();
        return;
      }

      const result = window.HB_ORDER.create({
        lines: cartLines(),
        contact: draft.contact,
        fulfilment: draft.fulfilment,
        payment: draft.payment,
        declarations: draft.declarations,
      });

      if (!result.ok) {
        blockers = result.errors;
        window.HB_RENDER();
        return;
      }

      lastPlaced = result.order.id;
      clearCart();
      reset();
      window.location.hash = `#/order/${result.order.id}`;
      return;
    }

    const ret = event.target.closest('[data-return]');
    if (ret) {
      const id = ret.dataset.return;
      const reason = ret.dataset.reason;

      if (reason === 'cancel') {
        window.HB_ORDER.advance(id, 'cancelled', 'Cancelled by the member before handover.', 'member');
      } else {
        window.HB_ORDER.advance(
          id,
          'return_requested',
          reason === 'sealed'
            ? 'Return requested — unopened items within the return window.'
            : 'Problem reported by the member. Awaiting review.',
          'member'
        );
      }
      window.HB_RENDER();
      return;
    }

    const advance = event.target.closest('[data-advance]');
    if (advance) {
      const notes = {
        payment_received: 'Transfer cleared and matched to the order reference.',
        ready: 'Packed and held at the collection point.',
        collected: 'Handed over. ID checked against the verified document.',
        cancelled: 'Order cancelled.',
      };
      window.HB_ORDER.advance(advance.dataset.advance, advance.dataset.status, notes[advance.dataset.status]);
      lastPlaced = null;
      window.HB_RENDER();
    }
  });

  app.addEventListener('change', (event) => {
    const name = event.target.name;
    if (name === 'method' || name === 'payment' || name === 'point') {
      const form = document.getElementById('checkout-form');
      if (form) collect(form);
      errors = {};
      window.HB_RENDER();
    }
  });

  window.HB_CHECKOUT = {
    route(parts) {
      if (parts[0] === 'checkout') return viewCheckout();
      if (parts[0] === 'order' && parts[1]) {
        const id = decodeURIComponent(parts[1]);
        const justPlaced = lastPlaced === id;
        return viewOrder(id, justPlaced);
      }
      return null;
    },
    reset,
  };
})();
