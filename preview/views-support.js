(function () {
  const { store } = window.HB_DATA;

  const escape = (value) =>
    String(value === null || value === undefined ? '' : value).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );

  const money = (v) => `${store.currency_symbol}${v.toFixed(2)}`;

  let faqQuery = '';
  let faqCategory = '';
  let contactDraft = {};
  let contactErrors = {};
  let contactSent = null;

  /**
   * Answers are built at render time from the same constants the store runs on.
   * An FAQ that restates a number is an FAQ that will one day be wrong.
   */
  const buildFaq = () => {
    const M = window.HB_MEMBER;
    const O = window.HB_ORDER;
    const L = window.HB_LEGAL;
    const S = O.SHIPPING;
    const R = O.REFUNDS;

    return [
      // membership
      {
        cat: 'membership',
        q: 'Who can join?',
        a: `Anyone ${store.minimum_age} or older who is resident in South Africa and applying for themselves.
            You are verified against a government-issued ID, not on your word. One membership per person.`,
      },
      {
        cat: 'membership',
        q: 'How long does verification take?',
        a: `Usually ${M.LIMITS.verification_business_days} business days. A person reviews every application —
            there is no automated approval — so it can take longer over a weekend or a public holiday.`,
      },
      {
        cat: 'membership',
        q: 'What documents do I need?',
        a: `A clear photo of your South African ID or passport, and a proof of address dated in the last
            three months — a municipal bill, bank statement or lease.`,
      },
      {
        cat: 'membership',
        q: 'My application was rejected. What now?',
        a: `You are told the reason, and most rejections are a fixable document problem — a proof of address
            that is too old, or an ID photo that cannot be read. Correct it and apply again from your account.`,
      },
      {
        cat: 'membership',
        q: 'Do I need a membership to buy CBD?',
        a: `No. The CBD and hemp range is non-intoxicating and sits outside the members-only catalogue.
            Anyone over ${store.minimum_age} can buy it, and it can be couriered.`,
      },

      // allocation
      {
        cat: 'allocation',
        q: 'What is a unit?',
        a: `One item of any product. A 3.5 g jar is one unit, a tin of pre-rolls is one unit, a pack of
            gummies is one unit. Standard members get ${M.ALLOCATION.standard} a month and premium members
            ${M.ALLOCATION.premium}. The CBD range does not use allocation at all.`,
      },
      {
        cat: 'allocation',
        q: 'When does my allocation reset?',
        a: `On the first of each month. Unused units do not roll over.`,
      },
      {
        cat: 'allocation',
        q: 'Why is there an allocation at all?',
        a: `So that no one member accumulates quantities that stop looking like personal use. It is the
            mechanism that keeps this a private collective rather than a distribution channel.`,
      },
      {
        cat: 'allocation',
        q: 'What happens to my units if I cancel an order?',
        a: `They go straight back to the month they were taken from. Same for a refund, and same for an
            order that expires uncollected after ${S.hold_hours} hours.`,
      },
      {
        cat: 'allocation',
        q: 'How many of one item can I order at once?',
        a: `${M.LIMITS.max_per_item} of any single product per order, within your monthly allocation.`,
      },

      // ordering
      {
        cat: 'ordering',
        q: 'Why can I not pay by card?',
        a: `Card networks and every mainstream South African payment gateway prohibit these products in
            their acceptable-use policies. Rather than pretend otherwise, we take
            ${O.PAYMENT_METHODS.map((p) => p.label.toLowerCase()).join(' or ')}.`,
      },
      {
        cat: 'ordering',
        q: 'What reference do I use for the EFT?',
        a: `Your order number, exactly as shown on the confirmation. It is how we match your transfer to
            your order — an unreferenced payment takes days to trace and nothing is released until it clears.`,
      },
      {
        cat: 'ordering',
        q: 'When is my order actually confirmed?',
        a: `When we mark it ready, not when you place it. Placing an order is an offer; we accept it once
            payment has cleared and the stock is set aside.`,
      },
      {
        cat: 'ordering',
        q: 'Can I change an order after placing it?',
        a: `Cancel it from your account and place a new one. Your units return immediately, so you are not
            penalised for it.`,
      },

      // delivery
      {
        cat: 'delivery',
        q: 'Why can members-only items not be couriered?',
        a: `Because your ID is checked against the document you verified with at the moment of handover,
            and a courier cannot do that. This has no workaround. Asking us to post it gets the order
            cancelled and refunded.`,
      },
      {
        cat: 'delivery',
        q: 'What does courier cost?',
        a: `${money(S.courier_fee)} flat for the CBD range, free over ${money(S.free_over)}.
            ${S.courier_main} to main centres, ${S.courier_outlying} elsewhere. ${S.coverage}.`,
      },
      {
        cat: 'delivery',
        q: 'What do I bring to collection?',
        a: `The physical ID you verified with — not a photo of it — and your order number. If you are
            paying cash, the exact amount. Handover is refused without the ID.`,
      },
      {
        cat: 'delivery',
        q: 'Can someone collect on my behalf?',
        a: `No. Not a partner, not a housemate, not a driver with a letter. The ID check is the entire
            basis on which we are permitted to hand anything over.`,
      },
      {
        cat: 'delivery',
        q: 'How long is my order held?',
        a: `${S.hold_hours} hours from the moment it is marked ready. After that it returns to stock, your
            allocation is credited back, and an EFT payment is refunded in full.`,
      },

      // products
      {
        cat: 'products',
        q: 'What is the batch code on my packaging?',
        a: `It identifies exactly which harvest and test your product came from. Every batch has a
            certificate of analysis you can look up, showing cannabinoid potency, terpenes, pesticides,
            heavy metals, microbials and mycotoxins.`,
      },
      {
        cat: 'products',
        q: 'My batch code is not in the register. What does that mean?',
        a: `Do not use the product and contact us immediately. It either did not come from us, or it left
            before it was cleared for release. Either is serious.`,
      },
      {
        cat: 'products',
        q: 'Is the THC percentage exact?',
        a: `It carries the tolerance of the test method, so small variation is normal and is not a
            mislabelling. A result outside the tolerance is a mislabelling, and that is a refund.`,
      },
      {
        cat: 'products',
        q: 'How much should I take?',
        a: `Less than you think, especially with edibles. Onset for anything eaten is 45 to 90 minutes —
            the most common mistake is taking more before the first dose has landed. Start at half a piece
            and wait two full hours before deciding anything.`,
      },
      {
        cat: 'products',
        q: 'Can I drive after using?',
        a: `No. South African law treats driving under the influence of cannabis the same as alcohol, and
            impairment lasts considerably longer than the effect you notice.`,
      },

      // returns
      {
        cat: 'returns',
        q: 'Can I return something I have opened?',
        a: `No. Once a seal is broken we cannot verify how it was stored or whether it was tampered with,
            so it can never go back into stock for another member. That is a health rule and it does not
            bend for how recently you bought it.`,
      },
      {
        cat: 'returns',
        q: 'What if the product is faulty or not what I ordered?',
        a: `Refund or replacement, your choice, for ${R.defect_window_months} months. That is the Consumer
            Protection Act and nothing in our terms shrinks it.`,
      },
      {
        cat: 'returns',
        q: 'Can I return unopened CBD?',
        a: `Yes, within ${R.sealed_window_days} days of delivery if the seal is intact. You get a refund
            less the original courier fee.`,
      },
      {
        cat: 'returns',
        q: 'How long do refunds take?',
        a: `${R.processing} from approval, back to the account the payment came from. We do not refund to
            a different account than the one that paid.`,
      },

      // privacy
      {
        cat: 'privacy',
        q: 'Do you store my ID number?',
        a: `No. We use it once to check the checksum and derive your date of birth, then keep only the last
            four digits so we can match you at handover. The full number is never written to our records.`,
      },
      {
        cat: 'privacy',
        q: 'How long do you keep my documents?',
        a: `${L.retention.identity_documents_months} months after your membership ends. Order records are
            kept ${L.retention.order_records_years} years where law requires it, with the identity
            documents stripped out.`,
      },
      {
        cat: 'privacy',
        q: 'Can I have my data deleted?',
        a: `Yes, within ${L.retention.deletion_request_days} days. Start it from Account → Privacy. It ends
            your membership, because age and residency verification is the basis on which we may supply you.`,
      },
      {
        cat: 'privacy',
        q: 'Do you track me?',
        a: `There are no third-party trackers, advertising pixels or identifying analytics on this site.
            The privacy policy lists every key the site stores in your browser and what each is for.`,
      },
    ];
  };

  const CATEGORIES = [
    ['', 'All'],
    ['membership', 'Membership'],
    ['allocation', 'Allocation'],
    ['ordering', 'Ordering & payment'],
    ['delivery', 'Collection & delivery'],
    ['products', 'Products & safety'],
    ['returns', 'Returns'],
    ['privacy', 'Privacy'],
  ];

  /* ---------- FAQ ---------- */

  const viewFaq = () => {
    const all = buildFaq();
    const q = faqQuery.trim().toLowerCase();

    const rows = all
      .filter((f) => (faqCategory ? f.cat === faqCategory : true))
      .filter((f) => (q ? f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q) : true));

    const counts = all.reduce((acc, f) => {
      acc[f.cat] = (acc[f.cat] || 0) + 1;
      return acc;
    }, {});

    const chips = CATEGORIES.filter(([value]) => value === '' || counts[value])
      .map(
        ([value, label]) =>
          `<button class="chip" type="button" aria-pressed="${value === faqCategory}" data-faqcat="${escape(
            value
          )}">${escape(label)}${value ? ` (${counts[value]})` : ` (${all.length})`}</button>`
      )
      .join('');

    const groups = CATEGORIES.filter(([value]) => value).map(([value, label]) => {
      const items = rows.filter((f) => f.cat === value);
      if (!items.length) return '';
      return `
        <div class="faq-group">
          <h2 class="ds-h2">${escape(label)}</h2>
          ${items
            .map(
              (f) => `
            <details class="faq">
              <summary class="faq__q">${escape(f.q)}</summary>
              <div class="faq__a">${f.a}</div>
            </details>`
            )
            .join('')}
        </div>`;
    }).join('');

    return `
      <section class="section">
        <div class="container narrow">
          <p class="eyebrow">Support</p>
          <h1 class="page-title">Frequently asked questions</h1>
          <p class="muted lead">
            The things members actually ask. If the answer is not here,
            <a href="#/contact">contact us</a> — we would rather answer twice than have you guess.
          </p>

          <div class="lab-verify">
            <label class="form__field lab-verify__field">
              <span class="form__label">Search</span>
              <input class="form__input" type="search" id="faq-search" value="${escape(
                faqQuery
              )}" placeholder="allocation, courier, refund…" autocomplete="off">
            </label>
          </div>

          <div class="filters">${chips}</div>

          ${
            rows.length
              ? groups
              : `<p class="muted empty">
                   Nothing matches that. <button class="linkish" type="button" data-faqclear>Clear filters</button>
                   or <a href="#/contact">ask us directly</a>.
                 </p>`
          }

          <div class="faq-foot">
            <h2 class="detail__title">Still stuck?</h2>
            <p class="muted" style="margin:.5rem 0 1rem">
              Safety questions are answered the same day, always.
            </p>
            <a class="btn btn--primary" href="#/contact">Contact us</a>
          </div>
        </div>
      </section>`;
  };

  /* ---------- contact ---------- */

  const viewContact = () => {
    const L = window.HB_LEGAL;
    const C = L.contact;

    if (contactSent) {
      return `
        <section class="section">
          <div class="container narrow">
            <div class="placed">
              <p class="placed__tick" aria-hidden="true">✓</p>
              <div>
                <h1 class="placed__title">Message sent</h1>
                <p class="muted">
                  Reference <span class="mono">${escape(contactSent.ref)}</span>. We reply
                  ${escape(contactSent.reply)} to ${escape(contactSent.email)}.
                </p>
              </div>
            </div>
            <p class="notice">
              This preview does not actually send anything. On the live build this creates a
              ticket routed to the ${escape(contactSent.channel)} inbox.
            </p>
            <a class="btn btn--ghost" href="#/contact" data-contact-again>Send another</a>
          </div>
        </section>`;
    }

    const d = contactDraft;
    const field = (name, label, type, extra) => `
      <label class="form__field${contactErrors[name] ? ' form__field--error' : ''}">
        <span class="form__label">${escape(label)}</span>
        <input class="form__input" type="${type}" name="${name}" value="${escape(d[name] || '')}" ${extra || ''}>
        ${contactErrors[name] ? `<span class="form__error">${escape(contactErrors[name])}</span>` : ''}
      </label>`;

    return `
      <section class="section">
        <div class="container">
          <p class="eyebrow">Support</p>
          <h1 class="page-title">Contact us</h1>
          <p class="muted lead">
            Four inboxes, each with a person behind it. Pick the one that matches and you get
            a faster answer than a general enquiry would.
          </p>

          <div class="checkout">
            <form class="form" id="contact-form" novalidate>
              <div class="form__row">
                ${field('name', 'Your name', 'text')}
                ${field('email', 'Email address', 'email')}
              </div>

              <div class="form__field${contactErrors.topic ? ' form__field--error' : ''}">
                <span class="form__label">What is this about?</span>
                <select class="form__input" name="topic">
                  <option value="">Choose one…</option>
                  ${C.topics
                    .map(
                      ([value, label]) =>
                        `<option value="${escape(value)}"${d.topic === value ? ' selected' : ''}>${escape(
                          label
                        )}</option>`
                    )
                    .join('')}
                </select>
                ${contactErrors.topic ? `<span class="form__error">${escape(contactErrors.topic)}</span>` : ''}
              </div>

              ${field('order', 'Order or batch number (optional)', 'text', 'placeholder="HB-26-0001 or DP-2607-A"')}

              <label class="form__field${contactErrors.message ? ' form__field--error' : ''}">
                <span class="form__label">Message</span>
                <textarea class="form__input" name="message" rows="7">${escape(d.message || '')}</textarea>
                ${
                  contactErrors.message
                    ? `<span class="form__error">${escape(contactErrors.message)}</span>`
                    : '<span class="form__hint">The more specific, the faster we can help.</span>'
                }
              </label>

              ${
                d.topic === 'safety'
                  ? `<p class="notice notice--warn">
                       <strong>If this is urgent, stop using the product now.</strong>
                       Do not throw it away — we may need it to work out whether other members are
                       holding the same problem. Safety messages are answered the same day.
                     </p>`
                  : ''
              }

              <div class="form__actions">
                <button class="btn btn--primary" type="button" data-contact-send>Send message</button>
              </div>
            </form>

            <aside class="checkout__summary">
              <h2 class="ds-label">Or email directly</h2>
              <ul class="channels">
                ${C.channels
                  .map(
                    (ch) => `
                  <li class="channel">
                    <p class="channel__label">${escape(ch.label)}</p>
                    <p class="channel__value"><a href="mailto:${escape(ch.value)}">${escape(ch.value)}</a></p>
                    <p class="muted channel__note">${escape(ch.note)}</p>
                    <p class="channel__reply">Replies ${escape(ch.reply)}</p>
                  </li>`
                  )
                  .join('')}
              </ul>

              <p class="muted sumnote">
                ${escape(L.company.name)}<br>${escape(L.company.address)}
              </p>
            </aside>
          </div>

          <div class="container narrow" style="padding-inline:0">
            <h2 class="ds-h2">Two things we cannot help with</h2>
            <ul class="pol-list">
              <li>
                <strong>Posting members-only items.</strong> Not by arrangement, not at your risk,
                not for a fee. ID has to be checked in person. See <a href="#/delivery">delivery</a>.
              </li>
              <li>
                <strong>Releasing an order to someone else.</strong> No proxies, no letters of
                authority. The named member collects, or nobody does.
              </li>
            </ul>
            <p class="muted ds-note">
              Neither is a policy we can make an exception to, and asking repeatedly will not
              change the answer — it is the basis on which the collective is allowed to operate.
            </p>
          </div>
        </div>
      </section>`;
  };

  /* ---------- events ---------- */

  const app = document.getElementById('app');

  app.addEventListener('click', (event) => {
    const cat = event.target.closest('[data-faqcat]');
    if (cat) {
      faqCategory = cat.dataset.faqcat;
      window.HB_RENDER();
      return;
    }

    if (event.target.closest('[data-faqclear]')) {
      faqCategory = '';
      faqQuery = '';
      window.HB_RENDER();
      return;
    }

    if (event.target.closest('[data-contact-again]')) {
      contactSent = null;
      contactDraft = {};
      contactErrors = {};
      return;
    }

    const send = event.target.closest('[data-contact-send]');
    if (send) {
      const form = document.getElementById('contact-form');
      const get = (n) => {
        const el = form.querySelector(`[name="${n}"]`);
        return el ? el.value.trim() : '';
      };

      contactDraft = {
        name: get('name'),
        email: get('email'),
        topic: get('topic'),
        order: get('order'),
        message: get('message'),
      };

      contactErrors = {};
      if (!contactDraft.name) contactErrors.name = 'Required.';
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactDraft.email)) contactErrors.email = 'Enter a valid email address.';
      if (!contactDraft.topic) contactErrors.topic = 'Pick the closest match.';
      if (contactDraft.message.length < 15) contactErrors.message = 'Tell us a bit more — at least a sentence.';

      if (Object.keys(contactErrors).length) {
        window.HB_RENDER();
        return;
      }

      const C = window.HB_LEGAL.contact;
      const routing = { safety: 'safety', privacy: 'privacy', membership: 'membership' };
      const channelId = routing[contactDraft.topic] || 'general';
      const channel = C.channels.find((c) => c.id === channelId);

      contactSent = {
        ref: `MSG-${Math.floor(Math.random() * 9000 + 1000)}`,
        email: contactDraft.email,
        reply: channel.reply,
        channel: channel.label.toLowerCase(),
      };
      contactDraft = {};
      contactErrors = {};
      window.HB_RENDER();
    }
  });

  app.addEventListener('input', (event) => {
    if (event.target.id !== 'faq-search') return;
    faqQuery = event.target.value;
    window.HB_RENDER();
    const input = document.getElementById('faq-search');
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  });

  app.addEventListener('change', (event) => {
    if (event.target.name !== 'topic') return;
    const form = document.getElementById('contact-form');
    if (!form) return;
    ['name', 'email', 'order', 'message'].forEach((n) => {
      const el = form.querySelector(`[name="${n}"]`);
      if (el) contactDraft[n] = el.value;
    });
    contactDraft.topic = event.target.value;
    window.HB_RENDER();
  });

  window.HB_SUPPORT = {
    // exposed so global search can index the answers
    faq: buildFaq,
    CATEGORIES,
    route(parts) {
      if (parts[0] === 'faq') return viewFaq();
      if (parts[0] === 'contact') return viewContact();
      return null;
    },
  };
})();
