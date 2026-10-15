(function () {
  const ORDERS_KEY = 'hb:preview-orders';
  const SEQ_KEY = 'hb:preview-order-seq';

  /**
   * No card fields anywhere in this flow, deliberately.
   * Shopify Payments, Stripe, PayFast and Yoco all prohibit THC in their
   * acceptable-use policies, so a card form here would be theatre. EFT with a
   * reference, or cash on collection, is what actually clears.
   */
  const PAYMENT_METHODS = [
    {
      id: 'eft',
      label: 'EFT / bank transfer',
      blurb: 'Pay by transfer using your order number as the reference. Released once the funds clear, usually one business day.',
    },
    {
      id: 'cash',
      label: 'Cash on collection',
      blurb: 'Pay at handover. Bring the exact amount — collection points do not hold change or a card machine.',
    },
  ];

  const BANK = {
    account_name: 'Highveld Botanicals (Pty) Ltd',
    bank: 'First National Bank',
    account_number: '•••• •••• 4417',
    branch_code: '250655',
  };

  const COLLECTION_POINTS = [
    {
      id: 'jhb-rosebank',
      name: 'Rosebank collection point',
      address: '3rd Floor, 24 Cradock Avenue, Rosebank, Johannesburg, 2196',
      hours: 'Tue–Sat, 10:00–18:00',
      province: 'Gauteng',
    },
    {
      id: 'cpt-observatory',
      name: 'Observatory collection point',
      address: '18 Lower Main Road, Observatory, Cape Town, 7925',
      hours: 'Wed–Sat, 11:00–19:00',
      province: 'Western Cape',
    },
    {
      id: 'dbn-morningside',
      name: 'Morningside collection point',
      address: '112 Florida Road, Morningside, Durban, 4001',
      hours: 'Thu–Sat, 10:00–17:00',
      province: 'KwaZulu-Natal',
    },
  ];

  /**
   * Single source of truth for shipping. The delivery policy page renders from
   * these values rather than restating them in prose, so the published policy
   * cannot drift from what checkout actually charges.
   */
  const SHIPPING = {
    courier_fee: 150,
    free_over: 1200,
    hold_hours: 72,
    collection_ready: 'within 1 business day of payment clearing',
    courier_main: '2–3 business days',
    courier_outlying: '3–5 business days',
    cutoff: '12:00',
    coverage: 'South Africa only',
    carrier: 'The Courier Guy',
  };

  const COURIER_FEE = SHIPPING.courier_fee;

  /** Courier is free above the threshold. Collection is always free. */
  const shippingFee = (method, subtotal) => {
    if (method !== 'courier') return 0;
    return subtotal >= SHIPPING.free_over ? 0 : SHIPPING.courier_fee;
  };

  /**
   * Returns terms. The policy page renders from these for the same reason the
   * delivery page renders from SHIPPING — a published policy that disagrees with
   * the system is worse than no policy.
   *
   * The windows are not arbitrary: the defect window is the Consumer Protection
   * Act s.56 six months, which cannot be contracted out of. The sealed window is
   * the ECTA s.44 electronic-transaction cooling-off period.
   */
  const REFUNDS = {
    sealed_window_days: 7,
    defect_window_months: 6,
    processing: '5–10 business days',
    restock_fee: 0,
  };

  const STATUS = {
    awaiting_payment: { label: 'Awaiting payment', tone: 'pending' },
    payment_received: { label: 'Payment received', tone: 'pending' },
    ready: { label: 'Ready for collection', tone: 'ok' },
    collected: { label: 'Collected', tone: 'ok' },
    return_requested: { label: 'Return requested', tone: 'pending' },
    refunded: { label: 'Refunded', tone: 'neutral' },
    cancelled: { label: 'Cancelled', tone: 'bad' },
  };

  /** Statuses that release the units an order was holding. */
  const RELEASES_ALLOCATION = ['cancelled', 'refunded'];

  const read = (key, fallback) => {
    try {
      return JSON.parse(window.localStorage.getItem(key)) ?? fallback;
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

  const getOrders = () => read(ORDERS_KEY, []);
  const setOrders = (orders) => write(ORDERS_KEY, orders);
  const getOrder = (id) => getOrders().find((o) => o.id === id) || null;

  const nextOrderNumber = () => {
    const seq = read(SEQ_KEY, 0) + 1;
    write(SEQ_KEY, seq);
    const yy = String(new Date().getFullYear()).slice(-2);
    return `HB-${yy}-${String(seq).padStart(4, '0')}`;
  };

  const now = () => new Date().toISOString();

  /**
   * Re-checks everything at the moment of ordering rather than trusting what the
   * cart page decided earlier. Cart state is client-side and trivially edited.
   */
  const validate = (lines, fulfilment) => {
    const M = window.HB_MEMBER;
    const member = M.getMember();
    const errors = [];

    const restricted = lines.filter((l) => l.product.member_tier !== 'open');

    if (restricted.length > 0 && member.status !== 'approved') {
      errors.push({
        field: 'membership',
        message: `${restricted.length} item(s) need a verified membership. Your status is "${member.status}".`,
      });
    }

    if (restricted.length > 0 && member.status === 'approved') {
      const alloc = M.allocation();
      const units = restricted.reduce((sum, l) => sum + l.qty, 0);
      if (alloc && units > alloc.remaining) {
        errors.push({
          field: 'allocation',
          message: `This order uses ${units} units but you have ${alloc.remaining} of ${alloc.total} remaining this month.`,
        });
      }
    }

    for (const line of lines) {
      if (line.qty > line.product.stock) {
        errors.push({ field: 'stock', message: `${line.product.title}: only ${line.product.stock} in stock.` });
      }
    }

    if (fulfilment && fulfilment.method === 'courier' && restricted.length > 0) {
      errors.push({
        field: 'fulfilment',
        message: 'Members-only items are handed over in person so ID can be checked. Choose a collection point.',
      });
    }

    return errors;
  };

  const create = ({ lines, contact, fulfilment, payment, declarations }) => {
    const M = window.HB_MEMBER;
    const member = M.getMember();

    const errors = validate(lines, fulfilment);
    if (errors.length > 0) return { ok: false, errors };

    const subtotal = lines.reduce((sum, l) => sum + l.product.price * l.qty, 0);
    const fee = shippingFee(fulfilment.method, subtotal);
    const units = lines.filter((l) => l.product.member_tier !== 'open').reduce((s, l) => s + l.qty, 0);
    const id = nextOrderNumber();
    const at = now();

    const order = {
      id,
      placed_at: at,
      status: 'awaiting_payment',
      member: {
        id: member.id || null,
        name: `${contact.first_name} ${contact.last_name}`.trim(),
        email: contact.email,
        phone: contact.phone,
        tier: member.tier || null,
        verified: member.status === 'approved',
      },
      lines: lines.map((l) => ({
        handle: l.product.handle,
        title: l.product.title,
        sku: l.product.sku,
        batch_id: l.product.batch_id,
        size: l.product.size,
        unit: l.product.unit,
        member_tier: l.product.member_tier,
        qty: l.qty,
        unit_price: l.product.price,
        line_total: l.product.price * l.qty,
      })),
      fulfilment,
      payment: {
        ...payment,
        reference: id,
        bank: payment.method === 'eft' ? BANK : null,
        due_by: new Date(Date.now() + 3 * 86400000).toISOString(),
      },
      declarations,
      totals: { subtotal, fee, total: subtotal + fee, units },
      timeline: [{ at, actor: 'member', action: 'placed', note: 'Order placed. Awaiting payment.' }],
    };

    setOrders([order, ...getOrders()]);

    // spend the allocation now — an unpaid order still holds the stock
    if (units > 0 && member.status === 'approved') {
      M.setMember({ ...member, allocation_used: (member.allocation_used || 0) + units });
      const queue = M.getQueue().map((r) =>
        r.id === member.id ? { ...r, allocation_used: (r.allocation_used || 0) + units } : r
      );
      M.setQueue(queue);
    }

    return { ok: true, order };
  };

  /**
   * Puts an order's units back. Guarded by a flag on the order so that moving
   * cancelled -> refunded, or advancing twice, cannot credit the same units again.
   */
  const creditAllocation = (order) => {
    const M = window.HB_MEMBER;
    if (!order.totals.units || !order.member.id || order.allocation_credited) return false;

    const give = (record) => ({
      ...record,
      allocation_used: Math.max(0, (record.allocation_used || 0) - order.totals.units),
    });

    const current = M.getMember();
    if (current.id === order.member.id) M.setMember(give(current));
    M.setQueue(M.getQueue().map((r) => (r.id === order.member.id ? give(r) : r)));

    return true;
  };

  const advance = (id, status, note, actor) => {
    const at = now();
    const target = getOrder(id);
    if (!target) return null;

    let credited = false;
    if (RELEASES_ALLOCATION.includes(status)) {
      credited = creditAllocation(target);
    }

    const orders = getOrders().map((o) => {
      if (o.id !== id) return o;

      const entries = [{ at, actor: actor || 'staff', action: status, note }];
      if (credited) {
        entries.push({
          at,
          actor: 'system',
          action: 'allocation_credited',
          note: `${o.totals.units} unit${o.totals.units === 1 ? '' : 's'} returned to this month's allocation.`,
        });
      }

      return {
        ...o,
        status,
        allocation_credited: o.allocation_credited || credited,
        timeline: o.timeline.concat(entries),
      };
    });

    setOrders(orders);
    return getOrder(id);
  };

  /**
   * What a member may do with an order, given its status and age.
   * Opened consumables are never returnable — that is a health rule, not a
   * commercial one, and it applies regardless of how recently you bought it.
   */
  const returnEligibility = (order) => {
    if (['cancelled', 'refunded', 'return_requested'].includes(order.status)) {
      return { can: false, reason: 'closed', message: 'This order is already closed.' };
    }

    if (order.status !== 'collected') {
      return {
        can: true,
        reason: 'cancel',
        message: 'Not handed over yet — you can cancel this order for a full refund.',
      };
    }

    const days = Math.floor((Date.now() - new Date(order.placed_at).getTime()) / 86400000);
    const allSealed = order.lines.every((l) => l.member_tier === 'open');

    if (allSealed && days <= REFUNDS.sealed_window_days) {
      return {
        can: true,
        reason: 'sealed',
        message: `Unopened and within ${REFUNDS.sealed_window_days} days — you can return this for a refund.`,
      };
    }

    return {
      can: true,
      reason: 'defect',
      message: `Past the return window, but a fault, a wrong item or a failed batch is refundable for ${REFUNDS.defect_window_months} months.`,
    };
  };

  window.HB_ORDER = {
    PAYMENT_METHODS,
    COLLECTION_POINTS,
    COURIER_FEE,
    SHIPPING,
    shippingFee,
    REFUNDS,
    returnEligibility,
    STATUS,
    BANK,
    getOrders,
    getOrder,
    validate,
    create,
    advance,
  };
})();
