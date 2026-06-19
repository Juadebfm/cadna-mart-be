# Cadna Mart — Backend API Handoff

> **Version:** 1.0 · **Generated:** 2025-01-15 · **Environment:** Production + Local

This document is the single source of truth for the Cadna Mart REST API.
Import `docs/cadna-mart.postman_collection.json` into Postman to get all endpoints
pre-loaded with sample request bodies and response examples.

---

## 1. Base URLs

| Environment | Base URL |
|---|---|
| **Production** | `https://cadna-mart-be-nsz2.onrender.com/api/v1` |
| **Local dev** | `http://localhost:3000/api/v1` |

> All paths in this document are **relative to the base URL**.
> Example: `POST /auth/login` → `POST https://cadna-mart-be-nsz2.onrender.com/api/v1/auth/login`

---

## 2. Authentication

The API uses **JWT Bearer tokens**. Every protected endpoint requires:

```
Authorization: Bearer <accessToken>
```

### Token lifecycle

| Token | Expiry | How to get |
|---|---|---|
| `accessToken` | **15 minutes** | `POST /auth/login` or `POST /auth/otp/verify` |
| `refreshToken` | **7 days** | Same response as `accessToken` |

### Refreshing a token

When the `accessToken` expires you will receive a `401 Unauthorized`. Call:

```
POST /auth/refresh
Content-Type: application/json

{ "refreshToken": "<your refreshToken>" }
```

You receive a new `accessToken` + `refreshToken` pair. Update both in storage.

### Guest users (cart)

Unauthenticated users can still use the cart. `POST /cart` returns a `guestToken`.
Send it on every subsequent cart request as:

```
x-guest-token: <guestToken>
```

When the user logs in, call `POST /cart/{cartId}/merge` to merge the guest cart.

---

## 3. Response Envelope

Every response — success or error — is wrapped in a consistent envelope.

### Success

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "...": "— the actual payload described per endpoint below"
  },
  "message": "Request successful",
  "meta": {
    "correlationId": "req-550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2025-01-15T10:00:00.000Z"
  }
}
```

### Error

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errorCode": "BAD_REQUEST",
  "path": "/auth/login",
  "correlationId": "req-550e8400-e29b-41d4-a716-446655440000"
}
```

### Common HTTP status codes

| Code | Meaning |
|---|---|
| `200` | OK |
| `201` | Created |
| `400` | Validation error — check `message` for field details |
| `401` | Missing or expired token — refresh or re-login |
| `403` | Authenticated but not allowed (wrong account type) |
| `404` | Resource not found |
| `409` | Conflict (duplicate email, already exists, etc.) |
| `422` | Business rule violation (insufficient balance, out of stock, etc.) |
| `429` | Rate limited |
| `500` | Internal server error — report with `correlationId` |

---

## 4. Money & Amounts

All monetary values are in **Kobo** (Nigerian smallest unit, 1 NGN = 100 Kobo).

| Field name pattern | Value | Display as |
|---|---|---|
| `priceKobo: 120000000` | 120,000,000 kobo | ₦1,200,000.00 |
| `deliveryFeeKobo: 150000` | 150,000 kobo | ₦1,500.00 |
| `balanceKobo: 500000` | 500,000 kobo | ₦5,000.00 |

```js
// Convert for display
const naira = koboAmount / 100;
const formatted = '₦' + naira.toLocaleString('en-NG', { minimumFractionDigits: 2 });
```

---

## 5. Pagination

List endpoints accept `page` (default `1`) and `limit` (default `20`) query params.
The `data` payload for paginated responses looks like:

```json
{
  "items": [
    "..."
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 142,
    "totalPages": 8
  }
}
```

---

## 6. Endpoints

