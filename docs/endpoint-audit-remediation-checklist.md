# Endpoint Audit Remediation Checklist

**Source of truth:** [docs/endpoint-audit.csv](./endpoint-audit.csv)
**Audit baseline date:** June 17, 2026
**Current baseline:** 95 `Present`, 21 `Partial`, 217 `Missing`
**Previous checklist:** [docs/endpoint-implementation-checklist.md](./endpoint-implementation-checklist.md) now serves as the closed historical record for rows 1-46.

## Goal

Use this document as the working implementation checklist for every remaining endpoint-audit gap and for a few high-priority hardening fixes discovered during review.

## How We Should Use This

- Check a box only when code is merged locally, verified, and the matching audit row has been updated.
- Keep implementation work batched by phase, not by scattered individual rows.
- If a row is intentionally deferred, keep it unchecked and add the reason in the audit file rather than silently skipping it.
- When a route changes the API contract, refresh `docs/openapi.json`.

## Definition Of Done For Any Checked Item

- [ ] Endpoint/controller/service/repository work is implemented.
- [ ] Validation, auth, and ownership checks are in place.
- [ ] `npm run build` passes.
- [ ] Relevant tests are added or updated.
- [ ] `docs/endpoint-audit.csv` status/note is updated.
- [ ] Swagger/OpenAPI is refreshed if the route surface changed.

## Batch Close-Out Routine

Run this after every implementation batch before commit and again before opening the PR.

- [ ] Run `npm run lint`.
- [ ] Run `npm run typecheck`.
- [ ] Run the most relevant tests for the batch.
- [ ] Update `docs/endpoint-audit.csv` while the implementation details are still fresh.
- [ ] Tick completed items in this checklist.
- [ ] Keep deferred items unchecked and document the reason in the audit notes.

## Phase 0 - Hardening And Audit Hygiene

These are not all explicit missing rows in the audit, but they are important enough to fix before we start stacking new modules on top.

- [x] Lock down user-admin surface in `src/users/users.controller.ts` so non-admin users cannot access admin-style `GET/PATCH /users/:id` behavior.
- [x] Fix the product detail-by-ObjectId path so it matches slug behavior for `isActive` filtering and seller population.
- [x] Make `npm test` discover actual tests instead of returning "No tests found".
- [x] Fix the `test:e2e` TypeScript compile failure in `src/database/database.module.ts`.
- [x] Align upload naming/docs so controller copy matches the actual Cloudinary implementation.
- [x] Add a recurring "audit maintenance" pass after each batch so row statuses do not drift from the code again.

## Phase 1 - Quick Wins And Contract Alignment

Focus on cheap gaps, partials, aliases, and contract cleanup that improve the platform without forcing the full commerce engine yet.

### 1. Auth & Account Mgmt

- [ ] **Row 4** — `POST /api/v1/auth/login` (Partial)

### 13. Seller Module

- [ ] **Row 110** — `POST /api/v1/sellers/onboard` (Partial)
- [ ] **Row 111** — `GET /api/v1/sellers/me` (Partial)
- [ ] **Row 112** — `PATCH /api/v1/sellers/me` (Partial)
- [ ] **Row 115** — `GET /api/v1/sellers/me/products` (Partial)
- [ ] **Row 116** — `POST /api/v1/sellers/me/products` (Partial)
- [ ] **Row 117** — `PATCH /api/v1/sellers/me/products/{id}` (Partial)
- [ ] **Row 118** — `DELETE /api/v1/sellers/me/products/{id}` (Partial)
- [ ] **Row 119** — `POST /api/v1/sellers/me/products/{id}/images` (Partial)

### 15. Admin - Catalog

- [ ] **Row 134** — `POST /api/v1/admin/products` (Missing)
- [ ] **Row 137** — `POST /api/v1/admin/products/{id}/approve` (Partial)
- [ ] **Row 138** — `POST /api/v1/admin/products/{id}/reject` (Partial)
- [ ] **Row 139** — `POST /api/v1/admin/products/{id}/feature` (Missing)

