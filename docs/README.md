# Cadna Mart Backend — FE Integration Guide

This is the entry point for anyone wiring a client (web FE, mobile, Postman collection) against the Cadna Mart API.

## TL;DR

| What | Where |
|---|---|
| Live Swagger UI (interactive docs) | `<base>/api/v1/docs` |
| Live OpenAPI 3.0 JSON | `<base>/api/v1/openapi.json` |
| Static OpenAPI 3.0 JSON in repo | [docs/openapi.json](openapi.json) |
| Endpoint status spreadsheet | [docs/endpoint-audit.csv](endpoint-audit.csv) |
| Implementation tracker | [docs/endpoint-implementation-checklist.md](endpoint-implementation-checklist.md) |
| Production deployment | https://cadna-mart-be-nsz2.onrender.com |
| Local dev | http://localhost:3000 (default APP_PORT) |

## API base URL

Every endpoint lives under `/api/v1/...`. Examples:
- `https://cadna-mart-be-nsz2.onrender.com/api/v1/products`
- `http://localhost:3000/api/v1/auth/login`

## Importing into Postman / Bruno

1. Pull the latest `dev` branch.
2. In Postman: **File → Import →** drop in [`docs/openapi.json`](openapi.json).
3. It will scaffold a collection grouped by tag (Auth, Cart, Products, etc.), with example requests pre-filled.
4. In Postman, switch the **Server** variable to `https://cadna-mart-be-nsz2.onrender.com` for prod or `http://localhost:3000` for local.

If you change branch and pull endpoint changes:
```bash
npm run swagger:export   # rewrites docs/openapi.json from the current code
```
Then re-import.

## Authentication model

The API supports **three** ways to authenticate a user:

| Mechanism | When | How to send |
|---|---|---|
| **Bearer JWT** | After `/auth/login` or `/auth/otp/verify` (purpose=login) or `/auth/clerk/login` | `Authorization: Bearer <accessToken>` |
| **Clerk OAuth** | Social login (Google / Facebook) via Clerk widget | FE calls Clerk SDK → posts Clerk session token to `POST /auth/clerk/login` → gets JWT pair |
| **Guest token** | Unauthenticated cart usage (browsing buyer) | `x-guest-token: <token>` (cart endpoints only) |

Tokens returned by login/refresh/OTP-verify look like:
```json
{ "accessToken": "...", "refreshToken": "...", "expiresIn": "15m" }
```
- `accessToken` — short-lived; attach to every authenticated call.
- `refreshToken` — store securely. When access expires call `POST /auth/refresh`.

### Email OTP login (passwordless)
```
POST /auth/otp/request   { "email": "...", "purpose": "login" }
POST /auth/otp/verify    { "email": "...", "code": "123456", "purpose": "login" }
  ↳ returns { purpose: "login", tokens, user }
```
> **Note on phone vs email:** the PM spec says "phone OTP". We currently deliver OTP codes via **email (Resend)** because no SMS provider is wired. The endpoint paths still match the spec; only the delivery channel differs. Switching to SMS is a follow-up.

## Response envelope

Every successful response is wrapped by the global interceptor:
```json
{
  "success": true,
  "statusCode": 200,
  "data": { ... },          // the payload documented in Swagger
  "message": "...",
  "meta": { "correlationId": "...", "timestamp": "..." }
}
```
**The schema shown in Swagger is the `data` field only.** Unwrap `response.data` on the client.

## Error envelope

Errors come from the global exception filter:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errorCode": "BAD_REQUEST",
  "path": "/api/v1/...",
  "correlationId": "..."
}
```
Always log `correlationId` — it lets backend trace the request in Winston logs.

## Guest cart flow (important — non-obvious)

The cart supports both authenticated users and guest checkout. The flow:

```
# 1. Guest visits site, creates cart
POST /api/v1/cart
  → { cartId: "uuid", ownerType: "guest", guestToken: "abc123..." }