### 🔐 Authentication

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register/email` | 🔒 Bearer JWT | Step 1: Start registration with email |
| `POST` | `/auth/register/details` | 🔒 Bearer JWT | Step 2: Provide personal details |
| `POST` | `/auth/register/password` | 🔒 Bearer JWT | Step 3: Set password and create account |
| `POST` | `/auth/register/verify` | 🔒 Bearer JWT | Step 4: Verify email with OTP code |
| `POST` | `/auth/register/resend-otp` | 🔒 Bearer JWT | Resend email verification OTP |
| `POST` | `/auth/register/seller/email` | 🔒 Bearer JWT | Seller Step 1: Start registration with email |
| `POST` | `/auth/register/seller/profile` | 🔒 Bearer JWT | Seller Step 2: Provide personal + business details. Bank info is collected separately via POST /sellers/me/banking after login - do not send it here. |
| `POST` | `/auth/register/seller/password` | 🔒 Bearer JWT | Seller Step 3: Set password and create account. Bank info is collected separately via POST /sellers/me/banking after login. |
| `POST` | `/auth/register/seller/verify` | 🔒 Bearer JWT | Seller Step 4: Verify email with OTP code |
| `POST` | `/auth/register` | 🔒 Bearer JWT | Single-call registration (orchestrates email + details + password steps) |
| `POST` | `/auth/otp/request` | 🔒 Bearer JWT | Send OTP via email for login/email-verification/password-reset |
| `POST` | `/auth/otp/verify` | 🔒 Bearer JWT | Verify OTP code. Returns JWTs for login, message for verification, resetToken for password-reset |
| `POST` | `/auth/otp/resend` | 🔒 Bearer JWT | Resend OTP (cooldown enforced) |
| `POST` | `/auth/clerk/login` | 🔒 Bearer JWT | Login or register via Clerk OAuth (Google/Facebook) |
| `POST` | `/auth/login` | 🔒 Bearer JWT | Login with email and password. For passwordless email-OTP login, use /auth/otp/request then /auth/otp/verify. |
| `POST` | `/auth/login/password` | 🔒 Bearer JWT | Login with email and password (spec alias of /login) |
| `POST` | `/auth/login/verify-2fa` | 🔒 Bearer JWT | Verify 2FA code during login |
| `POST` | `/auth/forgot-password` | 🔒 Bearer JWT | Request password reset OTP |
| `POST` | `/auth/password/reset/request` | 🔒 Bearer JWT | Request password reset OTP (spec alias of /forgot-password) |
| `POST` | `/auth/forgot-password/verify` | 🔒 Bearer JWT | Verify password reset OTP |
| `POST` | `/auth/forgot-password/reset` | 🔒 Bearer JWT | Reset password with reset token |
| `POST` | `/auth/password/reset/confirm` | 🔒 Bearer JWT | Confirm password reset with token (spec alias of /forgot-password/reset) |
| `POST` | `/auth/2fa/enable` | 🔒 Bearer JWT | Initiate 2FA enable (sends OTP) |
| `POST` | `/auth/2fa/confirm` | 🔒 Bearer JWT | Confirm 2FA enable with OTP |
| `POST` | `/auth/2fa/disable` | 🔒 Bearer JWT | Disable 2FA with OTP verification |
| `POST` | `/auth/refresh` | 🔒 Bearer JWT | Refresh access token |
| `GET` | `/auth/profile` | 🔒 Bearer JWT | Get current user profile |
| `GET` | `/auth/me` | 🔒 Bearer JWT | Get current user (spec alias of /profile) |
| `GET` | `/auth/logs` | 🔒 Bearer JWT | List auth events for the current user (audit log) |
| `POST` | `/auth/logout` | 🔒 Bearer JWT | Logout and invalidate tokens |

#### `POST /auth/register/email`

**Step 1: Start registration with email**

**Auth:** Bearer JWT required

**Request body:**

```json
{
  "email": "john.doe@example.com"
}
```

**Success response `201`:**

```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "sessionId": "sess_01J2K3L4M5N6P7Q8R9S0T1U2V3"
  },
  "message": "Request successful",
  "meta": {
    "correlationId": "req-00000000-0000-0000-0000-000000000000",
    "timestamp": "2025-01-15T10:00:00.000Z"
  }
}
```

#### `POST /auth/register/details`

**Step 2: Provide personal details**

**Auth:** Bearer JWT required

**Request body:**

```json
{
  "sessionId": "session-uuid-here",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-15",
  "phoneNumber": "+2348012345678",
  "termsAccepted": true
}
```

**Success response `201`:**

```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "sessionId": "sess_01J2K3L4M5N6P7Q8R9S0T1U2V3"
  },
  "message": "Request successful",
  "meta": {
    "correlationId": "req-00000000-0000-0000-0000-000000000000",
    "timestamp": "2025-01-15T10:00:00.000Z"
  }
}
```

#### `POST /auth/register/password`

**Step 3: Set password and create account**

**Auth:** Bearer JWT required

**Request body:**

```json
{
  "sessionId": "session-uuid-here",
  "password": "StrongP@ssw0rd1",
  "confirmPassword": "StrongP@ssw0rd1"
}
```

**Success response `201`:**

```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "message": "Account created. Please verify your email."
  },
  "message": "Request successful",
  "meta": {
    "correlationId": "req-00000000-0000-0000-0000-000000000000",
    "timestamp": "2025-01-15T10:00:00.000Z"
  }
}
```

#### `POST /auth/register/verify`

**Step 4: Verify email with OTP code**

**Auth:** Bearer JWT required

**Request body:**

```json
{
  "email": "john.doe@example.com",
  "code": "123456"
}
```

**Success response `200`:**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "message": "Email verified successfully"
  },
  "message": "Request successful",
  "meta": {
    "correlationId": "req-00000000-0000-0000-0000-000000000000",
    "timestamp": "2025-01-15T10:00:00.000Z"
  }
}
```

#### `POST /auth/login`

**Login with email and password. For passwordless email-OTP login, use /auth/otp/request then /auth/otp/verify.**

**Auth:** Bearer JWT required

**Request body:**

```json
{
  "email": "john.doe@example.com",
  "password": "StrongP@ssw0rd"
}
```

**Success response `200`:**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.<payload>.<sig>",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.<payload>.<sig>",
    "expiresIn": "15m",
    "user": {
      "id": "64a1f2e3b4c5d6e7f8a9b0c1",
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "user@example.com",
      "accountType": "BUYER",
      "isVerified": true,
      "isTwoFactorEnabled": false
    }
  },
  "message": "Request successful",
  "meta": {
    "correlationId": "req-00000000-0000-0000-0000-000000000000",
    "timestamp": "2025-01-15T10:00:00.000Z"
  }
}
```

#### `POST /auth/forgot-password`

**Request password reset OTP**

**Auth:** Bearer JWT required

**Request body:**

```json
{
  "email": "john.doe@example.com"
}
```

**Success response `200`:**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "message": "If an account exists, a reset code has been sent"
  },
  "message": "Request successful",
  "meta": {
    "correlationId": "req-00000000-0000-0000-0000-000000000000",
    "timestamp": "2025-01-15T10:00:00.000Z"
  }
}
```

#### `POST /auth/forgot-password/reset`

**Reset password with reset token**

**Auth:** Bearer JWT required

**Request body:**

```json
{
  "resetToken": "jwt-reset-token-here",
  "password": "NewStr0ngP@ss!",
  "confirmPassword": "NewStr0ngP@ss!"
}
```

**Success response `200`:**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "message": "Password reset successfully"
  },
  "message": "Request successful",
  "meta": {
    "correlationId": "req-00000000-0000-0000-0000-000000000000",
    "timestamp": "2025-01-15T10:00:00.000Z"
  }
}
```

#### `POST /auth/refresh`

**Refresh access token**

**Auth:** Bearer JWT required

**Request body:**

```json
{
  "refreshToken": "sample-token"
}
```

**Success response `200`:**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.<payload>.<sig>",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.<payload>.<sig>",
    "expiresIn": "15m"
  },
  "message": "Request successful",
  "meta": {
    "correlationId": "req-00000000-0000-0000-0000-000000000000",
    "timestamp": "2025-01-15T10:00:00.000Z"
  }
}
```

#### `POST /auth/logout`

**Logout and invalidate tokens**

**Auth:** Bearer JWT required

