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

## Phase B — OTP + login surface (≈1 hr, 6 rows)

Expose existing email-OTP infra (Resend) at `/auth/otp/*` spec paths.

### Supporting work first
- [ ] Add a generic `OtpPurpose` mapping helper to [src/otp/otp.service.ts](src/otp/otp.service.ts) so it can accept a public `purpose` string (`login` / `email_verification` / `password_reset`) and map to internal `OtpType`.
- [ ] Add `loginWithOtp(email)` and `verifyLoginOtp(email, code)` methods to [src/auth/auth.service.ts](src/auth/auth.service.ts) that:
  - On request: issue an OTP via `OtpService` with purpose `LOGIN_2FA` (or new `LOGIN_OTP` enum entry) and email it via Resend.
  - On verify: confirm OTP, find user, issue access + refresh JWTs (same as password login).

### Routes
- [ ] **Row 1** — `POST /auth/otp/request`
  - Body: `{ email: string, purpose?: 'login' | 'verification' | 'password-reset' }`
  - File: [src/auth/auth.controller.ts](src/auth/auth.controller.ts)
  - Calls `authService.requestOtp(email, purpose)`. Rate-limited by global throttler.

- [ ] **Row 2** — `POST /auth/otp/verify`
  - Body: `{ email, code, purpose }`
  - File: same controller
  - For `purpose=login`: returns JWT pair. For `verification`/`password-reset`: returns a single-use token like the existing reset flow.

- [ ] **Row 3** — `POST /auth/otp/resend`
  - Body: `{ email, purpose }`
  - File: same controller
  - 30-second cooldown enforced via OTP `createdAt` check.

- [ ] **Row 4** — `POST /auth/login`
  - Already exists at this path. Update Swagger description to clarify both flows:
    - email + password (current), OR
    - email + OTP (via rows 1+2).
  - Note in audit: phone OTP is email OTP today.

