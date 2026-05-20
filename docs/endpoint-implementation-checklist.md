# Endpoint Implementation Checklist — Rows 1–46

**Goal:** Move rows 1–46 of [endpoint-audit.csv](endpoint-audit.csv) from Missing/Partial to Present.
**Total items:** 41 endpoints + 6 supporting tasks across 5 phases.
**Working branch:** `dev`
**Commit strategy:** one commit per phase (so audit can be updated incrementally).

How to use this doc:
- Check `[x]` as each row goes green.
- Each item lists: spec row #, method/path, where to put it (`file_path:line`), and the existing handler/service it should wrap or extend.
- After each phase, run `npm run build && npm run lint`, smoke-test the routes, then commit and update [endpoint-audit.csv](endpoint-audit.csv) status column.

---

## Phase A — Path aliases (≈15 min, 5 rows) ✅ DONE

Decorator-only additions on existing handlers. Zero new logic.

- [x] **Row 7** — `POST /auth/password/reset/request` → [src/auth/auth.controller.ts:186](src/auth/auth.controller.ts#L186)
- [x] **Row 8** — `POST /auth/password/reset/confirm` → [src/auth/auth.controller.ts:210](src/auth/auth.controller.ts#L210)
- [x] **Row 11** — `GET /auth/me` → [src/auth/auth.controller.ts:262](src/auth/auth.controller.ts#L262)
- [x] **Row 33** — `GET /products/:productId/policies` → [src/products/products.controller.ts:54](src/products/products.controller.ts#L54) (PoliciesService injected via PoliciesModule import)
- [x] **Row 36** — `GET /search/suggestions` → [src/search/search.controller.ts:19](src/search/search.controller.ts#L19)

Build: ✅ clean (199 files compiled).

**Phase A commit message:** `feat(api): add spec-aligned auth/search/policies path aliases`

---

## Phase B — OTP + login surface (≈1 hr, 6 rows) ✅ DONE

- [x] **Supporting** — `OtpPurpose` enum (LOGIN | EMAIL_VERIFICATION | PASSWORD_RESET) added in [src/auth/dto/otp.dto.ts](src/auth/dto/otp.dto.ts).
- [x] **Supporting** — `requestOtp`, `verifyOtp`, `resendOtp`, single-call `register` methods added to [src/auth/auth.service.ts](src/auth/auth.service.ts).
- [x] **Row 1** — `POST /auth/otp/request` → [src/auth/auth.controller.ts:139](src/auth/auth.controller.ts#L139)
- [x] **Row 2** — `POST /auth/otp/verify` → [src/auth/auth.controller.ts:149](src/auth/auth.controller.ts#L149) (returns JWT/message/resetToken depending on purpose)
- [x] **Row 3** — `POST /auth/otp/resend` → [src/auth/auth.controller.ts:160](src/auth/auth.controller.ts#L160)
- [x] **Row 4** — `POST /auth/login` Swagger note updated; remains email+password. Phone-OTP stays Partial in audit (no SMS provider). Email-OTP login available via rows 1+2.
- [x] **Row 5** — `POST /auth/login/password` → [src/auth/auth.controller.ts:211](src/auth/auth.controller.ts#L211)
- [x] **Row 6** — `POST /auth/register` (single-call) → [src/auth/auth.controller.ts:128](src/auth/auth.controller.ts#L128)

Build: ✅ clean (201 files).

**Phase B commit message:** `feat(auth): expose OTP request/verify/resend and unified register endpoint`

---

## Phase D — Catalog & storefront (≈1.5 hrs, 10 rows) ✅ DONE

- [x] **Row 24** — `GET /categories/:slug` → [src/categories/categories.controller.ts:20](src/categories/categories.controller.ts#L20)
- [x] **Row 25** — `GET /categories/:slug/products` → [src/products/category-products.controller.ts:13](src/products/category-products.controller.ts#L13) (new controller in ProductsModule reusing ProductsService.findAll with category filter)
- [x] **Row 26** — `GET /collections/featured` → [src/collections/collections.controller.ts:12](src/collections/collections.controller.ts#L12)
- [x] **Row 27** — `GET /collections/flash-sales` → [src/collections/collections.controller.ts:19](src/collections/collections.controller.ts#L19) (data depends on products tagged `sections=flash_sale` — admin populates)
- [x] **Row 28** — `GET /collections/best-deals` → [src/collections/collections.controller.ts:26](src/collections/collections.controller.ts#L26)
- [x] **Row 30** — `GET /products/:idOrSlug` → [src/products/products.controller.ts:40](src/products/products.controller.ts#L40) (handler accepts Mongo ID or slug)
- [x] **Row 31** — `GET /products/:productId/variants` → [src/products/products.controller.ts:54](src/products/products.controller.ts#L54)
- [x] **Row 32** — `GET /products/:productId/availability` → [src/products/products.controller.ts:61](src/products/products.controller.ts#L61)
- [x] **Row 35** — `GET /search` → [src/search/search.controller.ts:13](src/search/search.controller.ts#L13)
- [x] **Row 37** — `GET /brands` → [src/brands/brands.controller.ts:12](src/brands/brands.controller.ts#L12) (BrandsService aggregates distinct brand from products)

New modules registered in [src/app.module.ts](src/app.module.ts): `CollectionsModule`, `BrandsModule`.
Build: ✅ clean (207 files).

**Phase D commit message:** `feat(catalog): add categories detail, collections, brands, search, product variants/availability`

---

## Phase C — User profile + addresses + NDPR + auth log (≈2 hrs, 11 rows) ✅ DONE

- [x] **Supporting** — `Address` schema + `AddressesModule` with service & controller ([src/addresses/](src/addresses/))
- [x] **Supporting** — `marketingConsentAt` added to [User schema](src/users/schemas/user.schema.ts)
- [x] **Supporting** — `DataRequest` schema + `DataRequestsModule` ([src/data-requests/](src/data-requests/))
- [x] **Supporting** — `AuthEvent` schema + `AuthEventsModule` ([src/auth-events/](src/auth-events/)); AuthService logs login/logout/refresh/register/password_reset/2fa/clerk_login
- [x] **Row 12** — `GET /auth/logs` → [src/auth/auth.controller.ts:341](src/auth/auth.controller.ts#L341)
- [x] **Row 13** — `GET /users/profile` → [src/users/users.controller.ts:38](src/users/users.controller.ts#L38)
- [x] **Row 14** — `PATCH /users/profile` → [src/users/users.controller.ts:45](src/users/users.controller.ts#L45)
- [x] **Row 15** — `GET /users/addresses` → [src/addresses/addresses.controller.ts:25](src/addresses/addresses.controller.ts#L25)
- [x] **Row 16** — `POST /users/addresses` → [src/addresses/addresses.controller.ts:32](src/addresses/addresses.controller.ts#L32)
- [x] **Row 17** — `PATCH /users/addresses/:id` → [src/addresses/addresses.controller.ts:38](src/addresses/addresses.controller.ts#L38)
- [x] **Row 18** — `DELETE /users/addresses/:id` → [src/addresses/addresses.controller.ts:48](src/addresses/addresses.controller.ts#L48)
- [x] **Row 19** — `POST /users/addresses/:id/default` → [src/addresses/addresses.controller.ts:58](src/addresses/addresses.controller.ts#L58)
- [x] **Row 20** — `POST /users/consent/marketing` → [src/users/users.controller.ts:55](src/users/users.controller.ts#L55)
- [x] **Row 21** — `POST /users/data/delete-request` → [src/users/users.controller.ts:69](src/users/users.controller.ts#L69)
- [x] **Row 22** — `GET /users/data/export` → [src/users/users.controller.ts:84](src/users/users.controller.ts#L84)

Also fixed a Phase D regression: `@Query('sort') ProductSortOption` in `SearchController` triggered a Swagger circular-dep at boot. Changed to `@Query('sort') string` with internal enum validation.

Build: ✅ clean (221 files). Boot: ✅ 116 routes mapped, Nest application successfully started.

**Phase C commit message:** `feat(user): add profile, addresses, NDPR consent/data, auth event log`

---

## Phase E — Cart rework with cartId + guest support (≈2 hrs, 9 rows)

### Supporting work
- [ ] Extend `Cart` schema: add `publicCartId: string` (UUID, unique, indexed), `ownerType: 'user'|'guest'`, `guestToken?: string` (hashed), `expiresAt?: Date` (guest carts TTL 30 days), TTL index.
- [ ] Add `CartGuard` (or extend existing) that resolves `:cartId` to a cart and verifies the requester (auth user owns it, OR `x-guest-token` header matches the hashed guestToken).
- [ ] Backwards-compat: keep `/cart`, `/cart/items` aliases that route to the auth user's primary cart.

### Routes
- [ ] **Row 38** — `POST /cart`
  - Public. If auth → return/find user's primary cart. If guest → create cart with new `publicCartId` + plaintext `guestToken` (returned once in response).

- [ ] **Row 39** — `GET /cart/:cartId` — uses CartGuard.

- [ ] **Row 40** — `POST /cart/:cartId/items` — uses CartGuard. Body unchanged from current `addItem`.

- [ ] **Row 41** — `PATCH /cart/:cartId/items/:itemId`

- [ ] **Row 42** — `DELETE /cart/:cartId/items/:itemId`

- [ ] **Row 43** — `DELETE /cart/:cartId` — clear all items (does not delete the cart row).

- [ ] **Row 44** — `POST /cart/:cartId/merge`
  - Auth required. Body: `{ guestToken }`. Moves all items from the guest cart into the user's primary cart, then deletes the guest cart. Validates token before merging.

- [ ] **Row 45** — `GET /cart/:cartId/totals`
  - Returns `{ subtotal, taxAmount, deliveryEstimate, total, currency, pricingLocked: false }`. Use config defaults for tax (7.5% VAT) and delivery (flat) until pricing-rule engine lands.

- [ ] **Row 46** — `POST /cart/:cartId/validate`
  - Iterates items, checks `Product.isActive` and per-variant stock. Returns `{ valid: boolean, issues: [{ itemId, reason }] }`.

**Phase E commit message:** `feat(cart): add cartId-scoped routes with guest support, totals, validate, merge`

---

## Post-build sweep

- [ ] Run `npm run build` — fix any TS errors.
- [ ] Run `npm run lint` — fix any lint issues.
- [ ] Smoke test 5–10 representative routes with `curl` against `localhost:<APP_PORT>`.
- [ ] Update [endpoint-audit.csv](endpoint-audit.csv): flip Status column for every row above to `Present` (with a Partial note for row 4 phone-OTP and row 27 flash-sales data).
- [ ] Report endpoint counts back to PM: target ~38/46 Present, ~5 Partial-justified, 0 Missing.

---

## Known carve-outs (still Partial after this work)

- **Row 4 (phone OTP login):** delivered via email OTP since no SMS provider is wired. Add Termii/Twilio integration later — would not flip this to Present-with-phone.
- **Row 27 (flash-sales):** endpoint is live but the `flash_sale` section tag must be populated on products before it returns data — that's an admin/promo-slot job (Module 27).
- **Row 45 (cart totals):** returns `pricingLocked: false` flag until Module 16 pricing rules ship. Math is approximate.