**Success response `200`:**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "message": "Logged out successfully"
  },
  "message": "Request successful",
  "meta": {
    "correlationId": "req-00000000-0000-0000-0000-000000000000",
    "timestamp": "2025-01-15T10:00:00.000Z"
  }
}
```

### 👤 Users

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/users/profile` | 🔒 Bearer JWT | Get the current user profile |
| `PATCH` | `/users/profile` | 🔒 Bearer JWT | Update the current user profile |
| `POST` | `/users/consent/marketing` | 🔒 Bearer JWT | Set marketing consent (NDPR) |
| `POST` | `/users/data/delete-request` | 🔒 Bearer JWT | Submit right-to-be-forgotten request (NDPR) |
| `GET` | `/users/data/export` | 🔒 Bearer JWT | Export the current user data (NDPR) |
| `GET` | `/users/addresses` | 🔒 Bearer JWT | List current user addresses |
| `POST` | `/users/addresses` | 🔒 Bearer JWT | Add a new address |
| `PATCH` | `/users/addresses/{id}` | 🔒 Bearer JWT | Update an address |
| `DELETE` | `/users/addresses/{id}` | 🔒 Bearer JWT | Delete an address (soft delete) |
| `POST` | `/users/addresses/{id}/default` | 🔒 Bearer JWT | Set an address as default |

### 🛍️ Catalogue

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/categories` | 🔒 Bearer JWT | Get categories (flat or tree) |
| `GET` | `/categories/{slug}` | 🔒 Bearer JWT | Get a single category by slug |
| `GET` | `/products` | 🔒 Bearer JWT | List products with search, filter, and pagination |
| `POST` | `/products` | 🔒 Bearer JWT | Create a product (Seller or Admin) |
| `GET` | `/products/{idOrSlug}` | 🔒 Bearer JWT | Get product detail by Mongo id or slug |
| `GET` | `/products/{productId}/related` | 🔒 Bearer JWT | Get related products |
| `GET` | `/products/{productId}/variants` | 🔒 Bearer JWT | Get product variants and axes |
| `GET` | `/products/{productId}/availability` | 🔒 Bearer JWT | Get product/variant stock availability |
| `GET` | `/products/{productId}/policies` | 🔒 Bearer JWT | Get product return and warranty policies |
| `PATCH` | `/products/{id}` | 🔒 Bearer JWT | Update a product (owner Seller or Admin) |
| `DELETE` | `/products/{id}` | 🔒 Bearer JWT | Delete a product (owner Seller or Admin) |
| `GET` | `/categories/{slug}/products` | 🔒 Bearer JWT | List products in a category by slug (paginated) |
| `GET` | `/policies/products/{productId}` | 🔒 Bearer JWT | Get product return and warranty policies |
| `GET` | `/products/{productId}/reviews` | 🔒 Bearer JWT | Get product reviews with summary |
| `POST` | `/products/{productId}/reviews` | 🔒 Bearer JWT | Write a review for a product (one per user per product) |
| `POST` | `/products/{productId}/reviews/{reviewId}/helpful` | 🔒 Bearer JWT | Mark a review as helpful (no auth required) |
| `PATCH` | `/reviews/{id}` | 🔒 Bearer JWT | Edit your own review |
| `DELETE` | `/reviews/{id}` | 🔒 Bearer JWT | Delete your own review |
| `GET` | `/home` | 🔒 Bearer JWT | Get composite homepage payload |
| `GET` | `/shipping/estimate` | 🔒 Bearer JWT | Get shipping estimate |
| `GET` | `/search` | 🔒 Bearer JWT | Global product search with filters and pagination |
| `GET` | `/search/suggest` | 🔒 Bearer JWT | Search suggestions/autocomplete |
| `GET` | `/search/suggestions` | 🔒 Bearer JWT | Search suggestions/autocomplete (spec alias of /suggest) |
| `GET` | `/collections/featured` | 🔒 Bearer JWT | Featured collection (products tagged sections=featured) |
| `GET` | `/collections/flash-sales` | 🔒 Bearer JWT | Flash sales collection (products tagged sections=flash_sale) |
| `GET` | `/collections/best-deals` | 🔒 Bearer JWT | Best deals collection (products tagged sections=best_deals) |
| `GET` | `/brands` | 🔒 Bearer JWT | List brands with product counts |

#### `GET /products`

**List products with search, filter, and pagination**

**Auth:** Bearer JWT required

**Query parameters:**

| Param | Required | Default | Description |
|---|---|---|---|
| `q` | — | — | Search query |
| `section` | — | — | Section filter (best_deals, recommended, top_sellers, new_arrivals) |
| `category` | — | — | Category slug |
| `subCategory` | — | — | Sub-category slug |
| `brand` | — | — | Single brand name (one brand filter at a time) |
| `minPrice` | — | — | Minimum price |
| `maxPrice` | — | — | Maximum price |
| `inStock` | — | — | In stock only |
| `ratingGte` | — | — | Minimum rating |
| `sort` | — | `relevance` |  |
| `page` | — | `1` |  |
| `limit` | — | `10` |  |

**Success response `200`:**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "items": [
      {
        "id": "64a1f2e3b4c5d6e7f8a9b0c1",
        "name": "iPhone 15 Pro Max",
        "slug": "iphone-15-pro-max",
        "priceKobo": 120000000,
        "discountedPriceKobo": 115000000,
        "imageUrl": "https://cdn.cadnamart.com/products/iphone-15.jpg",
        "rating": 4.8,
        "reviewCount": 234,
        "inStock": true,
        "seller": {
          "id": "64a1f2e3b4c5d6e7f8a9b0c3",
          "name": "TechStore NG",
          "slug": "techstore-ng"
        }
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "totalItems": 142,
      "totalPages": 8
    }
  },
  "message": "Request successful",
  "meta": {
    "correlationId": "req-00000000-0000-0000-0000-000000000000",
    "timestamp": "2025-01-15T10:00:00.000Z"
  }
}
```

#### `GET /products/{idOrSlug}`

**Get product detail by Mongo id or slug**

**Auth:** Bearer JWT required

**Path parameters:**

| Param | Description |
|---|---|
| `idOrSlug` |  |

**Query parameters:**

| Param | Required | Default | Description |
|---|---|---|---|
| `variantId` | ✅ | — |  |

