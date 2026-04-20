# Deals Feature Blueprint

## Goal

Build a seller-paid promotion system where sellers can nominate up to 10 products, pay a fee, and have those products appear in the buyer-facing Deals/Flash Sales surface.

## Current Behavior (Implemented)

- `deals` is now a top-level category in `categories`.
- Buyer query `GET /products?category=deals` maps to section `best_deals`.
- Deals category `productCount` is derived from products tagged with `sections: "best_deals"`.

## Proposed Productized Model

Treat Deals as a promotion campaign, not a product taxonomy category.

### Entities

- `deal_campaigns`
  - `sellerId`
  - `title`
  - `status`: `draft | pending_payment | scheduled | live | expired | cancelled`
  - `maxProducts`: fixed `10`
  - `selectedProductIds`: `ObjectId[]` (1..10)
  - `feeAmount`
  - `currency` (`NGN`)
  - `paymentStatus`: `unpaid | pending | paid | failed | refunded`
  - `paymentReference`
  - `startsAt`, `endsAt`
  - `createdBy`, `approvedBy`
  - timestamps

- `deal_line_items` (optional if normalized later)
  - campaign/product linkage for detailed per-product analytics.

## Workflow

1. Seller creates a campaign in `draft`.
2. Seller selects up to 10 owned products.
3. Backend computes fee (`flat` or `per-product` pricing policy).
4. Seller pays (gateway webhook marks `paymentStatus=paid`).
5. Campaign moves to `scheduled` (or `live` when `startsAt` reached).
6. Live campaign products are exposed in Deals listing.
7. On `endsAt`, campaign auto-transitions to `expired`.

## API Sketch

- Seller:
  - `POST /deals/campaigns`
  - `PATCH /deals/campaigns/:id`
  - `POST /deals/campaigns/:id/submit`
  - `GET /deals/campaigns/me`
- Admin:
  - `PATCH /deals/campaigns/:id/approve`
  - `PATCH /deals/campaigns/:id/reject`
- Public:
  - `GET /deals` (active/live deals products)
  - `GET /products?category=deals` (already mapped)

## Enforcement Rules

- Only seller-owned products can be selected.
- Maximum 10 selected products per campaign.
- Product must be active/in-stock at activation time.
- Paid status is required for `live`.
- Campaign and product soft-deletes must be respected.

## Integration Notes

- Continue using the current `best_deals` product section as the serving rail.
- Campaign activation can sync `sections` on products (`add/remove "best_deals"`), or compute dynamically by campaign joins.
- Dynamic join is more accurate; section sync is simpler to ship first.

## Suggested Implementation Order

1. Schema + repository + seller/admin CRUD endpoints.
2. Payment status handling (manual then webhook).
3. Activation job (cron/worker) for status transitions.
4. Public deals endpoint + analytics hooks.