### 24. Ratings & Reviews

- [ ] **Row 214** — `PATCH /api/v1/reviews/{id}` (Missing)
- [ ] **Row 215** — `DELETE /api/v1/reviews/{id}` (Missing)
- [ ] **Row 216** — `POST /api/v1/admin/reviews/{id}/moderate` (Missing)

### 28. File / Media Uploads

- [ ] **Row 293** — `POST /api/v1/media/upload` (Partial)
- [ ] **Row 294** — `POST /api/v1/media/upload/presigned` (Missing)
- [ ] **Row 295** — `DELETE /api/v1/media/{id}` (Missing)

### 29. System / Utility

- [ ] **Row 297** — `GET /api/v1/version` (Missing)
- [ ] **Row 298** — `GET /api/v1/config/public` (Partial)
- [ ] **Row 299** — `GET /api/v1/legal/{slug}` (Missing)
- [ ] **Row 300** — `GET /api/v1/geo/cities` (Missing)

## Phase 2 - Commerce Core

This is the highest-value product phase. It turns the existing catalog/cart foundation into a real order-capable commerce flow.

### 5. Checkout

- [ ] **Row 47** — `POST /api/v1/checkout/session` (Missing)
- [ ] **Row 48** — `POST /api/v1/checkout/{sessionId}/address` (Missing)
- [ ] **Row 49** — `POST /api/v1/checkout/{sessionId}/address/validate` (Missing)
- [ ] **Row 50** — `GET /api/v1/checkout/{sessionId}/delivery-options` (Missing)
- [ ] **Row 51** — `POST /api/v1/checkout/{sessionId}/delivery` (Missing)
- [ ] **Row 52** — `POST /api/v1/checkout/{sessionId}/pickup-details` (Missing)
- [ ] **Row 53** — `GET /api/v1/checkout/{sessionId}/summary` (Missing)
- [ ] **Row 54** — `POST /api/v1/checkout/{sessionId}/confirm` (Missing)

### 6. Payments - Paystack

- [ ] **Row 55** — `POST /api/v1/payments/paystack/initialize` (Missing)
- [ ] **Row 56** — `GET /api/v1/payments/paystack/verify/{reference}` (Missing)
- [ ] **Row 57** — `POST /api/v1/payments/paystack/charge/authorize` (Missing)
- [ ] **Row 58** — `POST /api/v1/payments/paystack/transfer/initialize` (Missing)
- [ ] **Row 59** — `GET /api/v1/payments/paystack/transfer/status/{ref}` (Missing)
- [ ] **Row 60** — `POST /api/v1/payments/paystack/refund` (Missing)

### 10. Orders

- [ ] **Row 79** — `POST /api/v1/orders` (Missing)
- [ ] **Row 80** — `GET /api/v1/orders` (Missing)
- [ ] **Row 81** — `GET /api/v1/orders/{id}` (Missing)
- [ ] **Row 82** — `GET /api/v1/orders/{id}/timeline` (Missing)
- [ ] **Row 83** — `GET /api/v1/orders/{id}/tracking` (Missing)
- [ ] **Row 84** — `POST /api/v1/orders/{id}/cancel` (Missing)
- [ ] **Row 85** — `GET /api/v1/orders/{id}/invoice` (Missing)
- [ ] **Row 86** — `GET /api/v1/orders/{id}/pod` (Missing)
- [ ] **Row 87** — `POST /api/v1/orders/guest/lookup` (Missing)

### 16. Admin - Pricing & Fees