**Success response `200`:**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "id": "64a1f2e3b4c5d6e7f8a9b0c1",
    "name": "iPhone 15 Pro Max",
    "slug": "iphone-15-pro-max",
    "description": "Latest Apple flagship with titanium frame.",
    "priceKobo": 120000000,
    "discountedPriceKobo": 115000000,
    "images": [
      "https://cdn.cadnamart.com/products/iphone-15.jpg"
    ],
    "rating": 4.8,
    "reviewCount": 234,
    "inStock": true,
    "variants": [
      {
        "id": "64a1f2e3b4c5d6e7f8a9b0c4",
        "name": "256GB Natural Titanium",
        "priceKobo": 120000000,
        "inStock": true
      },
      {
        "id": "64a1f2e3b4c5d6e7f8a9b0c5",
        "name": "512GB Black Titanium",
        "priceKobo": 135000000,
        "inStock": true
      }
    ],
    "seller": {
      "id": "64a1f2e3b4c5d6e7f8a9b0c3",
      "name": "TechStore NG",
      "slug": "techstore-ng"
    },
    "returnPolicy": {
      "windowDays": 7,
      "conditions": "Unopened original packaging"
    }
  },
  "message": "Request successful",
  "meta": {
    "correlationId": "req-00000000-0000-0000-0000-000000000000",
    "timestamp": "2025-01-15T10:00:00.000Z"
  }
}
```

### 🛒 Commerce

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/payments/paystack/initialize` | 🔒 Bearer JWT |  |
| `GET` | `/payments/paystack/verify/{reference}` | 🔒 Bearer JWT |  |
| `POST` | `/payments/paystack/charge/authorize` | 🔒 Bearer JWT |  |
| `POST` | `/payments/paystack/transfer/initialize` | 🔒 Bearer JWT |  |
| `GET` | `/payments/paystack/transfer/status/{ref}` | 🔒 Bearer JWT |  |
| `POST` | `/payments/paystack/refund` | 🔒 Bearer JWT |  |
| `POST` | `/payments/stripe/payment-intent` | 🔒 Bearer JWT |  |
| `POST` | `/payments/stripe/payment-intent/{id}/confirm` | 🔒 Bearer JWT |  |
| `POST` | `/payments/stripe/setup-intent` | 🔒 Bearer JWT |  |
| `POST` | `/payments/stripe/refund` | 🔒 Bearer JWT |  |
| `GET` | `/payments/stripe/payment-methods` | 🔒 Bearer JWT |  |
| `DELETE` | `/payments/stripe/payment-methods/{id}` | 🔒 Bearer JWT |  |
| `GET` | `/payments/pod/eligibility` | 🔒 Bearer JWT |  |
| `POST` | `/payments/pod/confirm` | 🔒 Bearer JWT |  |
| `POST` | `/orders` | 🔒 Bearer JWT |  |
| `GET` | `/orders` | 🔒 Bearer JWT |  |
| `GET` | `/orders/guest/lookup` | 🔒 Bearer JWT |  |
| `GET` | `/orders/{id}` | 🔒 Bearer JWT |  |
| `GET` | `/orders/{id}/timeline` | 🔒 Bearer JWT |  |
| `GET` | `/orders/{id}/tracking` | 🔒 Bearer JWT |  |
| `GET` | `/orders/{id}/invoice` | 🔒 Bearer JWT |  |
| `GET` | `/orders/{id}/pod` | 🔒 Bearer JWT |  |
| `POST` | `/orders/{id}/cancel` | 🔒 Bearer JWT |  |
| `POST` | `/cart` | 🔒 Bearer JWT | Create or return current cart (auth users get their primary cart; guests get a new one) |
| `GET` | `/cart` | 🔒 Bearer JWT | Get current user's primary cart (legacy) |
| `GET` | `/cart/{cartId}` | 🔒 Bearer JWT | Retrieve cart by public cartId |
| `DELETE` | `/cart/{cartId}` | 🔒 Bearer JWT | Clear all items in a cart (keeps the cart record) |
| `POST` | `/cart/{cartId}/items` | 🔒 Bearer JWT | Add an item to a cart |
| `PATCH` | `/cart/{cartId}/items/{itemId}` | 🔒 Bearer JWT | Update quantity of an item in a cart |
| `DELETE` | `/cart/{cartId}/items/{itemId}` | 🔒 Bearer JWT | Remove an item from a cart |
| `POST` | `/cart/{cartId}/merge` | 🔒 Bearer JWT | Merge a guest cart into the authenticated user cart |
| `GET` | `/cart/{cartId}/totals` | 🔒 Bearer JWT | Get totals breakdown for a cart (pricing not yet locked) |
| `POST` | `/cart/{cartId}/validate` | 🔒 Bearer JWT | Validate cart items (stock + active checks) |
| `POST` | `/cart/items` | 🔒 Bearer JWT | Add item to current user's primary cart (legacy) |
| `PATCH` | `/cart/items/{itemId}` | 🔒 Bearer JWT | Update cart item quantity (legacy) |
| `DELETE` | `/cart/items/{itemId}` | 🔒 Bearer JWT | Remove item from cart (legacy) |
| `GET` | `/wishlist` | 🔒 Bearer JWT | Get wishlist items |
| `POST` | `/wishlist/{productId}` | 🔒 Bearer JWT | Add to wishlist |
| `DELETE` | `/wishlist/{productId}` | 🔒 Bearer JWT | Remove from wishlist |
| `POST` | `/checkout/session` | 🔒 Bearer JWT |  |
| `GET` | `/checkout/{sessionId}` | 🔒 Bearer JWT |  |
| `POST` | `/checkout/{sessionId}/address` | 🔒 Bearer JWT |  |
| `POST` | `/checkout/{sessionId}/address/validate` | 🔒 Bearer JWT |  |
| `GET` | `/checkout/{sessionId}/delivery-options` | 🔒 Bearer JWT |  |
| `POST` | `/checkout/{sessionId}/delivery` | 🔒 Bearer JWT |  |
| `POST` | `/checkout/{sessionId}/pickup-details` | 🔒 Bearer JWT |  |
| `GET` | `/checkout/{sessionId}/summary` | 🔒 Bearer JWT |  |
| `POST` | `/checkout/{sessionId}/confirm` | 🔒 Bearer JWT |  |
| `GET` | `/wallet` | 🔒 Bearer JWT |  |
| `GET` | `/wallet/transactions` | 🔒 Bearer JWT |  |
| `POST` | `/wallet/topup/initialize` | 🔒 Bearer JWT |  |
| `POST` | `/wallet/debit` | 🔒 Bearer JWT |  |
| `POST` | `/wallet/credit` | 🔒 Bearer JWT |  |
| `POST` | `/wallet/transfer` | 🔒 Bearer JWT |  |
| `GET` | `/wallet/holds` | 🔒 Bearer JWT |  |

#### `GET /orders`

