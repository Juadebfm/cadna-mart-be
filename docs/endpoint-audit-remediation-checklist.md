# Endpoint Audit Remediation Checklist

Source of truth: [docs/endpoint-audit.csv](./endpoint-audit.csv)

## Working Rules

- Check an item only after code, verification, and audit notes are updated.
- Leave blocked or intentionally deferred items unchecked.
- Run lint and typecheck before every commit for a batch.
- Refresh `docs/openapi.json` whenever the public route surface changes and the export is runnable.

## Phase 0 - Hardening

- [x] Lock down bonus admin-style user routes.
- [x] Fix product detail-by-id parity with slug lookups.
- [x] Keep test and typecheck paths healthy on every branch.
- [x] Keep upload/docs wording aligned with the actual storage provider.

## Phase 1 - Quick Wins And Contract Alignment

### Deferred In This Branch

- [ ] Row 4 - `POST /api/v1/auth/login`
  Phone OTP still needs an SMS channel or a broader contract decision.
- [ ] Row 110 - `POST /api/v1/sellers/onboard`
  Spec expects public onboarding, while the real flow is still split across `/auth/register/seller/*`.

### Closed In This Branch

- [x] Row 111 - `GET /api/v1/sellers/me`
- [x] Row 112 - `PATCH /api/v1/sellers/me`
- [x] Row 115 - `GET /api/v1/sellers/me/products`
- [x] Row 116 - `POST /api/v1/sellers/me/products`
- [x] Row 117 - `PATCH /api/v1/sellers/me/products/{id}`
- [x] Row 118 - `DELETE /api/v1/sellers/me/products/{id}`
- [x] Row 119 - `POST /api/v1/sellers/me/products/{id}/images`
- [x] Row 134 - `POST /api/v1/admin/products`
- [x] Row 137 - `POST /api/v1/admin/products/{id}/approve`
- [x] Row 138 - `POST /api/v1/admin/products/{id}/reject`
- [x] Row 139 - `POST /api/v1/admin/products/{id}/feature`
- [x] Row 214 - `PATCH /api/v1/reviews/{id}`
- [x] Row 215 - `DELETE /api/v1/reviews/{id}`
- [x] Row 216 - `POST /api/v1/admin/reviews/{id}/moderate`
- [x] Row 293 - `POST /api/v1/media/upload`
- [x] Row 294 - `POST /api/v1/media/upload/presigned`
- [x] Row 295 - `DELETE /api/v1/media/{id}`
- [x] Row 297 - `GET /api/v1/version`
- [x] Row 298 - `GET /api/v1/config/public`
- [x] Row 299 - `GET /api/v1/legal/{slug}`
- [x] Row 300 - `GET /api/v1/geo/cities`

## Phase 2 - Commerce Core

- [x] Rows 47-54 - Checkout
- [x] Rows 55-60 - Paystack payments
- [x] Rows 79-87 - Orders
- [x] Rows 144-149 - Admin pricing and fees

## Phase 3 - Fulfilment And Seller Ops

- [ ] Rows 88-95 - Returns and refunds
- [ ] Rows 96-109 - Logistics
- [ ] Rows 113-126 - Seller post-order workflows
- [ ] Rows 150-176 - Admin orders, ops, and delivery config
- [ ] Rows 267-292 - Promotional slots

## Phase 4 - Platform Expansion

- [ ] Rows 62-78 - Stripe, wallet, and pay-on-delivery
- [ ] Rows 127-132 - Supplier module
- [ ] Rows 177-211 - Reporting, compliance, support, and notifications
- [ ] Rows 217-266 - Partners and rewards