- [ ] **Row 144** — `GET /api/v1/admin/pricing/rules` (Missing)
- [ ] **Row 145** — `POST /api/v1/admin/pricing/rules` (Missing)
- [ ] **Row 146** — `PATCH /api/v1/admin/pricing/rules/{id}` (Missing)
- [ ] **Row 147** — `GET /api/v1/admin/pricing/fees` (Missing)
- [ ] **Row 148** — `PATCH /api/v1/admin/pricing/fees` (Missing)
- [ ] **Row 149** — `POST /api/v1/admin/pricing/simulate` (Missing)

## Phase 3 - Fulfilment And Seller Operations

Once checkout/orders exist, we can close the seller-side and post-order workflows around them.

### 11. Returns & Refunds

- [ ] **Row 88** — `POST /api/v1/returns` (Missing)
- [ ] **Row 89** — `GET /api/v1/returns` (Missing)
- [ ] **Row 90** — `GET /api/v1/returns/{id}` (Missing)
- [ ] **Row 91** — `PATCH /api/v1/returns/{id}/cancel` (Missing)
- [ ] **Row 92** — `POST /api/v1/returns/{id}/evidence` (Missing)
- [ ] **Row 93** — `GET /api/v1/returns/eligibility/{orderItemId}` (Missing)
- [ ] **Row 94** — `POST /api/v1/refunds/{returnId}/process` (Missing)
- [ ] **Row 95** — `GET /api/v1/refunds/{id}` (Missing)

### 12. Logistics

- [ ] **Row 96** — `POST /api/v1/logistics/quote` (Partial)
- [ ] **Row 97** — `POST /api/v1/logistics/coverage/check` (Missing)
- [ ] **Row 98** — `POST /api/v1/logistics/booking` (Missing)
- [ ] **Row 99** — `GET /api/v1/logistics/booking/{id}` (Missing)
- [ ] **Row 100** — `POST /api/v1/logistics/booking/{id}/cancel` (Missing)
- [ ] **Row 101** — `POST /api/v1/logistics/booking/{id}/retry` (Missing)
- [ ] **Row 102** — `GET /api/v1/logistics/tracking/{bookingId}` (Missing)
- [ ] **Row 103** — `POST /api/v1/logistics/pod` (Missing)
- [ ] **Row 104** — `POST /api/v1/webhooks/logistics/uber` (Missing)
- [ ] **Row 105** — `POST /api/v1/webhooks/logistics/bolt` (Missing)
- [ ] **Row 106** — `POST /api/v1/logistics/pickup/ready` (Missing)
- [ ] **Row 107** — `POST /api/v1/logistics/pickup/verify` (Missing)
- [ ] **Row 108** — `POST /api/v1/logistics/pickup/complete` (Missing)
- [ ] **Row 109** — `POST /api/v1/logistics/pickup/fail` (Missing)

### 13. Seller Module

- [ ] **Row 113** — `POST /api/v1/sellers/me/agreement` (Missing)
- [ ] **Row 114** — `POST /api/v1/sellers/me/kyc` (Missing)
- [ ] **Row 120** — `GET /api/v1/sellers/me/orders` (Missing)
- [ ] **Row 121** — `POST /api/v1/sellers/me/orders/{id}/acknowledge` (Missing)
- [ ] **Row 122** — `POST /api/v1/sellers/me/orders/{id}/dispatch` (Missing)
- [ ] **Row 123** — `GET /api/v1/sellers/me/returns` (Missing)
- [ ] **Row 124** — `POST /api/v1/sellers/me/returns/{id}/decision` (Missing)
- [ ] **Row 125** — `GET /api/v1/sellers/me/payouts` (Missing)
- [ ] **Row 126** — `GET /api/v1/sellers/me/fees` (Missing)

### 17. Admin - Orders & Ops