**Auth:** Bearer JWT required

**Query parameters:**

| Param | Required | Default | Description |
|---|---|---|---|
| `status` | — | — |  |
| `page` | — | `1` |  |
| `limit` | — | `20` |  |

**Success response `200`:**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "items": [
      {
        "id": "64a1f2e3b4c5d6e7f8a9b0e1",
        "orderRef": "CM-20250115-A1B2C3",
        "status": "delivered",
        "paymentStatus": "paid",
        "totalKobo": 120200000,
        "itemCount": 1,
        "createdAt": "2025-01-15T10:00:00.000Z"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "totalItems": 5,
      "totalPages": 1
    }
  },
  "message": "Request successful",
  "meta": {
    "correlationId": "req-00000000-0000-0000-0000-000000000000",
    "timestamp": "2025-01-15T10:00:00.000Z"
  }
}
```

#### `GET /orders/{id}`

**Auth:** Bearer JWT required

**Path parameters:**

| Param | Description |
|---|---|
| `id` |  |

**Success response `200`:**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "id": "64a1f2e3b4c5d6e7f8a9b0e1",
    "orderRef": "CM-20250115-A1B2C3",
    "items": [
      {
        "productId": "64a1f2e3b4c5d6e7f8a9b0c1",
        "name": "iPhone 15 Pro Max — 256GB Natural Titanium",
        "quantity": 1,
        "unitPriceKobo": 120000000,
        "subtotalKobo": 120000000
      }
    ],
    "deliveryAddress": {
      "fullName": "Jane Doe",
      "street": "12 Marina Road",
      "city": "Lagos",
      "state": "Lagos"
    },
    "pricing": {
      "subtotalKobo": 120000000,
      "deliveryFeeKobo": 150000,
      "totalKobo": 120200000
    },
    "status": "delivered",
    "paymentStatus": "paid",
    "timeline": [
      {
        "status": "pending_payment",
        "timestamp": "2025-01-15T10:00:00.000Z"
      },
      {
        "status": "paid",
        "timestamp": "2025-01-15T10:05:00.000Z"
      },
      {
        "status": "delivered",
        "timestamp": "2025-01-16T14:30:00.000Z"
      }
    ],
    "createdAt": "2025-01-15T10:00:00.000Z"
  },
  "message": "Request successful",
  "meta": {
    "correlationId": "req-00000000-0000-0000-0000-000000000000",
    "timestamp": "2025-01-15T10:00:00.000Z"
  }
}
```

#### `POST /cart`

**Create or return current cart (auth users get their primary cart; guests get a new one)**

**Auth:** Bearer JWT required

**Success response `201`:**

```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "id": "64a1f2e3b4c5d6e7f8a9b0d1",
    "guestToken": "guest_01J2K3L4M5N6P7Q8R9S0T1U2V3"
  },
  "message": "Request successful",
  "meta": {
    "correlationId": "req-00000000-0000-0000-0000-000000000000",
    "timestamp": "2025-01-15T10:00:00.000Z"
  }
}
```

> **Note:** `guestToken` is only present for unauthenticated users. Store it in localStorage and send it as `x-guest-token` on every subsequent cart request.

#### `GET /cart/{cartId}`

**Retrieve cart by public cartId**

**Auth:** Bearer JWT required

**Path parameters:**

| Param | Description |
|---|---|
| `cartId` |  |

**Success response `200`:**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "id": "64a1f2e3b4c5d6e7f8a9b0d1",
    "items": [
      {
        "id": "64a1f2e3b4c5d6e7f8a9b0d2",
        "productId": "64a1f2e3b4c5d6e7f8a9b0c1",
        "variantId": "64a1f2e3b4c5d6e7f8a9b0c4",
        "name": "iPhone 15 Pro Max — 256GB Natural Titanium",
        "imageUrl": "https://cdn.cadnamart.com/products/iphone-15.jpg",
        "priceKobo": 120000000,
        "quantity": 1,
        "subtotalKobo": 120000000,
        "inStock": true
      }
    ],
    "itemCount": 1,
    "subtotalKobo": 120000000
  },
  "message": "Request successful",
  "meta": {
    "correlationId": "req-00000000-0000-0000-0000-000000000000",
    "timestamp": "2025-01-15T10:00:00.000Z"
  }
}
```

#### `GET /cart/{cartId}/totals`

**Get totals breakdown for a cart (pricing not yet locked)**

**Auth:** Bearer JWT required

**Path parameters:**

| Param | Description |
|---|---|
| `cartId` |  |

**Success response `200`:**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "subtotalKobo": 120000000,
    "deliveryFeeKobo": 150000,
    "serviceFeeKobo": 50000,
    "discountKobo": 0,
    "totalKobo": 120200000,
    "currency": "NGN"
  },
  "message": "Request successful",
  "meta": {
    "correlationId": "req-00000000-0000-0000-0000-000000000000",
    "timestamp": "2025-01-15T10:00:00.000Z"
  }
}
```

#### `POST /checkout/session`

**Auth:** Bearer JWT required

**Success response `201`:**

```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "sessionId": "chk_01J2K3L4M5N6P7Q8R9S0T1U2V3",
    "cartId": "64a1f2e3b4c5d6e7f8a9b0d1",
    "expiresAt": "2025-01-15T11:00:00.000Z"
  },
  "message": "Request successful",
  "meta": {
    "correlationId": "req-00000000-0000-0000-0000-000000000000",
    "timestamp": "2025-01-15T10:00:00.000Z"
  }
}
```

#### `GET /checkout/{sessionId}/summary`

**Auth:** Bearer JWT required

**Path parameters:**

| Param | Description |
|---|---|
| `sessionId` |  |

