# Highveld Botanicals — Shopify theme

## Before you upload

**Create the metafield definitions first.** Shopify silently drops metafield columns on
product import when the definition does not exist yet, and this theme reads them
everywhere — potency badges, batch codes, COA links, member tier gating.

Settings → Custom data → Products, namespace `custom`, all set to *Storefronts: exposed*:

| Name | Key | Type |
|---|---|---|
| Strain Type | `custom.strain_type` | Single line text |
| THC Percentage | `custom.thc_percentage` | Decimal |
| CBD Percentage | `custom.cbd_percentage` | Decimal |
| THC mg | `custom.thc_mg` | Integer |
| CBD mg | `custom.cbd_mg` | Integer |
| Terpenes | `custom.terpenes` | Single line text, **list** |
| Effects | `custom.effects` | Single line text, **list** |
| Batch ID | `custom.batch_id` | Single line text |
| COA URL | `custom.coa_url` | URL |
| Member Tier | `custom.member_tier` | Single line text |
| Age Restricted | `custom.age_restricted` | True or false |

Settings → Custom data → **Customers**, namespace `custom`:

| Name | Key | Type | Storefront |
|---|---|---|---|
| Member tier | `custom.member_tier` | Single line text | Exposed |
| Verified at | `custom.verified_at` | Date | Exposed |
| Membership expires at | `custom.membership_expires_at` | Date | Exposed |
| Allocation used | `custom.allocation_used` | Integer | Exposed |
| Rejection reason | `custom.rejection_reason` | Single line text | Exposed |
| Date of birth | `custom.date_of_birth` | Date | **Private** |
| ID number (last 4) | `custom.id_last4` | Single line text | **Private** |
| Document references | `custom.document_refs` | JSON | **Private** |

## Upload

Online Store → Themes → Add theme → Upload zip file.

Or with the CLI:

    shopify theme push --path .

## After upload

1. **Import products** from `data/products.csv` (Products → Import). Everything arrives as
   `draft` on purpose — publish deliberately.
2. **Create collections** matching these handles: `flower`, `pre-rolls`, `edibles`,
   `vapes-concentrates`, `cbd-wellness`.
3. **Create pages** and assign the matching template suffix:
   `membership` (page.membership), `verification` (page.verification), `delivery`,
   `returns`, `terms`, `privacy`, `faq`, `about`, `how-it-works`.
4. **Bind the homepage collections** — the two `featured-products` sections on the homepage
   ship without a collection selected. Set them in the theme editor.
5. **Set the secure upload URL** on the membership application section. Identity documents
   must never be collected through the theme.
6. Run `shopify theme check` before going live.

## Membership status is driven by customer tags

An app writes these; the theme only reads them.

| Tag | Meaning |
|---|---|
| `verification-pending` | Application submitted |
| `verified-member` | Approved and current |
| `verification-rejected` | Reviewed and declined |
| `tier-standard` / `tier-premium` | Monthly allocation size |

## Things this theme deliberately does not do

- **No card payment fields.** Card networks and the mainstream gateways prohibit these
  products. Payment is EFT or cash on collection.
- **No identity documents through Liquid.** Anything rendered on the storefront is readable
  by the customer.
- **The age gate is a deterrent, not enforcement.** Real verification has to happen
  server-side before fulfilment.

Full detail in the project README.