- [ ] **Row 150** — `GET /api/v1/admin/orders` (Missing)
- [ ] **Row 151** — `GET /api/v1/admin/orders/{id}` (Missing)
- [ ] **Row 152** — `PATCH /api/v1/admin/orders/{id}/status` (Missing)
- [ ] **Row 153** — `POST /api/v1/admin/orders/{id}/intervene` (Missing)
- [ ] **Row 154** — `POST /api/v1/admin/orders/{id}/reassign` (Missing)
- [ ] **Row 155** — `GET /api/v1/admin/returns` (Missing)
- [ ] **Row 156** — `POST /api/v1/admin/returns/{id}/decision` (Missing)
- [ ] **Row 157** — `GET /api/v1/admin/refunds` (Missing)
- [ ] **Row 158** — `POST /api/v1/admin/refunds/{id}/approve` (Missing)

### 18. Admin - Sellers/Suppliers/Users

- [ ] **Row 160** — `GET /api/v1/admin/sellers/{id}` (Missing)
- [ ] **Row 163** — `POST /api/v1/admin/sellers/{id}/suspend` (Missing)
- [ ] **Row 164** — `POST /api/v1/admin/sellers/{id}/activate` (Missing)
- [ ] **Row 165** — `GET /api/v1/admin/suppliers` (Missing)
- [ ] **Row 166** — `POST /api/v1/admin/suppliers` (Missing)
- [ ] **Row 167** — `PATCH /api/v1/admin/suppliers/{id}` (Missing)

### 19. Admin - Delivery Config

- [ ] **Row 171** — `GET /api/v1/admin/delivery/modes` (Missing)
- [ ] **Row 172** — `PATCH /api/v1/admin/delivery/modes/{id}` (Missing)
- [ ] **Row 173** — `GET /api/v1/admin/delivery/providers` (Missing)
- [ ] **Row 174** — `PATCH /api/v1/admin/delivery/providers/order` (Missing)
- [ ] **Row 175** — `GET /api/v1/admin/delivery/coverage` (Missing)
- [ ] **Row 176** — `PATCH /api/v1/admin/delivery/coverage` (Missing)

### 27. Promotional Slots

- [ ] **Row 267** — `GET /api/v1/promo-slots/available` (Partial)
- [ ] **Row 268** — `GET /api/v1/promo-slots/types` (Missing)
- [ ] **Row 269** — `GET /api/v1/promo-slots/{slotId}` (Missing)
- [ ] **Row 270** — `POST /api/v1/promo-slots/{slotId}/reserve` (Missing)
- [ ] **Row 271** — `POST /api/v1/promo-slots/bookings` (Partial)
- [ ] **Row 272** — `GET /api/v1/promo-slots/bookings` (Partial)
- [ ] **Row 273** — `GET /api/v1/promo-slots/bookings/{id}` (Partial)
- [ ] **Row 274** — `POST /api/v1/promo-slots/bookings/{id}/pay` (Partial)
- [ ] **Row 275** — `POST /api/v1/promo-slots/bookings/{id}/cancel` (Partial)
- [ ] **Row 276** — `GET /api/v1/promo-slots/bookings/{id}/performance` (Missing)
- [ ] **Row 277** — `GET /api/v1/admin/promo-slots/types` (Missing)
- [ ] **Row 278** — `POST /api/v1/admin/promo-slots/types` (Missing)
- [ ] **Row 279** — `PATCH /api/v1/admin/promo-slots/types/{id}` (Missing)
- [ ] **Row 280** — `DELETE /api/v1/admin/promo-slots/types/{id}` (Missing)
- [ ] **Row 281** — `GET /api/v1/admin/promo-slots/duration-tiers` (Missing)
- [ ] **Row 282** — `POST /api/v1/admin/promo-slots/duration-tiers` (Missing)
- [ ] **Row 283** — `PATCH /api/v1/admin/promo-slots/duration-tiers/{id}` (Missing)
- [ ] **Row 284** — `DELETE /api/v1/admin/promo-slots/duration-tiers/{id}` (Missing)
- [ ] **Row 285** — `GET /api/v1/admin/promo-slots/capacity` (Missing)
- [ ] **Row 286** — `PATCH /api/v1/admin/promo-slots/capacity` (Missing)
- [ ] **Row 287** — `POST /api/v1/admin/promo-slots/generate` (Missing)
- [ ] **Row 288** — `GET /api/v1/admin/promo-slots/bookings` (Partial)
- [ ] **Row 289** — `POST /api/v1/admin/promo-slots/bookings/{id}/suspend` (Missing)
- [ ] **Row 290** — `POST /api/v1/admin/promo-slots/bookings/{id}/refund` (Missing)
- [ ] **Row 291** — `GET /api/v1/admin/promo-slots/reports/revenue` (Missing)
- [ ] **Row 292** — `GET /api/v1/admin/promo-slots/reports/utilization` (Missing)

