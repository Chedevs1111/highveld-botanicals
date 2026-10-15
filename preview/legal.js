(function () {
  /**
   * Company, data-protection and retention constants.
   *
   * Every page that states a retention period, a contact address or a statutory
   * window renders from here. Before this existed the same "12 months" and
   * "30 days" were written into five separate strings across two files, which is
   * how a privacy policy quietly starts disagreeing with itself.
   *
   * PLACEHOLDER DETAILS. The company name, registration number, address and
   * Information Officer below are invented for the preview. Replace every one of
   * them before publishing — a privacy policy naming a fictional Information
   * Officer is worse than no privacy policy, because members rely on it to
   * exercise rights that have to reach a real person.
   */
  const LEGAL = {
    placeholder: true,

    company: {
      name: 'Highveld Botanicals (Pty) Ltd',
      trading_as: 'Highveld Botanicals',
      registration: '2026/000000/07',
      address: 'Postnet Suite 000, Private Bag X00, Rosebank, Johannesburg, 2196',
      email: 'hello@highveld.example',
      country: 'South Africa',
    },

    information_officer: {
      title: 'Information Officer',
      email: 'privacy@highveld.example',
      note: 'Registered with the Information Regulator as required by POPIA s.55.',
    },

    regulator: {
      name: 'Information Regulator (South Africa)',
      email: 'complaints.IR@justice.gov.za',
      site: 'https://inforegulator.org.za',
    },

    consumer_commission: {
      name: 'National Consumer Commission',
      site: 'https://www.thencc.org.za',
    },

    /** Retention, in the units each is naturally expressed in. */
    retention: {
      identity_documents_months: 12,
      order_records_years: 5,
      deletion_request_days: 30,
      export_request_days: 30,
      age_gate_days: 30,
    },

    statutes: {
      popia: 'Protection of Personal Information Act 4 of 2013',
      cpa: 'Consumer Protection Act 68 of 2008',
      ecta: 'Electronic Communications and Transactions Act 25 of 2002',
      cannabis: 'Cannabis for Private Purposes Act 7 of 2024',
    },

    jurisdiction: 'the courts of the Republic of South Africa',

    /** Contact channels, each with what it is actually for. */
    contact: {
      channels: [
        {
          id: 'general',
          label: 'General enquiries',
          value: 'hello@highveld.example',
          reply: 'within 1 business day',
          note: 'Orders, collection, anything about the products.',
        },
        {
          id: 'membership',
          label: 'Membership and verification',
          value: 'members@highveld.example',
          reply: 'within 2 business days',
          note: 'Applications, documents, changing your address.',
        },
        {
          id: 'privacy',
          label: 'Privacy and your data',
          value: 'privacy@highveld.example',
          reply: 'within 30 days, usually far sooner',
          note: 'Goes to the Information Officer. Access, correction and deletion requests.',
        },
        {
          id: 'safety',
          label: 'Product safety',
          value: 'safety@highveld.example',
          reply: 'same day',
          note: 'A bad reaction, a suspected contamination, a batch that looks wrong. Read first, always.',
        },
      ],
      topics: [
        ['order', 'An order'],
        ['membership', 'My membership or verification'],
        ['product', 'A product or batch'],
        ['safety', 'A safety concern'],
        ['privacy', 'My personal data'],
        ['other', 'Something else'],
      ],
    },

    /**
     * Everything the storefront keeps in the browser. Listed on the privacy page
     * because "we use cookies" is not a description of anything.
     */
    client_storage: [
      ['hb:preview-age-verified', 'That you confirmed your age, and when it expires', 'age_gate_days'],
      ['hb:preview-cart', 'What is in your cart', null],
      ['hb:preview-member', 'Your membership record, so the site knows what you may buy', null],
      ['hb:preview-queue', 'The verification queue (preview only — server-side on the live build)', null],
      ['hb:preview-orders', 'Your orders (preview only — server-side on the live build)', null],
      ['hb:preview-order-seq', 'The order-number counter (preview only)', null],
    ],
  };

  /**
   * Resolves an asset path. Identity when the preview is served from disk; the
   * single-file bundle injects HB_IMAGES so paths built at runtime (rather than
   * written as string literals) still resolve to their inlined data URI.
   */
  window.HB_ASSET = (path) =>
    (window.HB_IMAGES && window.HB_IMAGES[path]) || path;

  window.HB_LEGAL = LEGAL;
})();
