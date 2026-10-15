# Highveld Botanicals

A members-only cannabis storefront for the South African market: a Shopify Online Store 2.0
theme, plus a standalone local preview of the same design that runs without Shopify.

```
theme/            Shopify theme — 2 layouts, 19 sections, 6 snippets, 26 templates
preview/          Local preview — 16 modules, ~10,000 lines, no build step
data/             Catalogue, certificates, articles, and the docs that explain them
scripts/          build, generate-coas, ingest-photos, bundle
dist/             Single-file HTML preview + Shopify-ready theme zip
photos-incoming/  Drop real product photography here
```

---

## Read this first

**Shopify's Acceptable Use Policy prohibits THC sales outside specific licensed markets**
(Canada, certain US states). South Africa is not one of them, and Shopify Payments will not
process these transactions. You were told this before the build started and chose Shopify
anyway — this documents the constraint, it does not relitigate the decision.

Two things follow from it:

1. **The commerce layer is kept swappable.** `data/products.json` is the source of truth and
   `preview/` renders the entire storefront independently of Shopify. Moving to another
   platform means rewriting the theme, not the design or the data.
2. **There are no card fields anywhere.** Card networks and every mainstream South African
   gateway prohibit these products, so payment is EFT against the order number, or cash on
   collection. A card form would be theatre.

The catalogue is structured around the SA **private members' club** model — verified
membership plus a contribution toward cultivation and handling — rather than open public
retail. That is the structure that actually operates in South Africa, and the copy
throughout reflects it.

---

## Three things block launch

All three need you. Each renders a visible warning in the UI while its flag is set.

| Blocker | State | Flag |
|---|---|---|
| **Product photography** | 10/10 products on stock placeholders | `photo.placeholder` in `data/products.json` |
| **Lab certificates** | 10/10 are generated specimens, not real reports | `specimen: true` in `data/lab-results.json` |
| **Company + legal details** | Registration number, addresses and Information Officer are invented | `placeholder: true` in `preview/legal.js` |

`node scripts/build.mjs --strict` fails while any product still has placeholder imagery.
Put that in whatever runs before a real deploy.

A fourth, softer one: `#/about` leaves the founding story deliberately unwritten. The counts
on that page are read from live data and are true; the narrative is yours to supply.

---

## Quick start

**Just look at it:**

```bash
node scripts/build.mjs && node scripts/bundle.mjs
```

Writes `dist/highveld-botanicals.html` — one self-contained ~2.1 MB file. Double-click it.
No server, no network, nothing external.

**Work on it:**

```bash
python3 -m http.server 8861 --directory preview
```

**Package the theme for Shopify:**

```bash
cd dist/theme-package && zip -rq ../highveld-botanicals-theme.zip .
```

To clear the age gate and cart while testing, in the browser console:

```js
localStorage.clear(); location.reload();
```

---

## Routes

32 routes, all hash-based, all verified rendering.

### Shop and buy

| Route | What it is |
|---|---|
| `#/` | Home |
| `#/shop` | Faceted collection — 7 facet groups, 5 sorts, filter state in the URL |
| `#/shop?strain=Sativa&effect=Energetic&sort=price-desc` | Any filter combination is a shareable link |
| `#/search?q=durban` | Global search — products, guides, FAQ and certificates at once |
| `#/product/durban-poison` | Product page with gallery, potency, terpenes, batch link |
| `#/cart` | Cart, with per-line membership gating |
| `#/checkout` | Four steps — contact, fulfilment, payment, review |
| `#/order/HB-26-0001` | Order confirmation, payment reference, collection instructions |

### Account

| Route | What it is |
|---|---|
| `#/account` | Dashboard — next action, four tiles, recent orders |
| `#/account/orders` | History with filters, search and reorder (`#/orders` is an alias) |
| `#/account/membership` | Status, tier, allocation, audit trail |
| `#/account/details` | Contact, address, preferred collection point |
| `#/account/privacy` | Documents on file, POPIA rights |

### Membership

| Route | What it is |
|---|---|
| `#/how-it-works` | The model end to end (`#/membership` redirects here) |
| `#/membership/apply` | Four-step application with SA ID validation |
| `#/admin/verifications` | Reviewer queue — approve or reject with a reason |

### Content