- [ ] **Row 5** — `POST /auth/login/password`
  - File: [src/auth/auth.controller.ts:135](src/auth/auth.controller.ts#L135)
  - Add `@Post('login/password')` as an alias to the existing `login()` handler.

- [ ] **Row 6** — `POST /auth/register`
  - File: [src/auth/auth.controller.ts](src/auth/auth.controller.ts)
  - Add a single-call wrapper that takes `{ email, firstName, lastName, password, confirmPassword, phoneNumber?, dateOfBirth?, termsAccepted }` and runs:
    `registerEmail → registerDetails → registerPassword` in one transaction, returning the `sessionId` so the FE can call `register/verify` next.
  - Multi-step routes stay for the existing wizard.

**Phase B commit message:** `feat(auth): expose OTP request/verify/resend and unified register endpoint`

---

## Phase D — Catalog & storefront (≈1.5 hrs, 10 rows)

Mostly thin endpoints that surface existing product/category data.

- [ ] **Row 24** — `GET /categories/:slug`
  - File: [src/categories/categories.controller.ts:13](src/categories/categories.controller.ts#L13) — add `@Get(':slug')` route → `categoriesService.findBySlug(slug)`.

- [ ] **Row 25** — `GET /categories/:slug/products`
  - File: same controller — add `@Get(':slug/products')` → resolve category, then call `productsService.list({ category: slug, ...query })` with pagination.

- [ ] **Row 26** — `GET /collections/featured`
  - New file: `src/collections/collections.controller.ts` + `collections.module.ts`.
  - Returns products with `sections` containing `featured`. Supports pagination.

- [ ] **Row 27** — `GET /collections/flash-sales`
  - Same controller. Returns products with `sections` containing `flash_sale`. Add `flash_sale` to the known section list in product DTO if missing.

- [ ] **Row 28** — `GET /collections/best-deals`
  - Same controller. `sections` contains `best_deals`. Today this is exposed via `/products?section=best_deals`; this route is a named alias.

- [ ] **Row 30** — `GET /products/:id`
  - File: [src/products/products.controller.ts:36](src/products/products.controller.ts#L36)
  - Today routes are by slug. Change handler to try ObjectId first (24-hex match) then fall back to slug. Or add a separate `@Get('id/:id')` route — recommend the first approach for simpler FE.

- [ ] **Row 31** — `GET /products/:productId/variants`
  - File: [src/products/products.controller.ts](src/products/products.controller.ts) — new route. Returns `product.variants[]` only.

- [ ] **Row 32** — `GET /products/:productId/availability`
  - File: same controller — new route. Returns `{ productInStock, variants: [{ sku, inStock, quantity }] }`.

- [ ] **Row 35** — `GET /search`
  - File: [src/search/search.controller.ts](src/search/search.controller.ts) — add `@Get()` route.
  - Uses existing text index `{ name: 'text', brand: 'text' }`. Supports `q`, `page`, `limit`, `category`, `minPrice`, `maxPrice`.

- [ ] **Row 37** — `GET /brands`
  - New file: `src/brands/brands.controller.ts` + `brands.module.ts` + `brands.service.ts`.
  - `brandsService.list()` runs `productModel.aggregate([{ $group: { _id: '$brand', count: { $sum: 1 } } }, { $match: { _id: { $ne: null } } }, { $sort: { count: -1 } }])`.

**Phase D commit message:** `feat(catalog): add categories/:slug, collections, brands, search, product variants/availability`

---

## Phase C — User profile + addresses + NDPR + auth log (≈2 hrs, 11 rows)

### Supporting work
- [ ] Create `src/addresses/` module with schema, repository, service, controller.
  - `Address` schema: `userId`, `label`, `recipientName`, `phoneNumber`, `street1`, `street2?`, `city`, `state`, `country`, `postalCode?`, `isDefault: boolean`, `deletedAt?`. Indexes on `userId+deletedAt` and `userId+isDefault`.
- [ ] Add `marketingConsentAt?: Date` to `User` schema. (No new module needed.)
- [ ] Create `src/data-requests/` module — schema `{ userId, kind: 'export'|'delete', status: 'pending'|'processed'|'rejected', requestedAt, processedAt?, processedBy? }`.
- [ ] Create `src/auth-events/` module — schema `{ userId, kind: 'login'|'logout'|'refresh'|'2fa_enable'|'2fa_disable'|'password_reset', ip?, userAgent?, succeeded: boolean, createdAt }`. Add insertion calls inside `AuthService` login/logout/refresh paths.

### Routes
- [ ] **Row 12** — `GET /auth/logs`
  - File: [src/auth/auth.controller.ts](src/auth/auth.controller.ts) — new `@Get('logs')` route. Returns paginated auth events for `currentUser`.

- [ ] **Row 13** — `GET /users/profile`
  - File: [src/users/users.controller.ts](src/users/users.controller.ts) — new route. Auth required. Returns own user via `usersService.toPublicUser`.

- [ ] **Row 14** — `PATCH /users/profile`
  - File: same controller. DTO: firstName/lastName/dateOfBirth/phoneNumber only. No email/password changes here.

- [ ] **Row 15** — `GET /users/addresses` — list own addresses.
- [ ] **Row 16** — `POST /users/addresses` — create. If first address, mark default.
- [ ] **Row 17** — `PATCH /users/addresses/:id` — update.
- [ ] **Row 18** — `DELETE /users/addresses/:id` — soft delete.
- [ ] **Row 19** — `POST /users/addresses/:id/default` — set default (clears others).

- [ ] **Row 20** — `POST /users/consent/marketing`
  - Body: `{ optIn: boolean }`. Sets/clears `marketingConsentAt` on user.

- [ ] **Row 21** — `POST /users/data/delete-request`
  - Creates a `DataRequest{ kind: 'delete' }`. Admin processes async (Module 21 endpoint, not built today).

- [ ] **Row 22** — `GET /users/data/export`
  - Aggregates user + addresses + cart (+ orders when module exists later). Returns JSON dump.

**Phase C commit message:** `feat(user): add profile, addresses, NDPR consent/data endpoints, auth event log`

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