## Phase 4 - Platform Expansion

These are real backlog items, but they should come after the commerce core and seller/ops flow are stable unless priorities change.

### 7. Payments - Stripe

- [ ] **Row 62** — `POST /api/v1/payments/stripe/payment-intent` (Missing)
- [ ] **Row 63** — `POST /api/v1/payments/stripe/payment-intent/{id}/confirm` (Missing)
- [ ] **Row 64** — `POST /api/v1/payments/stripe/setup-intent` (Missing)
- [ ] **Row 65** — `POST /api/v1/payments/stripe/refund` (Missing)
- [ ] **Row 66** — `GET /api/v1/payments/stripe/payment-methods` (Missing)
- [ ] **Row 67** — `DELETE /api/v1/payments/stripe/payment-methods/{id}` (Missing)
- [ ] **Row 68** — `POST /api/v1/webhooks/stripe` (Missing)

### 8. Payments - Wallet

- [ ] **Row 69** — `GET /api/v1/wallet` (Missing)
- [ ] **Row 70** — `GET /api/v1/wallet/transactions` (Missing)
- [ ] **Row 71** — `POST /api/v1/wallet/topup/initialize` (Missing)
- [ ] **Row 72** — `POST /api/v1/wallet/debit` (Missing)
- [ ] **Row 73** — `POST /api/v1/wallet/credit` (Missing)
- [ ] **Row 74** — `POST /api/v1/wallet/transfer` (Missing)
- [ ] **Row 75** — `GET /api/v1/wallet/holds` (Missing)

### 9. Pay on Delivery (PoD)

- [ ] **Row 76** — `GET /api/v1/payments/pod/eligibility` (Missing)
- [ ] **Row 77** — `POST /api/v1/payments/pod/confirm` (Missing)
- [ ] **Row 78** — `POST /api/v1/payments/pod/collect` (Missing)

### 14. Supplier Module

- [ ] **Row 127** — `GET /api/v1/suppliers/me/products` (Missing)
- [ ] **Row 128** — `PATCH /api/v1/suppliers/me/products/{id}/stock` (Missing)
- [ ] **Row 129** — `GET /api/v1/suppliers/me/orders` (Missing)
- [ ] **Row 130** — `POST /api/v1/suppliers/me/orders/{id}/ready` (Missing)
- [ ] **Row 131** — `POST /api/v1/suppliers/me/orders/{id}/dispatch` (Missing)
- [ ] **Row 132** — `GET /api/v1/suppliers/me/policies` (Missing)

### 20. Admin - Reporting

- [ ] **Row 177** — `GET /api/v1/admin/reports/sales` (Missing)
- [ ] **Row 178** — `GET /api/v1/admin/reports/gmv` (Missing)
- [ ] **Row 179** — `GET /api/v1/admin/reports/orders` (Missing)
- [ ] **Row 180** — `GET /api/v1/admin/reports/refunds` (Missing)
- [ ] **Row 181** — `GET /api/v1/admin/reports/sellers` (Missing)
- [ ] **Row 182** — `GET /api/v1/admin/reports/products` (Missing)
- [ ] **Row 183** — `GET /api/v1/admin/reports/delivery` (Missing)
- [ ] **Row 184** — `GET /api/v1/admin/reports/export` (Missing)

