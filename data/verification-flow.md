# Membership and verification

## State machine

```
unverified ──apply──▶ pending ──approve──▶ approved ──1 year──▶ expired
                         │                                          │
                         └──reject──▶ rejected ──reapply──▶ pending ◀┘
```

| Status | Set by | Customer can buy |
|---|---|---|
| `unverified` | default | CBD/hemp only |
| `pending` | applicant submits | CBD/hemp only |
| `approved` | reviewer | everything, up to allocation |
| `rejected` | reviewer, with a reason | CBD/hemp only |
| `expired` | 12 months after approval | CBD/hemp only |

A rejection always carries a reason. The reviewer UI refuses to submit without one,
because the applicant is told why and "no reason given" generates support load.

## Where each piece runs

The single most important rule: **identity documents must never pass through the theme.**
Liquid renders on Shopify's storefront and anything readable there is readable by the
customer. ID numbers and document files belong in an app with its own storage.

| Concern | Where it runs | Why |
|---|---|---|
| Age gate | Theme (`snippets/age-gate.liquid`) | Deterrent only |
| Application basics (name, address, declarations) | Theme (`sections/membership-apply.liquid`) via `{% form 'contact' %}` | Non-sensitive |
| ID number + document upload | **App**, linked from the theme via `upload_url` | POPIA special personal information |
| Review queue and decisions | **App** | Needs write access to customer tags/metafields |
| Status display and gating | Theme (`snippets/member-status.liquid`, `member-gate.liquid`) | Reads tags only |
| Order release | **App / Shopify Flow**, before fulfilment | The only enforcement that actually counts |

The preview at `preview/#/admin/verifications` shows what the review queue should do.
It is a design reference, not the implementation — it stores everything in `localStorage`.

## Customer tags

Status is carried on customer tags because tags are the only customer field that is
both readable in Liquid and writable by an app. Create none of these by hand; the app owns them.

| Tag | Meaning |
|---|---|
| `verification-pending` | Application submitted, awaiting review |
| `verified-member` | Approved and current |
| `verification-rejected` | Reviewed and declined |
| `tier-standard` | 8 units per month |
| `tier-premium` | 16 units per month |

`snippets/member-status.liquid` reads these and outputs one word. Capture it:

```liquid
{% capture member_status %}{% render 'member-status' %}{% endcapture %}
{% assign member_status = member_status | strip %}
```

Snippets have an isolated scope, so a plain `{% render %}` cannot assign back to the
caller — the capture is required, not stylistic.

## Customer metafields

Create under **Settings → Custom data → Customers**, namespace `custom`.
Set the storefront visibility column carefully — the last three must stay private.

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

Full ID numbers and document files are not on this list on purpose. They belong in the
app's own encrypted store, keyed by customer ID, never in a Shopify metafield.

## Product gating

A product is gated unless `product.metafields.custom.member_tier` is `open`.
The CBD and hemp lines are `open`, so the wellness range stays purchasable by anyone
and a mixed cart tells the customer exactly which lines are blocked rather than
failing the whole checkout.

Gating lives in three places and all three are needed:

1. `sections/main-product.liquid` — hides the add-to-cart form
2. `sections/main-cart.liquid` — disables checkout and names the blocked items
3. **The app, before fulfilment** — the only one a determined customer cannot bypass

Items 1 and 2 are user experience. Only item 3 is compliance.

## POPIA obligations

South African law treats ID numbers and biometric-adjacent identity documents as
*special personal information*. What that means concretely here:

- **Purpose limitation.** Documents may be used to verify age and residency, nothing else.
  Do not mine them for marketing segments.
- **Consent must be explicit and recorded.** The fourth declaration checkbox is that record.
  Store the timestamp with the application.
- **Retention limits.** Delete documents 12 months after membership ends. Put this on a
  scheduled job, not on a person's memory.
- **Right to deletion.** Members can request removal at any time; you have 30 days.
- **Breach notification.** A leak of this data is reportable to the Information Regulator.

Encrypt documents at rest, restrict reviewer access by role, and log every view of a
document — the audit trail in the preview's review screen shows the shape this should take.

## Allocation

Approved members get a monthly unit allowance: 8 for standard, 16 for premium.
One unit is one item of any product. Allowance resets on the first of the month.

This is enforced in the preview at add-to-cart. In production it also has to be
enforced at order creation, because cart state is client-side and trivially edited.