**Success response `200`:**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "sessionId": "chk_01J2K3L4M5N6P7Q8R9S0T1U2V3",
    "items": [
      {
        "name": "iPhone 15 Pro Max",
        "quantity": 1,
        "priceKobo": 120000000
      }
    ],
    "pricing": {
      "subtotalKobo": 120000000,
      "deliveryFeeKobo": 150000,
      "serviceFeeKobo": 50000,
      "totalKobo": 120200000
    },
    "deliveryAddress": {
      "fullName": "Jane Doe",
      "street": "12 Marina Road",
      "city": "Lagos",
      "state": "Lagos"
    }
  },
  "message": "Request successful",
  "meta": {
    "correlationId": "req-00000000-0000-0000-0000-000000000000",
    "timestamp": "2025-01-15T10:00:00.000Z"
  }
}
```

#### `POST /checkout/{sessionId}/confirm`

**Auth:** Bearer JWT required

**Path parameters:**

| Param | Description |
|---|---|
| `sessionId` |  |

**Success response `201`:**

```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "orderId": "64a1f2e3b4c5d6e7f8a9b0e1",
    "orderRef": "CM-20250115-A1B2C3",
    "status": "pending_payment",
    "paymentMethod": "paystack",
    "paymentUrl": "https://checkout.paystack.com/pay/abc123def456",
    "totalKobo": 120200000
  },
  "message": "Request successful",
  "meta": {
    "correlationId": "req-00000000-0000-0000-0000-000000000000",
    "timestamp": "2025-01-15T10:00:00.000Z"
  }
}
```

> **Note:** Redirect the user to `paymentUrl` to complete payment on Paystack. After payment, Paystack calls the webhook and the order status updates automatically.

#### `GET /wallet`

**Auth:** Bearer JWT required

**Success response `200`:**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "id": "64a1f2e3b4c5d6e7f8a9b0f1",
    "balanceKobo": 500000,
    "tier": "standard",
    "currency": "NGN"
  },
  "message": "Request successful",
  "meta": {
    "correlationId": "req-00000000-0000-0000-0000-000000000000",
    "timestamp": "2025-01-15T10:00:00.000Z"
  }
}
```

### 📦 Fulfilment

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/returns` | 🔒 Bearer JWT |  |
| `GET` | `/returns` | 🔒 Bearer JWT |  |
| `GET` | `/returns/eligibility/{orderItemId}` | 🔒 Bearer JWT |  |
| `GET` | `/returns/{id}` | 🔒 Bearer JWT |  |
| `PATCH` | `/returns/{id}/cancel` | 🔒 Bearer JWT |  |
| `POST` | `/returns/{id}/evidence` | 🔒 Bearer JWT |  |
| `POST` | `/refunds/{returnId}/process` | 🔒 Bearer JWT |  |
| `GET` | `/refunds/{id}` | 🔒 Bearer JWT |  |
| `POST` | `/logistics/quote` | 🔒 Bearer JWT |  |
| `POST` | `/logistics/coverage/check` | 🔒 Bearer JWT |  |
| `POST` | `/logistics/booking` | 🔒 Bearer JWT |  |
| `GET` | `/logistics/booking/{id}` | 🔒 Bearer JWT |  |
| `POST` | `/logistics/booking/{id}/cancel` | 🔒 Bearer JWT |  |
| `POST` | `/logistics/booking/{id}/retry` | 🔒 Bearer JWT |  |
| `GET` | `/logistics/tracking/{bookingId}` | 🔒 Bearer JWT |  |
| `POST` | `/logistics/pod` | 🔒 Bearer JWT |  |
| `POST` | `/logistics/pickup/ready` | 🔒 Bearer JWT |  |
| `POST` | `/logistics/pickup/verify` | 🔒 Bearer JWT |  |
| `POST` | `/logistics/pickup/complete` | 🔒 Bearer JWT |  |
| `POST` | `/logistics/pickup/fail` | 🔒 Bearer JWT |  |

### 🏪 Sellers

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/deals/campaigns` | 🔒 Seller JWT | Create a deal campaign |
| `GET` | `/deals/campaigns/my` | 🔒 Seller JWT | List my deal campaigns |
| `GET` | `/deals/campaigns/my/{id}` | 🔒 Seller JWT | Get one of my deal campaigns |
| `PATCH` | `/deals/campaigns/my/{id}` | 🔒 Seller JWT | Update one of my deal campaigns |
| `DELETE` | `/deals/campaigns/my/{id}` | 🔒 Seller JWT | Delete one of my deal campaigns |
| `POST` | `/deals/campaigns/my/{id}/initialize-payment` | 🔒 Seller JWT | Initialize Paystack payment for my deal campaign |
| `POST` | `/sellers/onboard` | 🔒 Seller JWT | Public single-step seller registration — creates account, profile, and sends verification email |
| `GET` | `/sellers/me` | 🔒 Seller JWT | Get your seller profile (spec alias of GET /sellers/my) |
| `PATCH` | `/sellers/me` | 🔒 Seller JWT | Update your seller profile (spec alias of PATCH /sellers/my) |
| `GET` | `/sellers/me/products` | 🔒 Seller JWT | List your own product listings, including inactive ones |
| `POST` | `/sellers/me/products` | 🔒 Seller JWT | Create a product under your seller profile |
| `PATCH` | `/sellers/me/products/{id}` | 🔒 Seller JWT | Update one of your own product listings |
| `DELETE` | `/sellers/me/products/{id}` | 🔒 Seller JWT | Withdraw one of your own product listings |
| `POST` | `/sellers/me/products/{id}/images` | 🔒 Seller JWT | Attach uploaded image URLs to one of your products |
| `GET` | `/sellers/{sellerId}/summary` | 🔒 Seller JWT | Get seller summary card |
| `GET` | `/sellers/{sellerSlug}/products` | 🔒 Seller JWT | List all products for a seller |
| `POST` | `/sellers/{sellerId}/follow` | 🔒 Seller JWT | Follow a seller |
| `DELETE` | `/sellers/{sellerId}/follow` | 🔒 Seller JWT | Unfollow a seller |
| `POST` | `/sellers` | 🔒 Seller JWT | Create your seller profile (one per seller) |
| `GET` | `/sellers/my` | 🔒 Seller JWT | Get your seller profile |
| `PATCH` | `/sellers/my` | 🔒 Seller JWT | Update your seller profile |
| `GET` | `/sellers/my/banking` | 🔒 Seller JWT | Get your seller bank/payout details. Returns nulls if not yet submitted. |
| `POST` | `/sellers/my/banking` | 🔒 Seller JWT | Submit/update your seller bank/payout details. Required once after seller registration; collected by the FE on the same wizard screen but POSTed here after login (kept off the public registration endpoints). |
| `POST` | `/sellers/me/agreement` | 🔒 Seller JWT |  |
| `POST` | `/sellers/me/kyc` | 🔒 Seller JWT |  |
| `GET` | `/sellers/me/orders` | 🔒 Seller JWT |  |
| `POST` | `/sellers/me/orders/{id}/acknowledge` | 🔒 Seller JWT |  |
| `POST` | `/sellers/me/orders/{id}/dispatch` | 🔒 Seller JWT |  |
| `GET` | `/sellers/me/returns` | 🔒 Seller JWT |  |
| `POST` | `/sellers/me/returns/{id}/decision` | 🔒 Seller JWT |  |
| `GET` | `/sellers/me/payouts` | 🔒 Seller JWT |  |
| `GET` | `/sellers/me/fees` | 🔒 Seller JWT |  |
| `GET` | `/promo-slots/available` | 🔒 Seller JWT |  |
| `GET` | `/promo-slots/types` | 🔒 Seller JWT |  |
| `GET` | `/promo-slots/bookings` | 🔒 Seller JWT |  |
| `POST` | `/promo-slots/bookings` | 🔒 Seller JWT |  |
| `GET` | `/promo-slots/bookings/{id}` | 🔒 Seller JWT |  |
| `POST` | `/promo-slots/bookings/{id}/pay` | 🔒 Seller JWT |  |
| `POST` | `/promo-slots/bookings/{id}/cancel` | 🔒 Seller JWT |  |
| `GET` | `/promo-slots/bookings/{id}/performance` | 🔒 Seller JWT |  |
| `POST` | `/promo-slots/{slotId}/reserve` | 🔒 Seller JWT |  |
| `GET` | `/promo-slots/{slotId}` | 🔒 Seller JWT |  |