### 21. Compliance, Audit & RBAC

- [ ] **Row 185** — `GET /api/v1/admin/audit-logs` (Missing)
- [ ] **Row 186** — `GET /api/v1/admin/audit-logs/{id}` (Missing)
- [ ] **Row 187** — `GET /api/v1/admin/compliance/data-requests` (Missing)
- [ ] **Row 188** — `POST /api/v1/admin/compliance/data-requests/{id}/process` (Missing)
- [ ] **Row 189** — `GET /api/v1/admin/compliance/retention` (Missing)
- [ ] **Row 190** — `GET /api/v1/admin/roles` (Missing)
- [ ] **Row 191** — `POST /api/v1/admin/roles` (Missing)
- [ ] **Row 192** — `PATCH /api/v1/admin/roles/{id}` (Missing)
- [ ] **Row 193** — `POST /api/v1/admin/users/{id}/roles` (Missing)
- [ ] **Row 194** — `GET /api/v1/admin/tax/vat-records` (Missing)
- [ ] **Row 195** — `GET /api/v1/admin/legal/pages` (Missing)
- [ ] **Row 196** — `PATCH /api/v1/admin/legal/pages/{slug}` (Missing)

### 22. Customer Support

- [ ] **Row 197** — `POST /api/v1/support/tickets` (Missing)
- [ ] **Row 198** — `GET /api/v1/support/tickets` (Missing)
- [ ] **Row 199** — `GET /api/v1/support/tickets/{id}` (Missing)
- [ ] **Row 200** — `POST /api/v1/support/tickets/{id}/messages` (Missing)
- [ ] **Row 201** — `POST /api/v1/support/whatsapp/inbound` (Missing)
- [ ] **Row 202** — `GET /api/v1/admin/support/tickets` (Missing)
- [ ] **Row 203** — `POST /api/v1/admin/support/tickets/{id}/assign` (Missing)
- [ ] **Row 204** — `POST /api/v1/admin/support/tickets/{id}/escalate` (Missing)
- [ ] **Row 205** — `POST /api/v1/admin/support/tickets/{id}/close` (Missing)

### 23. Notifications

- [ ] **Row 206** — `GET /api/v1/notifications` (Missing)
- [ ] **Row 207** — `PATCH /api/v1/notifications/{id}/read` (Missing)
- [ ] **Row 208** — `POST /api/v1/notifications/preferences` (Missing)
- [ ] **Row 209** — `POST /api/v1/admin/notifications/broadcast` (Missing)
- [ ] **Row 210** — `POST /api/v1/webhooks/sms/delivery` (Missing)
- [ ] **Row 211** — `POST /api/v1/webhooks/whatsapp/delivery` (Missing)

### 25. Procurement/Credit Partner

- [ ] **Row 217** — `POST /api/v1/partners/onboard` (Missing)
- [ ] **Row 218** — `POST /api/v1/partners/me/kyc` (Missing)
- [ ] **Row 219** — `POST /api/v1/partners/me/agreement` (Missing)
- [ ] **Row 220** — `GET /api/v1/partners/me/dashboard` (Missing)
- [ ] **Row 221** — `GET /api/v1/partners/me/eligible-items` (Missing)
- [ ] **Row 222** — `GET /api/v1/partners/me/eligible-items/{id}` (Missing)
- [ ] **Row 223** — `POST /api/v1/partners/me/commitments` (Missing)
- [ ] **Row 224** — `GET /api/v1/partners/me/commitments` (Missing)
- [ ] **Row 225** — `GET /api/v1/partners/me/commitments/{id}` (Missing)
- [ ] **Row 226** — `GET /api/v1/partners/me/commitments/{id}/status` (Missing)
- [ ] **Row 227** — `GET /api/v1/partners/me/settlements` (Missing)
- [ ] **Row 228** — `POST /api/v1/partners/me/disputes` (Missing)
- [ ] **Row 229** — `GET /api/v1/admin/partners` (Missing)
- [ ] **Row 230** — `POST /api/v1/admin/partners/{id}/approve` (Missing)
- [ ] **Row 231** — `GET /api/v1/admin/partners/eligibility-rules` (Missing)
- [ ] **Row 232** — `PATCH /api/v1/admin/partners/eligibility-rules` (Missing)
- [ ] **Row 233** — `GET /api/v1/admin/partners/commitments` (Missing)
- [ ] **Row 234** — `POST /api/v1/admin/partners/commitments/{id}/approve` (Missing)
- [ ] **Row 235** — `POST /api/v1/admin/partners/disputes/{id}/resolve` (Missing)
- [ ] **Row 236** — `GET /api/v1/admin/partners/funding-caps` (Missing)
- [ ] **Row 237** — `PATCH /api/v1/admin/partners/funding-caps` (Missing)