| Route | What it is |
|---|---|
| `#/learn` | Education hub — 7 guides grouped by topic |
| `#/learn/start-low-go-slow` | Article (guides and posts share this route) |
| `#/blog` | Writing — chronological posts |
| `#/about` | About the collective |
| `#/faq` | 32 questions, searchable, filtered by category |
| `#/contact` | Routed contact form and four direct channels |
| `#/lab-results` | Certificate index — filter by matrix, verify a batch code |
| `#/lab-results/DP-2607-A` | Full certificate of analysis |

### Policy

| Route | What it is |
|---|---|
| `#/delivery` | Shipping and delivery |
| `#/collection` | Collection points, hours, handover process |
| `#/returns` | Returns and refunds |
| `#/recalls` | Batch recalls and safety notices |
| `#/terms` | Terms of service |
| `#/privacy` | Privacy policy (POPIA) |

### Internal reference

| Route | What it is |
|---|---|
| `#/design-system` | Tokens, type, components, **live** contrast calculations |
| `#/photography` | Shooting standard, shot list, audit of current imagery |

**To see the whole membership loop:** apply at `#/membership/apply` (any valid SA ID works —
`9403125000080` passes the checksum), then go to `#/admin/verifications`, open your own
application and approve it. Members-only products unlock immediately.

---

## The principle this project runs on

**Anything stated to a customer is derived from the one place that decides it, never written
twice.** Applied in five places now, and every single time it was introduced it exposed a
spot where the code did not match the promise:

| Claim | Derived from | Enforced by |
|---|---|---|
| Product potency | The batch certificate | `build.mjs` fails on >0.1 drift, THC **and** CBD |
| Shipping costs and timings | `SHIPPING` in `order.js` | Policy page renders it; `shippingFee()` shared with checkout |
| Return windows | `REFUNDS` in `order.js` | Policy page renders it |
| Allocation, caps, retention | `HB_MEMBER.LIMITS`, `HB_LEGAL.retention` | FAQ answers built at render time |
| A worked example in a guide | Batch `DP-2607-A` | `verify_against_batch` — build fails if the certificate changes |

A useful regression test: change `HB_MEMBER.LIMITS.max_per_item` at runtime and confirm both
the FAQ answer and the product page quantity input follow.

---

## Enforcement lives in the model, not the view

Cart and membership state are client-side and trivially edited, so every rule is checked
again at the moment of ordering. Calling `HB_ORDER.create()` directly, bypassing the UI
entirely, still gets refused.

- Members-only items require an approved membership
- Members-only items cannot go by courier — ID is checked in person at handover
- Monthly allocation is a hard ceiling, spent at order placement
- Per-line stock check

**But none of this is real enforcement.** The age gate is a deterrent. The gating is user
experience. Only a server-side check before fulfilment actually counts, and that belongs in
a Shopify app, not the theme.

---

## Data

| File | What it holds |
|---|---|
| `data/products.json` | 10 products across 5 categories — the source of truth |
| `data/lab-results.json` | 10 specimen certificates, generated from the catalogue |
| `data/articles.json` | 7 education guides, 3 posts (one a placeholder), 4 topics |
| `data/products.csv` | Shopify product import, generated |
| `data/metafield-definitions.md` | Product metafields to create **before** importing |
| `data/verification-flow.md` | State machine, customer tags, POPIA obligations |
| `data/photo-credits.md` | Image provenance, rejections, and the shot list |

### Certificates are generated, never authored

`scripts/generate-coas.mjs` derives every certificate **from the catalogue**, so Total THC
(`THCA × 0.877 + Δ9-THC`) reconciles to the potency on the product page. Run it before
`build.mjs` whenever you change a potency figure:

```bash
node scripts/generate-coas.mjs && node scripts/build.mjs
```

`build.mjs` refuses to build on any THC or CBD drift over 0.1, a missing or mismatched
batch, a failing safety panel, an unknown article topic, a duplicate slug, or an empty body.

**Every certificate carries `specimen: true` and renders a SPECIMEN banner.** A fabricated
lab report is a safety document, not a placeholder image. Do not quietly drop the banner —
replace the certificates.

---

## Replacing the placeholder photography

```bash
node scripts/ingest-photos.mjs          # creates photos-incoming/ with a README
# drop your files in, named by product handle
node scripts/ingest-photos.mjs --dry    # see what it would do
node scripts/ingest-photos.mjs          # apply
node scripts/build.mjs && node scripts/bundle.mjs
```

Filenames are the product handle plus an optional shot kind:

```
durban-poison.jpg          hero   front-on, used on cards and as the PDP lead
durban-poison-macro.jpg    macro  trichomes in focus
durban-poison-scale.jpg    scale  in a hand or beside a coin
durban-poison-label.jpg    label  packaging with the batch code legible
```

It rejects files that do not match a handle or are under 1200px on the short edge,
centre-crops anything non-square, resizes to 1600×1600 at quality 85, writes
`product.images[]`, and clears the placeholder flag. **Products with more than one shot get a
thumbnail gallery on the product page automatically.**

The full shooting standard — background, lighting, white balance, what must never appear in
frame — is on `#/photography`.

---

## Deploying the theme

**Create the metafield definitions first.** Shopify silently drops metafield columns on
product import when the definition does not exist, and the theme reads them everywhere.
Both tables — product and customer — are in `dist/theme-package/DEPLOY.md`, with the three
customer fields that must stay **private** marked.

Then:

1. Upload `dist/highveld-botanicals-theme.zip` via Online Store → Themes → Add theme, or
   `shopify theme push --path theme`
2. Import `data/products.csv` — everything arrives as `draft` on purpose
3. Create collections matching: `flower`, `pre-rolls`, `edibles`, `vapes-concentrates`,
   `cbd-wellness`
4. Create pages and assign template suffixes: `membership`, `verification`, `delivery`,
   `returns`, `terms`, `privacy`, `faq`, `about`, `how-it-works`
5. **Bind the two homepage collection sections** — they ship unbound
6. Set the secure document-upload URL on the membership application section
7. Run `shopify theme check`

### Membership status rides on customer tags

Tags are the only customer field both readable in Liquid and writable by an app. An app
writes these; the theme only reads them.

| Tag | Meaning |
|---|---|
| `verification-pending` | Application submitted |
| `verified-member` | Approved and current |
| `verification-rejected` | Reviewed and declined |
| `tier-standard` / `tier-premium` | Monthly allocation size |

### Identity documents must never pass through the theme

Liquid renders on the storefront, so anything readable there is readable by the customer.
The theme collects name, address and declarations via `{% form 'contact' %}` and hands off
to an app URL for the ID number and document upload. The review queue and document storage
belong in an app. `data/verification-flow.md` has the full architecture.

---

## Architecture notes

Things that will bite you if you do not know them.

**Liquid snippets have isolated scope.** `member-status.liquid` outputs a single word that
callers must `{% capture %}` — a plain `{% render %}` cannot assign back:

```liquid
{% capture member_status %}{% render 'member-status' %}{% endcapture %}
{% assign member_status = member_status | strip %}
```

**`{% stylesheet %}` blocks are theme-wide.** They concatenate into one file, so a class
defined in one section is available in every other. Convenient, but it means a class can be
used in markup while being defined nowhere — audit for that after adding sections.

**Two gate classes, not one.** `.gate` is the age-gate dialog, `.memgate` is the membership
gate. They were the same class once and it broke the dialog.

**Route ownership is one module per route.** `#/account` and `#/orders` were once handled by
two modules each; both duplicates were deleted. The one apparent exception is `#/membership`,
where `views-membership.js` owns `/apply` and `views-about.js` owns the bare route — the
guards are mutually exclusive.

**Runtime-built image paths need `HB_ASSET()`.** The bundler inlines literal image paths by
string replacement, which cannot see a path built inside a template literal. Only
`images/rejected/*` needs this today; skip it and the image breaks only in the bundle.

**The full ID number is never persisted.** It lives in the in-memory application draft;
`submitApplication` stores `id_last4` only. The privacy policy leads with this claim —
re-verify it if the application flow ever changes.

---

## The single-file build

`scripts/bundle.mjs` inlines the stylesheet, all 16 modules in load order, and all 15 images
as data URIs. It adds two things the served version does not need:

- **An in-memory `localStorage` shim.** Browsers restrict storage on `file://`; without it
  the cart and membership state fail silently and the demo looks broken rather than
  restricted.
- **A banner** making clear it is a preview and processes no orders.

The bundler fails if any image is inlined zero times (broken) or more than once (wasted
bytes).

---

## What is deliberately not built

- **Payment processing.** See the AUP note. EFT and cash only.
- **Server-side verification.** The review queue in the preview is a design reference; it
  stores everything in `localStorage`.
- **Document storage.** The preview records filenames and sizes, never contents.
- **Real enforcement of allocation or order state.** Both are client-side. A member can
  reset their own allocation by clearing browser data.

Each of these belongs in a Shopify app. The preview shows what they should do.
