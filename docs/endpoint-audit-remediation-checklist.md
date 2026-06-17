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

### Previously Deferred — Now Closed

- [x] Row 4 - `POST /api/v1/auth/login`
  Email OTP login implemented via `POST /auth/otp/request` + `POST /auth/otp/verify` (`purpose=login`). SMS deferred until carrier partnership is in place.
- [x] Row 110 - `POST /api/v1/sellers/onboard`
  Converted to a public single-step endpoint. Creates user + seller profile, sends verification OTP and welcome email to seller, sends admin alert email. KYC/business-verification partner integration deferred.

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

- [x] Rows 88-95 - Returns and refunds
  New `src/returns/` module. `POST /returns`, `GET /returns`, `GET /returns/:id`, `PATCH /returns/:id/cancel`, `POST /returns/:id/evidence`, `GET /returns/eligibility/:orderItemId`. Refund side: `POST /refunds/:returnId/process` (admin), `GET /refunds/:id`. Return eligibility window is 7 days; supplier-specific overrides deferred.
- [x] Rows 96-109 - Logistics
  New `src/logistics/` module. `POST /logistics/quote`, `POST /logistics/coverage/check`, `POST /logistics/booking`, `GET /logistics/booking/:id`, `POST /logistics/booking/:id/cancel`, `POST /logistics/booking/:id/retry`, `GET /logistics/tracking/:bookingId`, `POST /logistics/pod`, `POST /webhooks/logistics/uber`, `POST /webhooks/logistics/bolt`, `POST /logistics/pickup/{ready,verify,complete,fail}`. Uber/Bolt courier integrations deferred — provider partnerships pending. In-house provider used for V1.
- [x] Rows 113-126 - Seller post-order workflows
  New `src/sellers/seller-post-order.controller.ts`. `POST /sellers/me/agreement`, `POST /sellers/me/kyc` (KYC partner deferred, email-only acknowledgement), `GET /sellers/me/orders`, `POST /sellers/me/orders/:id/acknowledge`, `POST /sellers/me/orders/:id/dispatch`, `GET /sellers/me/returns`, `POST /sellers/me/returns/:id/decision`, `GET /sellers/me/payouts` (Paystack Connect deferred), `GET /sellers/me/fees`.
- [x] Rows 150-176 - Admin orders, ops, and delivery config
  New `src/admin/admin-orders.controller.ts`: `GET /admin/orders`, `GET /admin/orders/:id`, `PATCH /admin/orders/:id/status`, `POST /admin/orders/:id/intervene`, `POST /admin/orders/:id/reassign`, `GET /admin/returns`, `POST /admin/returns/:id/decision`, `GET /admin/refunds`, `POST /admin/refunds/:id/approve`. New `src/admin/admin-delivery.controller.ts`: `GET/PATCH /admin/delivery/modes/:id`, `GET /admin/delivery/providers`, `PATCH /admin/delivery/providers/order`, `GET/PATCH /admin/delivery/coverage`.
- [x] Rows 267-292 - Promotional slots
  New `src/promo-slots/` module with four schemas (SlotType, DurationTier, PromoSlot, SlotBooking). Seller routes: `GET /promo-slots/available`, `GET /promo-slots/types`, `GET /promo-slots/:slotId`, `POST /promo-slots/:slotId/reserve`, `POST /promo-slots/bookings`, `GET /promo-slots/bookings`, `GET /promo-slots/bookings/:id`, `POST /promo-slots/bookings/:id/pay`, `POST /promo-slots/bookings/:id/cancel`, `GET /promo-slots/bookings/:id/performance`. Admin routes: full CRUD for slot types and duration tiers, capacity config, slot generation, booking management (suspend/refund), revenue and utilization reports.

## Phase 4 - Platform Expansion

- [ ] Rows 62-78 - Stripe, wallet, and pay-on-delivery (Phase 4b)
- [x] Rows 127-132 - Supplier module
  New `src/suppliers/` module (AccountType.SUPPLIER). Endpoints: `GET /suppliers/me/products`, `PATCH /suppliers/me/products/:id/stock`, `GET /suppliers/me/orders`, `POST /suppliers/me/orders/:id/ready`, `POST /suppliers/me/orders/:id/dispatch`, `GET /suppliers/me/policies`. SUPPLIER enum value added to AccountType.
- [x] Rows 177-211 - Reporting, compliance, support, and notifications
  Reporting: `src/admin/admin-reporting.controller.ts` — `GET /admin/reports/sales|gmv|orders|refunds|sellers|products|delivery|export` (8 endpoints, MongoDB aggregation). Compliance: `src/admin/admin-compliance.controller.ts` — audit-log stubs, data-request processing (real DB), retention policy, RBAC stubs, VAT-record stub, legal-page management via SiteConfig (12 endpoints). Support: `src/support/` — `POST /support/tickets` (Public), `GET /support/tickets` (user), `GET/POST /support/tickets/:id/messages`, admin assign/escalate/close, `POST /webhooks/support/whatsapp/inbound` stub. Notifications: `src/notifications/` — `GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/preferences`, `POST /admin/notifications/broadcast`, `POST /webhooks/sms/delivery`, `POST /webhooks/whatsapp/delivery`.
- [ ] Rows 217-266 - Partners and rewards (Phase 4b)
