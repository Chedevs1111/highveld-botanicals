(function () {
  const M = window.HB_MEMBER;

  const escape = (value) =>
    String(value === null || value === undefined ? '' : value).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );

  const date = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const dateTime = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const kb = (bytes) => `${Math.round(bytes / 1024)} kB`;

  const STATUS_COPY = {
    unverified: { label: 'Not a member', tone: 'neutral' },
    pending: { label: 'Under review', tone: 'pending' },
    approved: { label: 'Verified member', tone: 'ok' },
    rejected: { label: 'Not approved', tone: 'bad' },
    expired: { label: 'Expired', tone: 'bad' },
  };

  /* ---------- wizard state ---------- */

  const STEPS = ['Your details', 'Identity', 'Address', 'Declarations'];
  let step = 1;
  let draft = { address: {}, declarations: {} };
  let errors = {};

  const resetWizard = () => {
    step = 1;
    draft = { address: {}, declarations: {} };
    errors = {};
  };

  const field = (name, label, type, value, extra) => `
    <label class="form__field${errors[name] ? ' form__field--error' : ''}">
      <span class="form__label">${escape(label)}</span>
      <input class="form__input" type="${type}" name="${name}" value="${escape(value || '')}" ${extra || ''}>
      ${errors[name] ? `<span class="form__error">${escape(errors[name])}</span>` : ''}
    </label>`;

  const fileField = (name, label, hint, picked) => `
    <div class="form__field${errors[name] ? ' form__field--error' : ''}">
      <span class="form__label">${escape(label)}</span>
      ${
        picked
          ? `<p class="form__file">${escape(picked.filename)} · ${kb(picked.size)}
               <button type="button" class="linkish" data-clear-file="${name}">replace</button></p>`
          : `<input class="form__input" type="file" name="${name}" accept="image/*,.pdf">`
      }
      <span class="form__hint">${escape(hint)}</span>
      ${errors[name] ? `<span class="form__error">${escape(errors[name])}</span>` : ''}
    </div>`;

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

  /* ---------- views ---------- */

  const viewApply = () => {
    const member = M.getMember();

    if (member.status === 'pending' || member.status === 'approved') {
      return `
        <section class="section">
          <div class="container narrow">
            <h1 class="page-title">You already have an application</h1>
            <p class="muted">Your current status is <strong>${escape(STATUS_COPY[member.status].label)}</strong>.</p>
            <a class="btn btn--primary" href="#/account">View your membership</a>
          </div>
        </section>`;
    }

    let body = '';

    if (step === 1) {
      body = `
        ${field('first_name', 'First name', 'text', draft.first_name)}
        ${field('last_name', 'Last name', 'text', draft.last_name)}
        ${field('email', 'Email address', 'email', draft.email)}
        ${field('mobile', 'Mobile number', 'tel', draft.mobile, 'placeholder="071 234 5678"')}`;
    }

    if (step === 2) {
      body = `
        <div class="form__field">
          <span class="form__label">Document type</span>
          <select class="form__input" name="id_type">
            <option value="sa_id"${draft.id_type === 'passport' ? '' : ' selected'}>South African ID</option>
            <option value="passport"${draft.id_type === 'passport' ? ' selected' : ''}>Passport</option>
          </select>
        </div>
        ${field(
          'id_number',
          draft.id_type === 'passport' ? 'Passport number' : 'ID number',
          'text',
          draft.id_number,
          'inputmode="numeric" autocomplete="off"'
        )}
        <p class="form__hint">
          We check the checksum and the date of birth encoded in the number. Only the last four digits
          are kept after verification.
        </p>
        ${fileField('id_document', 'Photo of your ID', 'Clear photo or scan. JPG, PNG or PDF.', draft.id_document)}`;
    }

    if (step === 3) {
      body = `
        ${field('line1', 'Street address', 'text', draft.address.line1)}
        ${field('suburb', 'Suburb', 'text', draft.address.suburb)}
        ${field('city', 'City', 'text', draft.address.city)}
        <div class="form__field">
          <span class="form__label">Province</span>
          <select class="form__input" name="province">
            ${M.PROVINCES.map(
              (p) => `<option value="${escape(p)}"${draft.address.province === p ? ' selected' : ''}>${escape(p)}</option>`
            ).join('')}
          </select>
        </div>
        ${field('postal_code', 'Postal code', 'text', draft.address.postal_code, 'inputmode="numeric"')}
        ${fileField(
          'address_proof',
          'Proof of address',
          'Municipal bill, bank statement or lease, dated in the last three months.',
          draft.address_proof
        )}`;
    }

    if (step === 4) {
      const check = (name, label) => `
        <label class="form__check">
          <input type="checkbox" name="${name}" ${draft.declarations[name] ? 'checked' : ''}>
          <span>${label}</span>
        </label>`;

      body = `
        <div class="form__checks${errors.declarations ? ' form__field--error' : ''}">
          ${check('age', 'I am 18 years or older.')}
          ${check('resident', 'I am resident in South Africa and this is my own address.')}
          ${check('personal', 'Anything I receive is for my own private use and I will not resell it.')}
          ${check(
            'popia',
            'I consent to Highveld Botanicals processing my ID and address documents to verify my age and residency, as described in the <a href="#/privacy">privacy policy</a>.'
          )}
          ${errors.declarations ? `<span class="form__error">${escape(errors.declarations)}</span>` : ''}
        </div>

        <div class="summary">
          <h2>What you are submitting</h2>
          <dl>
            <div><dt>Name</dt><dd>${escape(draft.first_name)} ${escape(draft.last_name)}</dd></div>
            <div><dt>Email</dt><dd>${escape(draft.email)}</dd></div>
            <div><dt>Date of birth</dt><dd>${escape(draft.dob || '—')}</dd></div>
            <div><dt>ID</dt><dd>•••• ${escape(String(draft.id_number || '').slice(-4))}</dd></div>
            <div><dt>Address</dt><dd>${escape(draft.address.line1)}, ${escape(draft.address.suburb)}, ${escape(
        draft.address.city
      )}, ${escape(draft.address.province)} ${escape(draft.address.postal_code)}</dd></div>
            <div><dt>Documents</dt><dd>${escape(draft.id_document ? draft.id_document.filename : '—')}, ${escape(
        draft.address_proof ? draft.address_proof.filename : '—'
      )}</dd></div>
          </dl>
        </div>`;
    }

    return `
      <section class="section">
        <div class="container narrow">
          <p class="eyebrow">Membership</p>
          <h1 class="page-title">Apply</h1>
          ${stepDots()}

          <form class="form" id="apply-form" novalidate>
            ${body}
            ${errors.form ? `<p class="form__error form__error--top">${escape(errors.form)}</p>` : ''}
            <div class="form__actions">
              ${step > 1 ? '<button class="btn btn--ghost" type="button" data-step-back>Back</button>' : ''}
              <button class="btn btn--primary" type="button" data-step-next>
                ${step === STEPS.length ? 'Submit application' : 'Continue'}
              </button>
            </div>
          </form>
        </div>
      </section>`;
  };

  const viewAdmin = (selectedId) => {
    const queue = M.getQueue();
    const pending = queue.filter((r) => r.status === 'pending');
    const selected = selectedId ? queue.find((r) => r.id === selectedId) : null;

    if (selected) {
      return `
        <section class="section">
          <div class="container">
            <p class="eyebrow">Admin · Verification</p>
            <h1 class="page-title">${escape(selected.first_name)} ${escape(selected.last_name)}</h1>
            <p class="muted">${escape(selected.id)} · submitted ${dateTime(selected.submitted_at)}</p>

            <div class="review">
              <div class="detail">
                <h2>Applicant</h2>
                <dl>
                  <div><dt>Email</dt><dd>${escape(selected.email)}</dd></div>
                  <div><dt>Date of birth</dt><dd>${escape(selected.dob)} (age ${M.ageOn(
        new Date(selected.dob)
      )})</dd></div>
                  <div><dt>ID number</dt><dd>•••• ${escape(selected.id_last4)}</dd></div>
                  <div><dt>Address</dt><dd>${escape(selected.address.line1)}, ${escape(
        selected.address.suburb
      )}, ${escape(selected.address.city)}, ${escape(selected.address.province)} ${escape(
        selected.address.postal_code
      )}</dd></div>
                </dl>

                <h2 style="margin-top:1.5rem">Documents</h2>
                <ul class="docs">
                  <li><span>ID document</span><span class="muted">${escape(
                    selected.id_document.filename
                  )} · ${kb(selected.id_document.size)}</span></li>
                  <li><span>Proof of address</span><span class="muted">${escape(
                    selected.address_proof.filename
                  )} · ${kb(selected.address_proof.size)}</span></li>
                </ul>
                <p class="muted" style="font-size:.75rem">
                  Document contents are not stored in this preview — only the file name and size.
                </p>
              </div>

              <div class="detail">
                <h2>Decision</h2>
                ${
                  selected.status === 'pending'
                    ? `<div class="decide">
                         <label class="form__field">
                           <span class="form__label">Tier if approved</span>
                           <select class="form__input" id="decide-tier">
                             <option value="standard">Standard — 8 units a month</option>
                             <option value="premium">Premium — 16 units a month</option>
                           </select>
                         </label>
                         <button class="btn btn--primary" type="button" data-approve="${escape(
                           selected.id
                         )}">Approve</button>

                         <label class="form__field" style="margin-top:1.5rem">
                           <span class="form__label">Reason if rejected</span>
                           <input class="form__input" id="decide-reason" type="text" placeholder="e.g. Proof of address older than three months">
                         </label>
                         <button class="btn btn--ghost" type="button" data-reject="${escape(
                           selected.id
                         )}">Reject</button>
                       </div>`
                    : `<p class="pill pill--${STATUS_COPY[selected.status].tone}">${escape(
                        STATUS_COPY[selected.status].label
                      )}</p>
                       <p class="muted">Reviewed ${dateTime(selected.reviewed_at)} by ${escape(
                        selected.reviewed_by || '—'
                      )}</p>`
                }

                <h2 style="margin-top:1.5rem">Audit trail</h2>
                <ul class="audit">
                  ${selected.audit
                    .slice()
                    .reverse()
                    .map(
                      (entry) => `
                    <li>
                      <span class="audit__action">${escape(entry.action)}</span>
                      <span class="audit__note">${escape(entry.note)}</span>
                      <span class="audit__meta">${escape(entry.actor)} · ${dateTime(entry.at)}</span>
                    </li>`
                    )
                    .join('')}
                </ul>
              </div>
            </div>

            <a class="btn btn--ghost" href="#/admin/verifications" style="margin-top:2rem">Back to queue</a>
          </div>
        </section>`;
    }

    return `
      <section class="section">
        <div class="container">
          <div class="section__head">
            <div>
              <p class="eyebrow">Admin</p>
              <h1 class="page-title">Verification queue</h1>
            </div>
            <p class="muted">${pending.length} awaiting review</p>
          </div>

          <table class="table">
            <thead>
              <tr><th>Member</th><th>Name</th><th>Age</th><th>Province</th><th>Submitted</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              ${queue
                .map(
                  (r) => `
                <tr>
                  <td class="mono">${escape(r.id)}</td>
                  <td>${escape(r.first_name)} ${escape(r.last_name)}</td>
                  <td>${M.ageOn(new Date(r.dob))}</td>
                  <td>${escape(r.address.province)}</td>
                  <td class="muted">${date(r.submitted_at)}</td>
                  <td><span class="pill pill--${STATUS_COPY[r.status].tone}">${escape(
                    STATUS_COPY[r.status].label
                  )}</span></td>
                  <td><a href="#/admin/verifications/${escape(r.id)}">Review</a></td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>

          <p class="muted" style="font-size:.75rem;margin-top:1.5rem">
            Preview only. On the live build this queue lives in a Shopify app, not the theme —
            customer documents must never be readable from Liquid.
          </p>
        </div>
      </section>`;
  };

  /* ---------- events ---------- */

  const readField = (form, name) => {
    const el = form.querySelector(`[name="${name}"]`);
    return el ? el.value.trim() : '';
  };

  const snapshot = (form) => {
    if (!form) return;

    if (step === 1) {
      draft.first_name = readField(form, 'first_name');
      draft.last_name = readField(form, 'last_name');
      draft.email = readField(form, 'email');
      draft.mobile = readField(form, 'mobile');
    }

    if (step === 2) {
      draft.id_type = readField(form, 'id_type') || draft.id_type;
      draft.id_number = readField(form, 'id_number');
    }

    if (step === 3) {
      draft.address = {
        line1: readField(form, 'line1'),
        suburb: readField(form, 'suburb'),
        city: readField(form, 'city'),
        province: readField(form, 'province') || M.PROVINCES[0],
        postal_code: readField(form, 'postal_code'),
      };
    }
  };

  const collectStep = (form) => {
    errors = {};
    const get = (name) => readField(form, name);

    if (step === 1) {
      draft.first_name = get('first_name');
      draft.last_name = get('last_name');
      draft.email = get('email');
      draft.mobile = get('mobile');

      if (!draft.first_name) errors.first_name = 'Required.';
      if (!draft.last_name) errors.last_name = 'Required.';
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.email)) errors.email = 'Enter a valid email address.';
      if (draft.mobile.replace(/\D/g, '').length < 9) errors.mobile = 'Enter a valid mobile number.';
    }

    if (step === 2) {
      draft.id_type = get('id_type');
      draft.id_number = get('id_number');

      if (draft.id_type === 'sa_id') {
        const check = M.validateSaId(draft.id_number);
        if (!check.ok) {
          errors.id_number = check.reason;
        } else if (M.ageOn(check.dob) < 18) {
          errors.id_number = 'That ID belongs to someone under 18. We cannot accept this application.';
        } else {
          draft.dob = check.dob.toISOString().slice(0, 10);
        }
      } else if (draft.id_number.length < 6) {
        errors.id_number = 'Enter your passport number.';
      } else {
        draft.dob = draft.dob || '';
      }

      if (!draft.id_document) errors.id_document = 'Upload a photo of your ID.';
    }

    if (step === 3) {
      draft.address = {
        line1: get('line1'),
        suburb: get('suburb'),
        city: get('city'),
        province: get('province') || M.PROVINCES[0],
        postal_code: get('postal_code'),
      };

      if (!draft.address.line1) errors.line1 = 'Required.';
      if (!draft.address.suburb) errors.suburb = 'Required.';
      if (!draft.address.city) errors.city = 'Required.';
      if (!/^\d{4}$/.test(draft.address.postal_code)) errors.postal_code = 'South African postal codes are 4 digits.';
      if (!draft.address_proof) errors.address_proof = 'Upload proof of address.';
    }

    if (step === 4) {
      ['age', 'resident', 'personal', 'popia'].forEach((name) => {
        const el = form.querySelector(`[name="${name}"]`);
        draft.declarations[name] = Boolean(el && el.checked);
      });

      if (!Object.values(draft.declarations).every(Boolean)) {
        errors.declarations = 'All four declarations must be accepted.';
      }
    }

    return Object.keys(errors).length === 0;
  };

  const app = document.getElementById('app');

  app.addEventListener('click', (event) => {
    const back = event.target.closest('[data-step-back]');
    if (back) {
      snapshot(document.getElementById('apply-form'));
      step = Math.max(1, step - 1);
      errors = {};
      window.HB_RENDER();
      return;
    }

    const next = event.target.closest('[data-step-next]');
    if (next) {
      const form = document.getElementById('apply-form');
      const valid = collectStep(form);

      if (!valid) {
        window.HB_RENDER();
        return;
      }

      if (step < STEPS.length) {
        step += 1;
        window.HB_RENDER();
        return;
      }

      M.submitApplication({
        first_name: draft.first_name,
        last_name: draft.last_name,
        email: draft.email,
        id_type: draft.id_type,
        id_number: draft.id_number,
        dob: draft.dob,
        address: draft.address,
        id_document: draft.id_document,
        address_proof: draft.address_proof,
      });

      resetWizard();
      window.location.hash = '#/account';
      return;
    }

    const clear = event.target.closest('[data-clear-file]');
    if (clear) {
      snapshot(document.getElementById('apply-form'));
      draft[clear.dataset.clearFile] = null;
      window.HB_RENDER();
      return;
    }

    const reapply = event.target.closest('[data-reapply]');
    if (reapply) {
      M.resetApplication();
      resetWizard();
      return;
    }

    const approve = event.target.closest('[data-approve]');
    if (approve) {
      const tier = document.getElementById('decide-tier').value;
      M.decide(approve.dataset.approve, 'approved', tier, 'admin@highveld.co.za');
      window.HB_RENDER();
      return;
    }

    const reject = event.target.closest('[data-reject]');
    if (reject) {
      const reason = document.getElementById('decide-reason').value.trim();
      if (!reason) {
        window.alert('Enter a reason before rejecting. The applicant is told why.');
        return;
      }
      M.decide(reject.dataset.reject, 'rejected', reason, 'admin@highveld.co.za');
      window.HB_RENDER();
    }
  });

  app.addEventListener('change', (event) => {
    const input = event.target;

    if (input.type === 'file' && input.files && input.files[0]) {
      const file = input.files[0];
      snapshot(document.getElementById('apply-form'));
      draft[input.name] = { filename: file.name, size: file.size };
      window.HB_RENDER();
      return;
    }

    if (input.name === 'id_type') {
      snapshot(document.getElementById('apply-form'));
      draft.id_type = input.value;
      window.HB_RENDER();
    }
  });

  window.HB_VIEWS = {
    route(parts) {
      if (parts[0] === 'membership' && parts[1] === 'apply') return viewApply();
      if (parts[0] === 'admin' && parts[1] === 'verifications') return viewAdmin(parts[2] || null);
      return null;
    },
    STATUS_COPY,
    resetWizard,
  };
})();