### 🏭 Suppliers

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/suppliers/me/products` | 🔒 Bearer JWT |  |
| `PATCH` | `/suppliers/me/products/{id}/stock` | 🔒 Bearer JWT |  |
| `GET` | `/suppliers/me/orders` | 🔒 Bearer JWT |  |
| `POST` | `/suppliers/me/orders/{id}/ready` | 🔒 Bearer JWT |  |
| `POST` | `/suppliers/me/orders/{id}/dispatch` | 🔒 Bearer JWT |  |
| `GET` | `/suppliers/me/policies` | 🔒 Bearer JWT |  |

### 🎧 Support & Notifications

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/support/tickets` | 🔒 Bearer JWT |  |
| `GET` | `/support/tickets` | 🔒 Bearer JWT |  |
| `GET` | `/support/tickets/{id}` | 🔒 Bearer JWT |  |
| `POST` | `/support/tickets/{id}/messages` | 🔒 Bearer JWT |  |
| `GET` | `/notifications` | 🔒 Bearer JWT |  |
| `PATCH` | `/notifications/{id}/read` | 🔒 Bearer JWT |  |
| `POST` | `/notifications/preferences` | 🔒 Bearer JWT |  |

### 🤝 Partners & Rewards

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/partners/onboard` | 🔒 Bearer JWT |  |
| `POST` | `/partners/me/kyc` | 🔒 Bearer JWT |  |
| `POST` | `/partners/me/agreement` | 🔒 Bearer JWT |  |
| `GET` | `/partners/me/dashboard` | 🔒 Bearer JWT |  |
| `GET` | `/partners/me/eligible-items` | 🔒 Bearer JWT |  |
| `GET` | `/partners/me/eligible-items/{id}` | 🔒 Bearer JWT |  |
| `POST` | `/partners/me/commitments` | 🔒 Bearer JWT |  |
| `GET` | `/partners/me/commitments` | 🔒 Bearer JWT |  |
| `GET` | `/partners/me/commitments/{id}` | 🔒 Bearer JWT |  |
| `GET` | `/partners/me/commitments/{id}/status` | 🔒 Bearer JWT |  |
| `GET` | `/partners/me/settlements` | 🔒 Bearer JWT |  |
| `POST` | `/partners/me/disputes` | 🔒 Bearer JWT |  |
| `GET` | `/rewards/program` | 🔒 Bearer JWT |  |
| `GET` | `/rewards/me` | 🔒 Bearer JWT |  |
| `GET` | `/rewards/me/cashback` | 🔒 Bearer JWT |  |
| `GET` | `/rewards/me/transactions` | 🔒 Bearer JWT |  |
| `POST` | `/rewards/cashback/redeem` | 🔒 Bearer JWT |  |
| `GET` | `/rewards/tiers` | 🔒 Bearer JWT |  |
| `GET` | `/rewards/campaigns` | 🔒 Bearer JWT |  |
| `POST` | `/rewards/affiliates/enroll` | 🔒 Bearer JWT |  |
| `GET` | `/rewards/affiliates/me` | 🔒 Bearer JWT |  |
| `GET` | `/rewards/affiliates/me/earnings` | 🔒 Bearer JWT |  |
| `POST` | `/rewards/affiliates/me/payout` | 🔒 Bearer JWT |  |
| `GET` | `/rewards/affiliates/me/referrals` | 🔒 Bearer JWT |  |
| `GET` | `/rewards/sellers/me/rewards` | 🔒 Bearer JWT |  |
| `GET` | `/rewards/financiers/me/rewards` | 🔒 Bearer JWT |  |

#### `GET /rewards/me`

**Auth:** Bearer JWT required

**Success response `200`:**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "totalPoints": 2500,
    "cashbackKobo": 75000,
    "tier": "silver",
    "isAffiliate": false
  },
  "message": "Request successful",
  "meta": {
    "correlationId": "req-00000000-0000-0000-0000-000000000000",
    "timestamp": "2025-01-15T10:00:00.000Z"
  }
}
```

#### `GET /rewards/tiers`

**Auth:** Bearer JWT required

**Success response `200`:**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "tiers": [
      {
        "name": "Bronze",
        "minPoints": 0,
        "maxPoints": 999,
        "cashbackRate": 0.01
      },
      {
        "name": "Silver",
        "minPoints": 1000,
        "maxPoints": 4999,
        "cashbackRate": 0.02
      },
      {
        "name": "Gold",
        "minPoints": 5000,
        "maxPoints": null,
        "cashbackRate": 0.03
      }
    ]
  },
  "message": "Request successful",
  "meta": {
    "correlationId": "req-00000000-0000-0000-0000-000000000000",
    "timestamp": "2025-01-15T10:00:00.000Z"
  }
}
```

### 🔗 Webhooks

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/webhooks/stripe` | 🔒 Seller JWT |  |
| `POST` | `/webhooks/logistics/uber` | 🔒 Seller JWT |  |
| `POST` | `/webhooks/logistics/bolt` | 🔒 Seller JWT |  |
| `POST` | `/webhooks/support/whatsapp/inbound` | 🔒 Seller JWT |  |
| `POST` | `/webhooks/sms/delivery` | 🔒 Seller JWT |  |
| `POST` | `/webhooks/whatsapp/delivery` | 🔒 Seller JWT |  |

