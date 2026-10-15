(function () {
  const { store } = window.HB_DATA;

  const escape = (value) =>
    String(value === null || value === undefined ? '' : value).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );

  const money = (v) => `${store.currency_symbol}${v.toFixed(2)}`;

  const UPDATED = '1 August 2026';

  /* ---------- shipping & delivery ---------- */

  const viewDelivery = () => {
    const S = window.HB_ORDER.SHIPPING;

    return `
      <section class="section">
        <div class="container narrow">
          <p class="eyebrow">Policy</p>
          <h1 class="page-title">Shipping &amp; delivery</h1>
          <p class="muted lead">
            How your order reaches you, what it costs, and the one thing we will never
            put in a courier bag.
          </p>

          <div class="notice notice--warn pol-lede">
            <strong>Members-only items are not couriered. Ever.</strong>
            Anything outside the CBD range is handed over in person so we can check your ID
            against the document you verified with. There is no workaround for this, and
            asking us to post it will get the order cancelled and refunded.
          </div>

          <h2 class="ds-h2">The short version</h2>
          <div class="ds-scroll">
            <table class="table">
              <thead><tr><th>What you ordered</th><th>How it reaches you</th><th>Cost</th><th>How long</th></tr></thead>
              <tbody>
                <tr>
                  <td><strong>Anything members-only</strong><span class="muted coa-method">Flower, pre-rolls, edibles, vapes</span></td>
                  <td>Collection in person only</td>
                  <td>Free</td>
                  <td>Ready ${escape(S.collection_ready)}</td>
                </tr>
                <tr>
                  <td><strong>CBD &amp; wellness</strong><span class="muted coa-method">Non-intoxicating, no membership needed</span></td>
                  <td>Collection or courier</td>
                  <td>${money(S.courier_fee)}, free over ${money(S.free_over)}</td>
                  <td>${escape(S.courier_main)} to main centres</td>
                </tr>
                <tr>
                  <td><strong>A mixed order</strong></td>
                  <td>Collection for the whole order</td>
                  <td>Free</td>
                  <td>Ready ${escape(S.collection_ready)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="muted ds-note">
            Checkout applies these rules for you — the courier option is simply not
            selectable when your cart contains a members-only item.
          </p>

          <h2 class="ds-h2">Collection</h2>
          <p class="pol-body">
            We hold three collection points. Pick one at checkout, or save a default under
            <a href="#/account/details">Account → Details</a>.
          </p>
          <ul class="pol-list">
            <li><strong>Ready ${escape(S.collection_ready)}.</strong> You get an SMS when it is packed and waiting.</li>
            <li><strong>Held for ${S.hold_hours} hours.</strong> After that the order is returned to stock and your allocation is credited back.</li>
            <li><strong>Bring the ID you verified with.</strong> The physical document, not a photo of it. Handover is refused without it.</li>
            <li><strong>The named member collects.</strong> We cannot hand over to a partner, friend, driver or anyone else, whatever authorisation they carry.</li>
          </ul>
          <p class="pol-body">
            <a class="btn btn--ghost" href="#/collection">Collection points, hours and directions</a>
          </p>

          <h2 class="ds-h2">Courier — CBD range only</h2>
          <ul class="pol-list">
            <li><strong>${money(S.courier_fee)} flat, free over ${money(S.free_over)}.</strong> Calculated on the order subtotal before any fee.</li>
            <li><strong>${escape(S.coverage)}.</strong> We do not ship across borders. Exporting these products is regulated and we are not licensed for it.</li>
            <li><strong>${escape(S.courier_main)}</strong> to Johannesburg, Pretoria, Cape Town, Durban, Gqeberha and Bloemfontein. <strong>${escape(S.courier_outlying)}</strong> elsewhere.</li>
            <li><strong>Orders placed before ${escape(S.cutoff)}</strong> on a business day go out the same day, once payment has cleared. The clock starts at payment, not at checkout.</li>
            <li><strong>Signature and 18+ ID on delivery.</strong> ${escape(S.carrier)} will not leave a parcel with a minor, at a security gate, or without a signature.</li>
            <li><strong>No PO boxes or lockers.</strong> Someone has to sign.</li>
          </ul>

          <h2 class="ds-h2">Packaging</h2>
          <p class="pol-body">
            Everything goes out in plain, unbranded, odour-sealed packaging. The waybill
            shows a company name and nothing about the contents. No branding, no product
            names, no leaf motifs on the outside of the box.
          </p>

          <h2 class="ds-h2">If delivery fails</h2>
          <ul class="pol-list">
            <li>The courier makes <strong>two attempts</strong>, then holds the parcel at the nearest depot for five days.</li>
            <li>Uncollected parcels come back to us. We refund the order less the original courier fee.</li>
            <li>A re-delivery after a failed attempt costs ${money(S.courier_fee)}, regardless of the free-shipping threshold.</li>
            <li>Wrong address given at checkout is a re-delivery, not a failed delivery — the fee applies.</li>
          </ul>

          <h2 class="ds-h2">Tracking</h2>
          <p class="pol-body">
            A tracking number appears on your <a href="#/account/orders">order page</a> once
            the parcel is collected by ${escape(S.carrier)}, and goes to you by email and SMS.
          </p>

          <h2 class="ds-h2">What we do not do</h2>
          <ul class="pol-list">
            <li><strong>International shipping.</strong> Not to anywhere, including countries where these products are legal.</li>
            <li><strong>Courier for members-only items.</strong> Covered above, and worth repeating.</li>
            <li><strong>Third-party collection.</strong> No proxies, no couriers you arrange yourself.</li>
            <li><strong>Delivery to a workplace</strong> without the recipient present to sign.</li>
          </ul>

          <p class="muted pol-updated">Last updated ${escape(UPDATED)}.</p>
        </div>
      </section>`;
  };

  /* ---------- collection points ---------- */

  const viewCollection = () => {
    const O = window.HB_ORDER;
    const S = O.SHIPPING;

    return `
      <section class="section">
        <div class="container">
          <p class="eyebrow">Collection</p>
          <h1 class="page-title">Collection points</h1>
          <p class="muted lead">
            Three points, by appointment window rather than walk-in. Bring the ID you
            verified with — handover is refused without it.
          </p>

          <ul class="points">
            ${O.COLLECTION_POINTS.map(
              (pt) => `
              <li class="point">
                <h2 class="point__name">${escape(pt.name)}</h2>
                <p class="point__province">${escape(pt.province)}</p>
                <p class="muted point__address">${escape(pt.address)}</p>
                <p class="point__hours"><strong>${escape(pt.hours)}</strong></p>
                <a class="btn btn--ghost btn--small" href="https://www.google.com/maps/search/${encodeURIComponent(
                  pt.address
                )}" target="_blank" rel="noopener noreferrer">Directions</a>
              </li>`
            ).join('')}
          </ul>

          <div class="container narrow" style="padding-inline:0">
            <h2 class="ds-h2">How handover works</h2>
            <ol class="steps-long">
              <li>
                <h2>You get an SMS</h2>
                <p class="muted">Sent ${escape(S.collection_ready)}, with your order number and the window to come in.</p>
              </li>
              <li>
                <h2>Bring your ID and order number</h2>
                <p class="muted">The physical document you verified with. A photo of it, a copy, or a different document will not do.</p>
              </li>
              <li>
                <h2>We check it against your record</h2>
                <p class="muted">Name and ID number are matched to the verified member on the order. This takes about a minute.</p>
              </li>
              <li>
                <h2>You sign, we log it</h2>
                <p class="muted">The handover is recorded against the order with the time and the staff member who checked your ID.</p>
              </li>
            </ol>

            <h2 class="ds-h2">Holding period</h2>
            <p class="pol-body">
              Orders are held for <strong>${S.hold_hours} hours</strong> from the moment they
              are marked ready. After that they go back into stock, the order is cancelled,
              and any allocation it used is credited back to you. If you have paid by EFT you
              are refunded in full.
            </p>

            <h2 class="ds-h2">If you cannot make it</h2>
            <p class="pol-body">
              Tell us before the window closes and we will hold it longer. What we cannot do
              is release your order to somebody else — not a partner, not a housemate, not a
              driver with a letter. The ID check is the entire basis on which we are allowed
              to hand anything over.
            </p>

            <p class="muted pol-updated">Last updated ${escape(UPDATED)}.</p>
          </div>
        </div>
      </section>`;
  };


  /* ---------- returns & refunds ---------- */

  const viewReturns = () => {
    const O = window.HB_ORDER;
    const R = O.REFUNDS;
    const S = O.SHIPPING;

    return `
      <section class="section">
        <div class="container narrow">
          <p class="eyebrow">Policy</p>
          <h1 class="page-title">Returns &amp; refunds</h1>
          <p class="muted lead">
            What we can take back, what we cannot, and what you are owed regardless of
            anything written on this page.
          </p>

          <div class="notice notice--warn pol-lede">
            <strong>Opened consumables cannot be returned.</strong>
            Once a seal is broken on flower, a pre-roll, an edible or a cartridge, we
            cannot verify how it was stored or whether it was tampered with, so it can
            never go back into stock for another member. This is a health rule, not a
            commercial one, and it does not change however recently you bought it.
          </div>

          <h2 class="ds-h2">What you can return</h2>
          <div class="ds-scroll">
            <table class="table">
              <thead><tr><th>Situation</th><th>Window</th><th>You get</th></tr></thead>
              <tbody>
                <tr>
                  <td><strong>Order not collected yet</strong><span class="muted coa-method">Cancel before handover</span></td>
                  <td>Any time before collection</td>
                  <td>Full refund, allocation credited back</td>
                </tr>
                <tr>
                  <td><strong>Sealed CBD item, unopened</strong><span class="muted coa-method">Courier orders, seal intact</span></td>
                  <td>${R.sealed_window_days} days from delivery</td>
                  <td>Full refund less the original courier fee</td>
                </tr>
                <tr>
                  <td><strong>Faulty, damaged or not what you ordered</strong></td>
                  <td>${R.defect_window_months} months</td>
                  <td>Refund or replacement, your choice</td>
                </tr>
                <tr>
                  <td><strong>Batch recalled or fails a retest</strong></td>
                  <td>No limit</td>
                  <td>Full refund, we collect it, allocation credited back</td>
                </tr>
                <tr>
                  <td><strong>Opened consumable, changed your mind</strong></td>
                  <td>—</td>
                  <td>Nothing. See above.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 class="ds-h2">Your rights, which this page cannot shrink</h2>
          <p class="pol-body">
            Section 56 of the Consumer Protection Act gives you ${R.defect_window_months}
            months to return goods that are unsafe, defective, or not fit for the purpose
            they were sold for. You choose whether that is a refund, a replacement or a
            repair — not us. Nothing on this page overrides that, and if anything here
            appears to, the Act wins.
          </p>
          <p class="pol-body">
            What the Act also does is exempt us from taking back goods that cannot be
            resold for health reasons. That is the basis for the rule at the top.
          </p>

          <h2 class="ds-h2">Cancelling before collection</h2>
          <ul class="pol-list">
            <li><strong>Cancel any time before handover</strong> from your <a href="#/account/orders">order page</a>. No fee, no reason needed.</li>
            <li><strong>Units go back to your allocation immediately</strong> — the same month they were taken from.</li>
            <li><strong>Unpaid orders cancel themselves</strong> after ${S.hold_hours} hours, with the same credit back.</li>
          </ul>

          <h2 class="ds-h2">How refunds are paid</h2>
          <ul class="pol-list">
            <li><strong>Paid by EFT?</strong> It goes back to the account it came from. We do not pay refunds to a different account than the one that paid — that is a fraud control, and we will not make exceptions over email.</li>
            <li><strong>Paid cash at collection?</strong> We need your bank details, and the account must be in the member's name.</li>
            <li><strong>Processing takes ${escape(R.processing)}</strong> from the day we approve it.</li>
            <li><strong>No restocking fee.</strong> ${R.restock_fee === 0 ? 'We do not charge one.' : `${money(R.restock_fee)} applies.`}</li>
          </ul>

          <h2 class="ds-h2">How to start a return</h2>
          <ol class="steps-long">
            <li>
              <h2>Open the order</h2>
              <p class="muted">Find it under <a href="#/account/orders">Account → Orders</a>. Eligible orders show a return option.</p>
            </li>
            <li>
              <h2>Tell us what is wrong</h2>
              <p class="muted">A photo helps for damage. For a suspected potency or contamination problem, quote the batch code — we will pull the certificate and, if needed, retest.</p>
            </li>
            <li>
              <h2>Do not post it</h2>
              <p class="muted">Never put a members-only item in the mail, even to return it. We arrange collection, or you bring it to a collection point.</p>
            </li>
            <li>
              <h2>We decide within two business days</h2>
              <p class="muted">If we are wrong, you are refunded. If it is a close call, you are refunded.</p>
            </li>
          </ol>

          <h2 class="ds-h2">Things that are not defects</h2>
          <ul class="pol-list">
            <li><strong>It affected you differently than you expected.</strong> Tolerance varies enormously between people and between sessions. That is not a fault in the product.</li>
            <li><strong>The effect was stronger than you wanted.</strong> Start lower next time — the dosing guidance on each product page is there for this.</li>
            <li><strong>You did not like the taste or the smell.</strong></li>
            <li><strong>Potency differs slightly from the label.</strong> Cannabinoid testing carries a tolerance. A result inside it is not a mislabelling. A result outside it is, and that is a refund.</li>
          </ul>

          <h2 class="ds-h2">If something is genuinely wrong with a batch</h2>
          <p class="pol-body">
            Stop using it and tell us straight away. Do not throw it away — we may need it
            for a retest, and that retest is how we find out whether other members are
            holding the same problem.
            See <a href="#/recalls">batch recalls and safety notices</a>.
          </p>

          <p class="muted pol-updated">Last updated ${escape(UPDATED)}.</p>
        </div>
      </section>`;
  };

  /* ---------- recalls ---------- */

  const RECALLS = [];

  const viewRecalls = () => {
    const O = window.HB_ORDER;

    return `
      <section class="section">
        <div class="container narrow">
          <p class="eyebrow">Safety</p>
          <h1 class="page-title">Batch recalls</h1>
          <p class="muted lead">
            Every active recall and safety notice, listed by batch. Check the code on your
            packaging against this page.
          </p>

          ${
            RECALLS.length === 0
              ? `<div class="recall-none">
                   <p class="recall-none__tick" aria-hidden="true">✓</p>
                   <div>
                     <p class="recall-none__title">No active recalls</p>
                     <p class="muted">
                       No batch is currently subject to a recall or safety notice. This page
                       is updated the same day any notice is issued.
                     </p>
                   </div>
                 </div>`
              : `<ul class="pol-list">${RECALLS.map(
                  (r) => `<li><strong>${escape(r.batch_id)}</strong> — ${escape(r.reason)}</li>`
                ).join('')}</ul>`
          }

          <h2 class="ds-h2">Check your batch</h2>
          <p class="pol-body">
            Every batch we have released has a certificate of analysis on file. If your
            batch code does not appear in the register at all, do not use the product and
            contact us — it did not come from us, or it left before it was cleared.
          </p>
          <p class="pol-body">
            <a class="btn btn--ghost" href="#/lab-results">Look up a batch code</a>
          </p>

          <h2 class="ds-h2">How we would tell you</h2>
          <ul class="pol-list">
            <li><strong>SMS and email</strong> to every member who received the batch, within 24 hours of the decision.</li>
            <li><strong>A notice on this page</strong> and a banner across the store.</li>
            <li><strong>The affected product is pulled</strong> from sale immediately, before anyone is contacted.</li>
            <li>We contact you <strong>whether or not the batch is dangerous</strong> — a labelling error gets the same treatment as a contamination result.</li>
          </ul>

          <h2 class="ds-h2">What to do if your batch is recalled</h2>
          <ol class="steps-long">
            <li>
              <h2>Stop using it</h2>
              <p class="muted">Immediately, and before you decide whether you agree with the recall.</p>
            </li>
            <li>
              <h2>Keep it sealed and set it aside</h2>
              <p class="muted">Do not throw it away. We may need it to work out how far the problem goes.</p>
            </li>
            <li>
              <h2>Do not post it back</h2>
              <p class="muted">We arrange collection at our cost, or you bring it to a collection point.</p>
            </li>
            <li>
              <h2>You are refunded in full</h2>
              <p class="muted">Including any courier fee, and your allocation is credited back. No window, no conditions, opened or not.</p>
            </li>
          </ol>

          <h2 class="ds-h2">Why a batch gets recalled</h2>
          <ul class="pol-list">
            <li><strong>A retest fails</strong> a contaminant panel that the release test passed.</li>
            <li><strong>A labelling error</strong> — the potency printed does not match the certificate.</li>
            <li><strong>A storage or transport failure</strong> that could have affected the product.</li>
            <li><strong>A credible member report</strong> that we cannot rule out. We recall first and investigate after.</li>
          </ul>

          <p class="muted pol-updated">Last updated ${escape(UPDATED)}.</p>
        </div>
      </section>`;
  };


  /* ---------- terms of service ---------- */

  const viewTerms = () => {
    const L = window.HB_LEGAL;
    const O = window.HB_ORDER;
    const M = window.HB_MEMBER;

    return `
      <section class="section">
        <div class="container narrow">
          <p class="eyebrow">Legal</p>
          <h1 class="page-title">Terms of service</h1>
          <p class="muted lead">
            The agreement between you and ${escape(L.company.name)}. Written to be read,
            not to be survived.
          </p>

          ${L.placeholder ? placeholderNotice() : ''}

          <div class="notice notice--warn pol-lede">
            <strong>This is a private collective, not a shop.</strong>
            Membership is a condition of access to everything except the CBD range, and
            what you pay is a contribution toward cultivation, testing and handling of your
            own allocation. If that framing does not suit you, do not apply.
          </div>

          <h2 class="ds-h2">1. Who you are dealing with</h2>
          <p class="pol-body">
            ${escape(L.company.name)}, registration ${escape(L.company.registration)},
            trading as ${escape(L.company.trading_as)}, ${escape(L.company.address)}.
            Contact ${escape(L.company.email)}.
          </p>

          <h2 class="ds-h2">2. Who may join</h2>
          <ul class="pol-list">
            <li><strong>${window.HB_DATA.store.minimum_age} years or older.</strong> Verified against a government-issued ID, not self-declared.</li>
            <li><strong>Resident in ${escape(L.company.country)}</strong>, at the address you provide proof for.</li>
            <li><strong>Applying for yourself.</strong> One membership per person. You may not apply on behalf of anyone else.</li>
          </ul>

          <h2 class="ds-h2">3. Verification</h2>
          <p class="pol-body">
            We check your ID and proof of address before approving you, and again at every
            handover. We may refuse an application without giving detailed reasons where
            doing so would compromise the check itself, but we will always tell you enough
            to correct an honest problem and re-apply.
          </p>

          <h2 class="ds-h2">4. Allocation and fair use</h2>
          <ul class="pol-list">
            <li>Standard members receive <strong>${M.ALLOCATION.standard} units a month</strong>, premium members <strong>${M.ALLOCATION.premium}</strong>. Unused units do not roll over.</li>
            <li>Allocation exists so that one member cannot accumulate quantities that stop looking like personal use. That is the whole reason for it.</li>
            <li>Cancelled and refunded orders return their units to the month they were taken from.</li>
          </ul>

          <h2 class="ds-h2">5. What you agree not to do</h2>
          <ul class="pol-list">
            <li><strong>Resell or supply anything you receive.</strong> Not to friends, not at cost, not as a gift. This ends your membership immediately and is the one thing we do not discuss.</li>
            <li><strong>Supply anyone under 18</strong>, or let anyone under 18 access what you hold.</li>
            <li><strong>Let someone else use your membership</strong> or collect on your behalf.</li>
            <li><strong>Drive or operate machinery</strong> after use. South African law treats this the same as alcohol.</li>
            <li><strong>Take anything across a border.</strong> Including to countries where it is legal.</li>
          </ul>

          <h2 class="ds-h2">6. Orders and payment</h2>
          <ul class="pol-list">
            <li>An order is an offer. It is accepted when we mark it ready, not when you place it.</li>
            <li>We do not accept card payment. ${escape(O.PAYMENT_METHODS.map((p) => p.label).join(' or '))} only.</li>
            <li>Nothing is released before payment clears and ID is checked.</li>
            <li>Prices can change, but never after you have placed an order.</li>
            <li>If we get a price obviously wrong, we will cancel and refund rather than honour it. We will not do this over small amounts.</li>
          </ul>

          <h2 class="ds-h2">7. Product information</h2>
          <p class="pol-body">
            Every batch is lab-tested and the certificate is published. Potency figures carry
            the tolerance of the test method. Effects described on product pages are what
            members commonly report, not predictions about you — tolerance varies enormously
            between people and between sessions.
          </p>
          <p class="pol-body">
            <strong>Nothing on this site is a medical claim or medical advice.</strong> We do
            not say these products treat, cure or prevent anything, and if you are pregnant,
            breastfeeding, on medication or being treated for a mental-health condition, talk
            to a doctor rather than to us.
          </p>

          <h2 class="ds-h2">8. Suspension and termination</h2>
          <p class="pol-body">
            We can suspend or end a membership for reselling, supplying a minor, providing
            false verification documents, repeated no-shows at collection, or abuse of staff.
            Where it is not a safety matter we will tell you first and give you a chance to
            respond. You can close your membership at any time by emailing us.
          </p>

          <h2 class="ds-h2">9. Liability</h2>
          <p class="pol-body">
            We are responsible for the product being what the certificate says it is, safely
            handled and correctly labelled. We are not responsible for how it affects you
            individually, or for anything that follows from use contrary to these terms.
          </p>
          <p class="pol-body">
            <strong>What we cannot limit, we do not try to.</strong> The
            ${escape(L.statutes.cpa)} makes suppliers liable for harm caused by unsafe or
            defective goods, and nothing here reduces that. Where any clause on this page
            conflicts with the Act, the Act applies.
          </p>

          <h2 class="ds-h2">10. If we disagree</h2>
          <p class="pol-body">
            Email us first — most things end there. If they do not, you can approach the
            <a href="${escape(L.consumer_commission.site)}" target="_blank" rel="noopener noreferrer">${escape(
      L.consumer_commission.name
    )}</a>. These terms are governed by South African law and subject to ${escape(L.jurisdiction)}.
          </p>

          <h2 class="ds-h2">11. Changes</h2>
          <p class="pol-body">
            We will email members before any change that affects what you may buy, what you
            pay, or how your data is handled. Changes are not applied to orders already placed.
          </p>

          <p class="muted pol-updated">
            Last updated ${escape(UPDATED)}. Related:
            <a href="#/privacy">privacy policy</a>, <a href="#/returns">returns</a>,
            <a href="#/delivery">delivery</a>.
          </p>
        </div>
      </section>`;
  };

  /* ---------- privacy policy ---------- */

  const placeholderNotice = () => `
    <div class="coa-specimen" role="note">
      <strong>PLACEHOLDER DETAILS.</strong>
      The company registration number, addresses and Information Officer named on this page
      are invented for the preview. Replace every one before publishing — members rely on
      these to exercise rights that have to reach a real person.
    </div>`;

  const viewPrivacy = () => {
    const L = window.HB_LEGAL;
    const R = L.retention;

    const storageRows = L.client_storage
      .map(
        ([key, purpose, retentionKey]) => `
        <tr>
          <td class="mono">${escape(key)}</td>
          <td>${escape(purpose)}</td>
          <td class="muted">${retentionKey ? `${R[retentionKey]} days` : 'Until you clear it'}</td>
        </tr>`
      )
      .join('');

    return `
      <section class="section">
        <div class="container narrow">
          <p class="eyebrow">Legal</p>
          <h1 class="page-title">Privacy policy</h1>
          <p class="muted lead">
            What we collect, why, how long we keep it, and what you can make us do about it.
          </p>

          ${L.placeholder ? placeholderNotice() : ''}

          <div class="notice notice--warn pol-lede">
            <strong>Your ID number is not stored.</strong>
            We use it once to verify your age and the checksum, then keep only the last four
            digits so we can match you at handover. The full number is never written to our
            records.
          </div>

          <h2 class="ds-h2">Who is responsible</h2>
          <p class="pol-body">
            ${escape(L.company.name)} is the responsible party under the
            ${escape(L.statutes.popia)}.
            Our ${escape(L.information_officer.title)} can be reached at
            ${escape(L.information_officer.email)}. ${escape(L.information_officer.note)}
          </p>

          <h2 class="ds-h2">What we collect and why</h2>
          <div class="ds-scroll">
            <table class="table">
              <thead><tr><th>What</th><th>Why</th><th>Kept for</th></tr></thead>
              <tbody>
                <tr>
                  <td><strong>Name, email, mobile</strong></td>
                  <td>To identify you and contact you about orders</td>
                  <td>While you are a member</td>
                </tr>
                <tr>
                  <td><strong>Date of birth</strong><span class="muted coa-method">Derived from your ID number</span></td>
                  <td>To prove you are over 18</td>
                  <td>While you are a member</td>
                </tr>
                <tr>
                  <td><strong>Last 4 digits of ID</strong><span class="muted coa-method">Never the full number</span></td>
                  <td>To match you at handover</td>
                  <td>While you are a member</td>
                </tr>
                <tr>
                  <td><strong>ID document and proof of address</strong><span class="muted coa-method">Special personal information</span></td>
                  <td>To verify age and residency</td>
                  <td>${R.identity_documents_months} months after membership ends</td>
                </tr>
                <tr>
                  <td><strong>Address</strong></td>
                  <td>Residency check and, for CBD, delivery</td>
                  <td>While you are a member</td>
                </tr>
                <tr>
                  <td><strong>Order history</strong></td>
                  <td>Fulfilment, allocation, recalls, tax records</td>
                  <td>${R.order_records_years} years, identity documents stripped</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 class="ds-h2">Special personal information</h2>
          <p class="pol-body">
            Identity documents are <strong>special personal information</strong> under POPIA
            s.26, and we process them on the basis of the explicit consent you give in the
            fourth declaration on the application form. We record when you gave it.
            You can withdraw it at any time, but doing so ends your membership — age and
            residency verification is the entire basis on which we are permitted to supply
            you at all.
          </p>

          <h2 class="ds-h2">What we do not do with it</h2>
          <ul class="pol-list">
            <li><strong>We do not sell or rent your data.</strong> Not to anyone, for any amount.</li>
            <li><strong>We do not build marketing segments</strong> from your identity documents or your order history.</li>
            <li><strong>We do not profile you</strong> or make automated decisions about you. Every verification decision is made by a person.</li>
            <li><strong>We do not transfer your data outside South Africa.</strong></li>
          </ul>

          <h2 class="ds-h2">Who else sees any of it</h2>
          <ul class="pol-list">
            <li><strong>The courier</strong> — name, delivery address and phone, for CBD orders only. Never what is in the parcel.</li>
            <li><strong>Our bank</strong> — the reference on your payment, which is your order number.</li>
            <li><strong>The laboratory</strong> — batch identifiers only. They receive no personal data at all.</li>
            <li><strong>Law enforcement</strong> — only on a valid legal instrument, and we will tell you unless legally barred from doing so.</li>
          </ul>

          <h2 class="ds-h2">What the site stores in your browser</h2>
          <p class="pol-body">
            No third-party trackers, no advertising pixels, no analytics that identify you.
            What the site does keep locally is this, and it never leaves your device except
            where noted:
          </p>
          <div class="ds-scroll">
            <table class="table">
              <thead><tr><th>Key</th><th>What it is for</th><th>Kept</th></tr></thead>
              <tbody>${storageRows}</tbody>
            </table>
          </div>
          <p class="muted ds-note">
            Clearing your browser data removes all of it. On the live build, membership and
            order records also live server-side and clearing your browser will not delete those.
          </p>

          <h2 class="ds-h2">Your rights</h2>
          <ul class="pol-list">
            <li><strong>Access.</strong> Ask for everything we hold about you. We answer within ${R.export_request_days} days.</li>
            <li><strong>Correction.</strong> Have anything inaccurate fixed.</li>
            <li><strong>Deletion.</strong> Ask us to delete your documents. Done within ${R.deletion_request_days} days.</li>
            <li><strong>Objection.</strong> Object to processing, understanding it ends your membership.</li>
            <li><strong>Complaint.</strong> Go to the regulator directly. You do not have to come to us first.</li>
          </ul>
          <p class="pol-body">
            Start any of these from <a href="#/account/privacy">Account → Privacy</a>, or email
            ${escape(L.information_officer.email)}.
          </p>

          <h2 class="ds-h2">Security</h2>
          <ul class="pol-list">
            <li>Identity documents are encrypted at rest and are <strong>not readable from the storefront</strong> — not by you, not by anyone browsing.</li>
            <li>Access is limited by role, and every view of a document is logged against the staff member who opened it.</li>
            <li>We retain documents for the shortest period that lets us prove a verification was properly done.</li>
          </ul>

          <h2 class="ds-h2">If there is a breach</h2>
          <p class="pol-body">
            POPIA s.22 requires us to notify the ${escape(L.regulator.name)} and every
            affected person as soon as reasonably possible. We will tell you what was taken,
            when, and what we are doing — including when the news is bad for us.
          </p>

          <h2 class="ds-h2">Children</h2>
          <p class="pol-body">
            We do not knowingly process the personal information of anyone under 18. The age
            gate and the verification step exist to prevent it. If you believe we hold data
            about a minor, tell the Information Officer and we will delete it immediately.
          </p>

          <h2 class="ds-h2">Complaints</h2>
          <p class="pol-body">
            <a href="${escape(L.regulator.site)}" target="_blank" rel="noopener noreferrer">${escape(
      L.regulator.name
    )}</a> — ${escape(L.regulator.email)}
          </p>

          <p class="muted pol-updated">
            Last updated ${escape(UPDATED)}. Related:
            <a href="#/terms">terms of service</a>, <a href="#/account/privacy">your documents</a>.
          </p>
        </div>
      </section>`;
  };

  window.HB_POLICY = {
    route(parts) {
      if (parts[0] === 'delivery') return viewDelivery();
      if (parts[0] === 'collection') return viewCollection();
      if (parts[0] === 'returns') return viewReturns();
      if (parts[0] === 'recalls') return viewRecalls();
      if (parts[0] === 'terms') return viewTerms();
      if (parts[0] === 'privacy') return viewPrivacy();
      return null;
    },
  };
})();