### 26. Rewards

- [ ] **Row 238** — `GET /api/v1/admin/rewards/program` (Missing)
- [ ] **Row 239** — `POST /api/v1/admin/rewards/program` (Missing)
- [ ] **Row 240** — `PATCH /api/v1/admin/rewards/program` (Missing)
- [ ] **Row 241** — `GET /api/v1/rewards/program` (Missing)
- [ ] **Row 242** — `GET /api/v1/rewards/me` (Missing)
- [ ] **Row 243** — `GET /api/v1/rewards/me/cashback` (Missing)
- [ ] **Row 244** — `GET /api/v1/rewards/me/transactions` (Missing)
- [ ] **Row 245** — `POST /api/v1/rewards/cashback/redeem` (Missing)
- [ ] **Row 246** — `GET /api/v1/rewards/tiers` (Missing)
- [ ] **Row 247** — `GET /api/v1/rewards/campaigns` (Missing)
- [ ] **Row 248** — `POST /api/v1/rewards/affiliates/enroll` (Missing)
- [ ] **Row 249** — `GET /api/v1/rewards/affiliates/me` (Missing)
- [ ] **Row 250** — `GET /api/v1/rewards/affiliates/me/earnings` (Missing)
- [ ] **Row 251** — `POST /api/v1/rewards/affiliates/me/payout` (Missing)
- [ ] **Row 252** — `GET /api/v1/rewards/affiliates/me/referrals` (Missing)
- [ ] **Row 253** — `GET /api/v1/rewards/sellers/me/rewards` (Missing)
- [ ] **Row 254** — `GET /api/v1/rewards/financiers/me/rewards` (Missing)
- [ ] **Row 255** — `GET /api/v1/admin/rewards/config` (Missing)
- [ ] **Row 256** — `PATCH /api/v1/admin/rewards/config` (Missing)
- [ ] **Row 257** — `GET /api/v1/admin/rewards/tiers` (Missing)
- [ ] **Row 258** — `POST /api/v1/admin/rewards/tiers` (Missing)
- [ ] **Row 259** — `PATCH /api/v1/admin/rewards/tiers/{id}` (Missing)
- [ ] **Row 260** — `DELETE /api/v1/admin/rewards/tiers/{id}` (Missing)
- [ ] **Row 261** — `GET /api/v1/admin/rewards/campaigns` (Missing)
- [ ] **Row 262** — `POST /api/v1/admin/rewards/campaigns` (Missing)
- [ ] **Row 263** — `PATCH /api/v1/admin/rewards/campaigns/{id}` (Missing)
- [ ] **Row 264** — `DELETE /api/v1/admin/rewards/campaigns/{id}` (Missing)
- [ ] **Row 265** — `GET /api/v1/admin/rewards/fraud-alerts` (Missing)
- [ ] **Row 266** — `POST /api/v1/admin/rewards/fraud-alerts/{id}/resolve` (Missing)