### ⚙️ System

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/` | 🔒 Bearer JWT | API root - welcome message |
| `GET` | `/health` | 🔒 Bearer JWT | General health check |
| `GET` | `/health/db` | 🔒 Bearer JWT | Database health check |
| `POST` | `/newsletter/subscriptions` | 🔒 Bearer JWT | Subscribe to newsletter |
| `GET` | `/site-config` | 🔒 Bearer JWT | Get site configuration (footer, contact, social) |
| `GET` | `/config/public` | 🔒 Bearer JWT | Get public application configuration (spec alias) |
| `GET` | `/legal/{slug}` | 🔒 Bearer JWT | Fetch a public legal page by slug |
| `POST` | `/upload` | 🔒 Bearer JWT | Upload an image to Cloudinary (Seller or Admin) |
| `POST` | `/media/upload` | 🔒 Bearer JWT | Upload an image to Cloudinary through the API |
| `POST` | `/media/upload/presigned` | 🔒 Bearer JWT | Create signed Cloudinary upload parameters for direct client upload. Use the returned media id for DELETE /media/{id} by base64url-encoding the resulting publicId. |
| `DELETE` | `/media/{encodedPublicId}` | 🔒 Bearer JWT | Delete a media asset by passing its base64url-encoded Cloudinary publicId |
| `GET` | `/version` | 🔒 Bearer JWT | Get build/version metadata |
| `GET` | `/geo/cities` | 🔒 Bearer JWT | List supported delivery cities |

---

## 7. Key Flows

### Buyer registration

```
POST /auth/register/email        → { sessionId }
POST /auth/register/details      → { sessionId }   (firstName, lastName, phone, dob)
POST /auth/register/password     → { message }      (password + confirmPassword)
POST /auth/register/verify       → { message }      (email + OTP code from email)
→ User can now log in
```

### Seller registration

```
POST /auth/register/seller/email    → { sessionId }
POST /auth/register/seller/profile  → { sessionId }   (business details)
POST /auth/register/seller/password → { message }
POST /auth/register/seller/verify   → { message }
→ Seller account pending admin approval
```

### Login

```
POST /auth/login                 → { accessToken, refreshToken, expiresIn, user }
— or OTP login:
POST /auth/otp/request           → { message }
POST /auth/otp/verify            → { purpose, tokens: { accessToken, refreshToken }, user }
```

### Password reset

```
POST /auth/forgot-password       → { message }
POST /auth/forgot-password/verify→ { resetToken }
POST /auth/forgot-password/reset → { message }
```

### Guest checkout (no account)

```
POST /cart                       → { id, guestToken }   ← store guestToken
POST /cart/{id}/items            → add products (send x-guest-token header)
GET  /cart/{id}/totals           → { subtotalKobo, deliveryFeeKobo, totalKobo }
POST /checkout/session           → { sessionId }
POST /checkout/{sessionId}/address
POST /checkout/{sessionId}/delivery
GET  /checkout/{sessionId}/summary
POST /checkout/{sessionId}/confirm → { orderId, paymentUrl }
→ Redirect user to paymentUrl
```

### Authenticated checkout

```
GET  /cart                       → existing cart (or POST /cart to create)
POST /cart/items                 → { productId, variantId?, quantity }
POST /checkout/session           → { sessionId }
POST /checkout/{sessionId}/address
POST /checkout/{sessionId}/delivery
POST /checkout/{sessionId}/confirm → { orderId, paymentUrl }
→ Redirect to paymentUrl; order status updates via Paystack webhook
```

---

## 8. Deferred / Stub Endpoints

The following endpoints exist and return a structured response, but the
underlying integration is deferred to a future release. They will not error —
they return the response shape with a `note` field explaining the deferral.

| Endpoint group | Deferred work |
|---|---|
| `POST /payments/stripe/*` | Stripe integration (international payments decision pending) |
| `POST /wallet/topup/initialize` | Paystack topup initiation |
| `POST /wallet/transfer` | Wallet-to-wallet transfers |
| `GET /partners/me/eligible-items` | AI-powered inventory scoring |
| `GET /partners/me/settlements` | Partner reconciliation engine |
| `GET /affiliates/me/earnings` | Affiliate analytics pipeline |
| `POST /affiliates/me/payout` | Paystack Connect affiliate payouts |
| `POST /logistics/book` | Logistics provider API integration |

---

## 9. Reference: Order Statuses

| Status | Meaning |
|---|---|
| `pending_payment` | Order created, awaiting payment |
| `paid` | Payment confirmed by Paystack webhook |
| `processing` | Seller acknowledged, preparing shipment |
| `dispatched` | Seller marked as dispatched |
| `in_transit` | With logistics provider |
| `delivered` | Delivery confirmed |
| `cancelled` | Cancelled by buyer or admin |
| `refund_pending` | Refund approved, awaiting Paystack transfer |
| `refunded` | Refund completed |

---

## 10. Reference: Account Types

| `accountType` | Access level |
|---|---|
| `BUYER` | Standard shopper — can browse, cart, checkout, manage own orders |
| `SELLER` | Manages products, sees own order queue |
| `SUPPLIER` | Bulk supplier view, can mark orders ready/dispatched |
| `ADMIN` | Full access including all admin endpoints |

---

## 11. Postman Setup

1. Open Postman → **Import** → select `docs/cadna-mart.postman_collection.json`
2. Import `docs/cadna-mart-local.postman_environment.json` for local testing
3. Import `docs/cadna-mart-live.postman_environment.json` for production
4. Select the environment from the top-right dropdown
5. After login, copy the `accessToken` from the response and set `{{authToken}}` in your environment

All request bodies and success responses are pre-filled.

---

_This document is auto-generated from `docs/openapi.json`._
_To regenerate: `npm run postman:gen && node scripts/gen-handoff.js`_