# 2. Store guestToken in cookie / localStorage. Send it on every cart call:
GET    /api/v1/cart/{cartId}                 with header `x-guest-token: abc123...`
POST   /api/v1/cart/{cartId}/items
PATCH  /api/v1/cart/{cartId}/items/{itemId}
DELETE /api/v1/cart/{cartId}/items/{itemId}
DELETE /api/v1/cart/{cartId}                 (clears items, keeps cart record)
GET    /api/v1/cart/{cartId}/totals
POST   /api/v1/cart/{cartId}/validate

# 3. Guest signs up / logs in. Merge their guest cart into their user cart:
POST /api/v1/cart/{guestCartId}/merge        Authorization: Bearer <jwt>
                                              body: { "guestToken": "abc123..." }
  ↳ items moved into user's primary cart; guest cart deleted
```

Auth users can also call all `/cart/{cartId}/*` endpoints with their primary cart's id — no `x-guest-token` needed; the Bearer JWT proves ownership.

For backwards-compat, the legacy auth-only routes still work:
- `GET /cart`, `POST /cart/items`, `PATCH /cart/items/{itemId}`, `DELETE /cart/items/{itemId}`.

## Pricing caveat (cart totals)

`GET /cart/{cartId}/totals` currently returns:
```json
{ "subtotal": ..., "taxAmount": ..., "taxRate": 0.075, "deliveryEstimate": ..., "grandTotal": ..., "pricingLocked": false }
```
**`pricingLocked: false`** — these are placeholder values (7.5% VAT, flat delivery). The pricing-rule engine (Module 16 in the PM spec) is not implemented yet. Don't display the total as "final" on the checkout review screen until `pricingLocked: true` is returned by the API.

## Common flows — quick reference

### Sign up → verify → log in

```
POST /api/v1/auth/register             { email, firstName, lastName, password, confirmPassword, termsAccepted: true }
POST /api/v1/auth/otp/verify           { email, code: "123456", purpose: "email_verification" }
POST /api/v1/auth/login                { email, password }
```

### Browse catalogue

```
GET /api/v1/categories                 list categories (tree or flat)
GET /api/v1/categories/{slug}          single category
GET /api/v1/categories/{slug}/products products in a category
GET /api/v1/products?q=tv&limit=20     full search + filters
GET /api/v1/products/{idOrSlug}        product detail
GET /api/v1/products/{id}/variants     variant axes + options
GET /api/v1/products/{id}/availability stock summary
GET /api/v1/products/{id}/related      related items
GET /api/v1/products/{id}/reviews      product reviews
GET /api/v1/collections/best-deals     curated rail
GET /api/v1/collections/flash-sales    curated rail
GET /api/v1/collections/featured       curated rail
GET /api/v1/brands                     distinct brands + counts
GET /api/v1/search?q=tv                full search alias
GET /api/v1/search/suggestions?q=tv    autocomplete
```

### Profile + addresses (auth required)

```
GET    /api/v1/auth/me                  current user
PATCH  /api/v1/users/profile            update profile
GET    /api/v1/users/addresses          list
POST   /api/v1/users/addresses          create (first address auto-default)
PATCH  /api/v1/users/addresses/{id}     update
DELETE /api/v1/users/addresses/{id}     soft-delete
POST   /api/v1/users/addresses/{id}/default   set default
POST   /api/v1/users/consent/marketing  NDPR marketing toggle
GET    /api/v1/users/data/export        NDPR data export
POST   /api/v1/users/data/delete-request NDPR right-to-be-forgotten
GET    /api/v1/auth/logs                user's auth event log
```

## What is NOT yet built

See [docs/endpoint-audit.csv](endpoint-audit.csv) for the full picture. Highlights for FE:
- **Checkout** module (rows 47–54) — no `/checkout/session` flow yet.
- **Orders** module — no order create/list/track endpoints.
- **Returns & Refunds** — not implemented.
- **Stripe**, **Wallet**, **Pay-on-Delivery** — not implemented.
- **Real SMS** — OTP is email-only today.

These won't appear in Swagger because they don't exist yet. The FE should integrate Phases A–E first (rows 1–46), then we ship the missing modules in subsequent passes.

## Getting help

- Backend issues / questions: **cadnamart@gmail.com**
- Repo: this directory (branch `dev` is the integration target).
- Swagger UI shows live endpoints — try requests directly from the browser using **Authorize** button (top right) to paste a JWT.
