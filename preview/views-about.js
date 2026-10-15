(function () {
  const { store, products, categories } = window.HB_DATA;

  const escape = (value) =>
    String(value === null || value === undefined ? '' : value).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );

  const money = (v) => `${store.currency_symbol}${v.toFixed(2)}`;

  /**
   * The stages of the model, defined once. The home page hero renders the short
   * form of these and the how-it-works page renders the long form, so the two
   * cannot drift into describing different processes.
   */
  const stages = () => {
    const M = window.HB_MEMBER;
    const O = window.HB_ORDER;

    return [
      {
        short: ['Apply', 'Submit ID and proof of address.'],
        title: 'Apply',
        body: `Give us your name, a photo of your ID and a proof of address dated in the last three
               months. It takes about five minutes. You need to be ${store.minimum_age} or older and
               resident in South Africa.`,
        link: ['#/membership/apply', 'Start an application'],
      },
      {
        short: ['Verify', `A person checks it, usually in ${M.LIMITS.verification_business_days} business days.`],
        title: 'We verify you',
        body: `A person reads every application — there is no automated approval. We check that the ID
               is real, that the date of birth in it puts you over ${store.minimum_age}, and that the
               address proof matches. Usually ${M.LIMITS.verification_business_days} business days.
               If something is wrong you are told what, so you can fix it and apply again.`,
      },
      {
        short: ['Browse', 'See potency, terpenes and the lab certificate.'],
        title: 'Browse the collection',
        body: `Every product lists its cannabinoid profile, terpenes and batch code, and every batch
               links to the certificate of analysis behind it. The CBD range is open to anyone —
               you do not need a membership for it.`,
        link: ['#/lab-results', 'Look up a batch'],
      },
      {
        short: ['Contribute', 'Cover cultivation and handling for your allocation.'],
        title: 'Contribute toward your allocation',
        body: `Standard members receive ${M.ALLOCATION.standard} units a month and premium members
               ${M.ALLOCATION.premium}. One unit is one item. What you pay is a contribution toward
               cultivation, testing and handling — not a retail purchase — and it is
               ${O.PAYMENT_METHODS.map((p) => p.label.toLowerCase()).join(' or ')}, never card.`,
      },
      {
        short: ['Collect', 'ID checked in person at handover.'],
        title: 'Collect in person',
        body: `Members-only items are handed over at one of our collection points, where your ID is
               checked against the document you verified with. Orders are held for
               ${O.SHIPPING.hold_hours} hours. The CBD range can be couriered —
               ${money(O.SHIPPING.courier_fee)}, free over ${money(O.SHIPPING.free_over)}.`,
        link: ['#/collection', 'Collection points'],
      },
    ];
  };

  /* ---------- how it works ---------- */

  const viewHowItWorks = () => {
    const M = window.HB_MEMBER;
    const O = window.HB_ORDER;
    const member = M.getMember();
    const statusCopy = window.HB_VIEWS.STATUS_COPY[member.status];

    return `
      <section class="section">
        <div class="container narrow">
          <p class="eyebrow">How it works</p>
          <h1 class="page-title">A collective, not a shop</h1>
          <p class="muted lead">
            Highveld Botanicals is a private members' collective. Members cover the cost of
            cultivating and testing their own allocation, and collect it in person. That
            structure is the point, not a formality — everything below follows from it.
          </p>

          <div class="notice notice--warn pol-lede">
            <strong>Why it is built this way.</strong>
            South African law permits private cultivation and private use, not public retail
            sale. A collective in which members are verified, allocated a personal quantity,
            and hand-checked at collection is a structure that fits that. An open shop front
            is not, which is why we do not run one.
          </div>

          <ol class="stages">
            ${stages()
              .map(
                (s, i) => `
              <li class="stage">
                <span class="stage__num">${i + 1}</span>
                <div>
                  <h2 class="stage__title">${escape(s.title)}</h2>
                  <p class="muted stage__body">${escape(s.body.replace(/\s+/g, ' '))}</p>
                  ${
                    s.link
                      ? `<a class="btn btn--ghost btn--small" href="${s.link[0]}">${escape(s.link[1])}</a>`
                      : ''
                  }
                </div>
              </li>`
              )
              .join('')}
          </ol>

          <h2 class="ds-h2">Tiers and allocation</h2>
          <div class="ds-scroll">
            <table class="table">
              <thead><tr><th>Tier</th><th>Monthly allocation</th><th>How you get it</th></tr></thead>
              <tbody>
                <tr>
                  <td><strong>Standard</strong></td>
                  <td class="mono">${M.ALLOCATION.standard} units</td>
                  <td class="muted">Assigned on approval</td>
                </tr>
                <tr>
                  <td><strong>Premium</strong></td>
                  <td class="mono">${M.ALLOCATION.premium} units</td>
                  <td class="muted">By review, for established members</td>
                </tr>
                <tr>
                  <td><strong>No membership</strong></td>
                  <td class="mono">—</td>
                  <td class="muted">CBD and hemp range only, open to anyone over ${store.minimum_age}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="muted ds-note">
            One unit is one item of any product, and you may order up to
            ${M.LIMITS.max_per_item} of any single product per order. Allocation resets on the
            first of the month and does not roll over. Cancelled and refunded orders return
            their units immediately.
          </p>

          <div class="panel">
            <p class="panel__status">
              Your status: <span class="pill pill--${statusCopy.tone}">${escape(statusCopy.label)}</span>
            </p>
            ${
              member.status === 'unverified'
                ? '<a class="btn btn--primary" href="#/membership/apply">Apply for membership</a>'
                : '<a class="btn btn--primary" href="#/account">View your membership</a>'
            }
          </div>

          <h2 class="ds-h2">What we do with your documents</h2>
          <p class="pol-body">
            Your ID number and uploaded documents are special personal information under
            POPIA. We use them only to verify age and residency, we do not share them, and
            your ID number itself is never stored — only the last four digits, so we can
            match you at handover. Full detail in the
            <a href="#/privacy">privacy policy</a>.
          </p>

          <h2 class="ds-h2">Common questions at this point</h2>
          <ul class="pol-list">
            <li><strong>Can I have it delivered?</strong> Only the CBD range. Members-only items are handed over in person because your ID has to be checked. <a href="#/delivery">Delivery policy</a>.</li>
            <li><strong>Why can I not pay by card?</strong> Card networks and the gateways prohibit these products. <a href="#/faq">More in the FAQ</a>.</li>
            <li><strong>What if a batch is wrong?</strong> Stop using it and tell us. <a href="#/recalls">Recalls and safety notices</a>.</li>
          </ul>

          <p class="muted pol-updated">
            More detail: <a href="#/about">about the collective</a>, <a href="#/faq">FAQ</a>,
            <a href="#/terms">terms of service</a>.
          </p>
        </div>
      </section>`;
  };

  /* ---------- about ---------- */

  const viewAbout = () => {
    const L = window.HB_LEGAL;
    const flowerCount = products.filter((p) => p.category === 'flower').length;
    const batchCount = new Set(products.map((p) => p.batch_id)).size;

    return `
      <section class="section">
        <div class="container narrow">
          <p class="eyebrow">About</p>
          <h1 class="page-title">Landrace genetics, kept honest</h1>
          <p class="muted lead">
            A small collective growing South African landrace cultivars, testing every batch,
            and publishing the results whether they flatter us or not.
          </p>

          ${
            L.placeholder
              ? `<div class="coa-specimen" role="note">
                   <strong>PLACEHOLDER CONTENT.</strong>
                   The founding story, dates and people on this page are not written yet —
                   the structure is here, the substance is yours to supply. Do not publish
                   invented history about a real business.
                 </div>`
              : ''
          }

          <h2 class="ds-h2">What we grow</h2>
          <p class="pol-body">
            ${flowerCount} landrace and landrace-derived flower lines, plus pre-rolls, measured-dose
            edibles, extracts and a non-intoxicating CBD range. The focus is South African and
            southern African genetics — Durban Poison, Swazi Gold, Malawi lines — grown slowly
            and cured properly rather than pushed for yield.
          </p>
          <p class="pol-body">
            Landrace cultivars are harder to grow than modern hybrids. They take longer, they
            stretch, and they do not all finish at once. We grow them because they are what
            this part of the world actually produced before the seed market homogenised, and
            because they taste like somewhere.
          </p>

          <h2 class="ds-h2">Testing</h2>
          <p class="pol-body">
            Every batch is tested by an independent laboratory before release — cannabinoid
            potency, terpene profile, pesticides, heavy metals, microbials and mycotoxins.
            All ${batchCount} certificates currently on file are published in full, including
            the numbers we would rather round.
          </p>
          <p class="pol-body">
            <a class="btn btn--ghost btn--small" href="#/lab-results">Read the certificates</a>
          </p>

          <h2 class="ds-h2">What we will not do</h2>
          <ul class="pol-list">
            <li><strong>Sell to anyone unverified.</strong> Age and residency are checked by a person, and checked again at handover.</li>
            <li><strong>Courier members-only items.</strong> No exceptions, no matter who asks or how.</li>
            <li><strong>Make a medical claim.</strong> We will tell you what is in a batch. We will not tell you what it treats.</li>
            <li><strong>Market to people who are not members</strong>, or build advertising profiles from anyone's order history.</li>
            <li><strong>Publish a certificate we did not receive</strong>, or quietly drop one that came back badly.</li>
          </ul>

          <h2 class="ds-h2">Who we are</h2>
          <p class="pol-body">
            ${escape(L.company.name)}, registration ${escape(L.company.registration)},
            ${escape(L.company.address)}.
          </p>
          <p class="muted pol-body">
            <em>Founding story, the people involved and how the collective started go here.
            Written by someone who was actually there, not by an assistant guessing at it.</em>
          </p>

          <h2 class="ds-h2">Talk to us</h2>
          <p class="pol-body">
            <a class="btn btn--primary" href="#/contact">Contact us</a>
            <a class="btn btn--ghost" href="#/how-it-works" style="margin-left:.5rem">How it works</a>
          </p>

          <p class="muted pol-updated">
            Related: <a href="#/how-it-works">how it works</a>, <a href="#/faq">FAQ</a>,
            <a href="#/terms">terms</a>.
          </p>
        </div>
      </section>`;
  };

  window.HB_ABOUT = {
    stages,
    route(parts) {
      if (parts[0] === 'about') return viewAbout();
      if (parts[0] === 'how-it-works') return viewHowItWorks();
      // #/membership was a second copy of this page; keep old links working
      if (parts[0] === 'membership' && !parts[1]) return viewHowItWorks();
      return null;
    },
  };
})();
