(function () {
  const MEMBER_KEY = 'hb:preview-member';
  const QUEUE_KEY = 'hb:preview-queue';

  const PROVINCES = [
    'Eastern Cape',
    'Free State',
    'Gauteng',
    'KwaZulu-Natal',
    'Limpopo',
    'Mpumalanga',
    'North West',
    'Northern Cape',
    'Western Cape',
  ];

  const ALLOCATION = { standard: 8, premium: 16 };

  /** Per-item cap on a single order, and how long verification takes. */
  const LIMITS = { max_per_item: 4, verification_business_days: 2 };

  const read = (key, fallback) => {
    try {
      return JSON.parse(window.localStorage.getItem(key)) || fallback;
    } catch (error) {
      return fallback;
    }
  };

  const write = (key, value) => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      window.HB_STORAGE_FAILED = true;
    }
  };

  /* ---------- South African ID validation ---------- */

  const luhnValid = (digits) => {
    let sum = 0;
    let double = false;
    for (let i = digits.length - 1; i >= 0; i -= 1) {
      let n = Number(digits[i]);
      if (double) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
      double = !double;
    }
    return sum % 10 === 0;
  };

  const dobFromSaId = (id) => {
    const yy = Number(id.slice(0, 2));
    const mm = Number(id.slice(2, 4));
    const dd = Number(id.slice(4, 6));
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
    const currentYY = new Date().getFullYear() % 100;
    const century = yy <= currentYY ? 2000 : 1900;
    const date = new Date(Date.UTC(century + yy, mm - 1, dd));
    if (date.getUTCMonth() !== mm - 1 || date.getUTCDate() !== dd) return null;
    return date;
  };

  const validateSaId = (raw) => {
    const id = String(raw || '').replace(/\s/g, '');
    if (!/^\d{13}$/.test(id)) return { ok: false, reason: 'A South African ID number is 13 digits.' };
    const dob = dobFromSaId(id);
    if (!dob) return { ok: false, reason: 'The date of birth encoded in that ID is not a real date.' };
    if (!luhnValid(id)) return { ok: false, reason: 'That ID number fails its checksum digit.' };
    return { ok: true, dob };
  };

  const ageOn = (dob, at) => {
    const ref = at || new Date();
    let age = ref.getUTCFullYear() - dob.getUTCFullYear();
    const m = ref.getUTCMonth() - dob.getUTCMonth();
    if (m < 0 || (m === 0 && ref.getUTCDate() < dob.getUTCDate())) age -= 1;
    return age;
  };

  /* ---------- records ---------- */

  const now = () => new Date().toISOString();

  const nextId = (queue) => `MBR-${String(1000 + queue.length + 1).slice(-4)}`;

  const blankMember = () => ({
    id: null,
    status: 'unverified',
    tier: null,
    email: '',
    first_name: '',
    last_name: '',
    submitted_at: null,
    reviewed_at: null,
    reviewed_by: null,
    rejection_reason: null,
    expires_at: null,
    allocation_used: 0,
    audit: [],
  });

  const seedQueue = () => {
    const existing = read(QUEUE_KEY, null);
    if (existing) return existing;

    const seeded = [
      {
        id: 'MBR-1001',
        status: 'pending',
        tier: null,
        first_name: 'Thandiwe',
        last_name: 'Mokoena',
        email: 't.mokoena@example.co.za',
        id_type: 'sa_id',
        id_last4: '0084',
        dob: '1994-03-12',
        address: { line1: '14 Rissik Street', suburb: 'Braamfontein', city: 'Johannesburg', province: 'Gauteng', postal_code: '2001' },
        id_document: { filename: 'id-card-front.jpg', size: 842000 },
        address_proof: { filename: 'municipal-account.pdf', size: 210000 },
        submitted_at: '2026-07-29T09:14:00.000Z',
        reviewed_at: null,
        reviewed_by: null,
        rejection_reason: null,
        allocation_used: 0,
        audit: [{ at: '2026-07-29T09:14:00.000Z', actor: 'applicant', action: 'submitted', note: 'Application received' }],
      },
      {
        id: 'MBR-1002',
        status: 'pending',
        tier: null,
        first_name: 'Pieter',
        last_name: 'van Wyk',
        email: 'pvanwyk@example.co.za',
        id_type: 'sa_id',
        id_last4: '1927',
        dob: '1988-11-02',
        address: { line1: '7 Loop Street', suburb: 'City Bowl', city: 'Cape Town', province: 'Western Cape', postal_code: '8001' },
        id_document: { filename: 'sa-id-scan.png', size: 1340000 },
        address_proof: { filename: 'bank-statement-jul.pdf', size: 305000 },
        submitted_at: '2026-07-30T16:41:00.000Z',
        reviewed_at: null,
        reviewed_by: null,
        rejection_reason: null,
        allocation_used: 0,
        audit: [{ at: '2026-07-30T16:41:00.000Z', actor: 'applicant', action: 'submitted', note: 'Application received' }],
      },
      {
        id: 'MBR-1003',
        status: 'approved',
        tier: 'standard',
        first_name: 'Naledi',
        last_name: 'Dlamini',
        email: 'naledi.d@example.co.za',
        id_type: 'sa_id',
        id_last4: '4471',
        dob: '1996-06-21',
        address: { line1: '22 Florida Road', suburb: 'Morningside', city: 'Durban', province: 'KwaZulu-Natal', postal_code: '4001' },
        id_document: { filename: 'id-front.jpg', size: 690000 },
        address_proof: { filename: 'lease-agreement.pdf', size: 512000 },
        submitted_at: '2026-07-21T11:02:00.000Z',
        reviewed_at: '2026-07-22T08:30:00.000Z',
        reviewed_by: 'admin@highveld.co.za',
        rejection_reason: null,
        allocation_used: 3,
        audit: [
          { at: '2026-07-21T11:02:00.000Z', actor: 'applicant', action: 'submitted', note: 'Application received' },
          { at: '2026-07-22T08:30:00.000Z', actor: 'admin@highveld.co.za', action: 'approved', note: 'ID and address verified. Tier: standard' },
        ],
      },
    ];

    write(QUEUE_KEY, seeded);
    return seeded;
  };

  const getQueue = () => seedQueue();
  const setQueue = (queue) => write(QUEUE_KEY, queue);

  const getMember = () => read(MEMBER_KEY, blankMember());
  const setMember = (member) => write(MEMBER_KEY, member);

  const syncMemberFromQueue = () => {
    const member = getMember();
    if (!member.id) return member;
    const record = getQueue().find((r) => r.id === member.id);
    if (!record) return member;
    const merged = { ...member, ...record };
    setMember(merged);
    return merged;
  };

  /* ---------- actions ---------- */

  const submitApplication = (form) => {
    const queue = getQueue();
    const id = nextId(queue);
    const at = now();

    const record = {
      id,
      status: 'pending',
      tier: null,
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      id_type: form.id_type,
      id_last4: String(form.id_number).slice(-4),
      dob: form.dob,
      address: form.address,
      id_document: form.id_document,
      address_proof: form.address_proof,
      submitted_at: at,
      reviewed_at: null,
      reviewed_by: null,
      rejection_reason: null,
      allocation_used: 0,
      audit: [{ at, actor: 'applicant', action: 'submitted', note: 'Application received' }],
    };

    setQueue([record, ...queue]);
    setMember({ ...blankMember(), ...record });
    return record;
  };

  const decide = (id, decision, detail, reviewer) => {
    const at = now();
    const queue = getQueue().map((record) => {
      if (record.id !== id) return record;

      const updated = {
        ...record,
        status: decision,
        reviewed_at: at,
        reviewed_by: reviewer,
        tier: decision === 'approved' ? detail : null,
        rejection_reason: decision === 'rejected' ? detail : null,
        expires_at:
          decision === 'approved'
            ? new Date(Date.now() + 365 * 86400000).toISOString()
            : null,
        audit: record.audit.concat({
          at,
          actor: reviewer,
          action: decision,
          note: decision === 'approved' ? `Approved. Tier: ${detail}` : `Rejected. ${detail}`,
        }),
      };
      return updated;
    });

    setQueue(queue);
    syncMemberFromQueue();
    return queue.find((r) => r.id === id);
  };

  const resetApplication = () => {
    setMember(blankMember());
  };

  /* ---------- gating ---------- */

  const canPurchase = (product) => {
    if (product.member_tier === 'open') {
      return { allowed: true, reason: null };
    }

    const member = getMember();

    if (member.status === 'approved') {
      const remaining = ALLOCATION[member.tier || 'standard'] - (member.allocation_used || 0);
      if (remaining <= 0) {
        return { allowed: false, reason: 'allocation', message: 'You have used your full allocation for this month.' };
      }
      return { allowed: true, reason: null };
    }

    const messages = {
      unverified: 'Members-only. Apply for membership to purchase this item.',
      pending: 'Your application is under review. You can purchase once it is approved.',
      rejected: 'Your application was not approved. You may submit a new application.',
      expired: 'Your membership has expired. Renew to purchase this item.',
    };

    return { allowed: false, reason: member.status, message: messages[member.status] };
  };

  const allocation = () => {
    const member = getMember();
    if (member.status !== 'approved') return null;
    const total = ALLOCATION[member.tier || 'standard'];
    const used = member.allocation_used || 0;
    return { total, used, remaining: Math.max(0, total - used) };
  };

  window.HB_MEMBER = {
    PROVINCES,
    ALLOCATION,
    LIMITS,
    validateSaId,
    dobFromSaId,
    ageOn,
    getMember,
    setMember,
    getQueue,
    setQueue,
    syncMemberFromQueue,
    submitApplication,
    decide,
    resetApplication,
    canPurchase,
    allocation,
  };
})();
