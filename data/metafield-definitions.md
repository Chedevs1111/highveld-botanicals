# Metafield definitions

Create these in Shopify admin under **Settings → Custom data → Products** *before*
importing `products.csv`. The CSV carries metafield columns, and Shopify silently
drops values whose definition does not exist yet.

All definitions use the `custom` namespace and should be set to
**Storefronts: exposed** so the Liquid theme can read them.

| Name | Namespace and key | Type | Notes |
|---|---|---|---|
| Strain Type | `custom.strain_type` | Single line text | Sativa, Indica, Hybrid, Hemp |
| THC Percentage | `custom.thc_percentage` | Decimal | Flower, pre-rolls, concentrates. Leave empty for edibles |
| CBD Percentage | `custom.cbd_percentage` | Decimal | Leave empty for edibles |
| THC mg | `custom.thc_mg` | Integer | Edibles and tinctures. Per piece for gummies, per unit for bars |
| CBD mg | `custom.cbd_mg` | Integer | Edibles, tinctures, topicals |
| Terpenes | `custom.terpenes` | Single line text, **list** | e.g. Terpinolene, Ocimene, Myrcene |
| Effects | `custom.effects` | Single line text, **list** | Reported effects, not medical claims |
| Batch ID | `custom.batch_id` | Single line text | Must match the COA on file |
| COA URL | `custom.coa_url` | URL | Link to the batch certificate |
| Member Tier | `custom.member_tier` | Single line text | `open`, `standard` or `premium` |
| Age Restricted | `custom.age_restricted` | True or false | `false` only for CBD/hemp lines |

## Why the theme reads both percentage and mg

`snippets/potency-badge.liquid` falls back from percentage to milligrams, because
the two product families are measured differently and showing "0%" on a gummy is
misleading. Populate one pair or the other, never both.

## Member tier behaviour

- `open` — non-intoxicating CBD/hemp. Renders a "No membership" badge, no age warning.
- `standard` — members-only, normal potency.
- `premium` — members-only, high potency. Renders the dosing warning on the product page.
