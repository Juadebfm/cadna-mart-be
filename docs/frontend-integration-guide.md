# Cadna Mart — Frontend Integration Guide

> This document is the single source of truth for the FE team to integrate with the Cadna Mart backend.
> Every response shape, header, and body field is derived from the actual codebase.

---

## Table of Contents

1. [Setup & Configuration](#1-setup--configuration)
2. [Response Envelope](#2-response-envelope)
3. [Authentication Flow](#3-authentication-flow)
4. [Token Management & Protected Requests](#4-token-management--protected-requests)
5. [Homepage](#5-homepage)
6. [Categories](#6-categories)
7. [Products — Listing & Search](#7-products--listing--search)
8. [Products — Detail Page (PDP)](#8-products--detail-page-pdp)
9. [Related Products](#9-related-products)
10. [Reviews](#10-reviews)
11. [Store Summary](#11-store-summary)
12. [Shipping Estimate](#12-shipping-estimate)
13. [Policies](#13-policies)
14. [Cart](#14-cart)
15. [Wishlist](#15-wishlist)
16. [Search Suggestions](#16-search-suggestions)
17. [Newsletter](#17-newsletter)
18. [Site Config](#18-site-config)
19. [Upload (Seller / Admin)](#19-upload-seller--admin)
20. [Seller — Store Management](#20-seller--store-management)
21. [Seller / Admin — Product Management](#21-seller--admin--product-management)
22. [Admin — Products](#22-admin--products)
23. [Admin — Stores](#23-admin--stores)
24. [Admin — Categories](#24-admin--categories)
25. [Admin — Users](#25-admin--users)
26. [Error Handling](#26-error-handling)
27. [TypeScript Types Reference](#27-typescript-types-reference)

---

## 1. Setup & Configuration

### Base URL

```
Development : http://localhost:3000/api/v1
Production  : https://<your-domain>/api/v1
```

Store this in an env variable (e.g. `NEXT_PUBLIC_API_URL`). All paths below are relative to this base.

Important:
- Use `/api/v1` in your base URL. Do **not** point frontend requests to the domain root (`/`).
- Backend root (`/`) may return `404` in production; this is expected.
- Example deployed base URL: `https://cadna-mart-be-nsz2.onrender.com/api/v1`

### FE Quick Implementation Checklist (Required)

1. Set one environment variable for API base URL:
   - Dev: `http://localhost:3000/api/v1`
   - Prod: `https://<backend-domain>/api/v1`
2. Create a single shared API client (`axios` or `fetch` wrapper); do not scatter raw HTTP calls across components.
3. Always parse backend envelope (`success`, `data`, `message`, `errorCode`) before returning data to UI.
4. Save `accessToken` and `refreshToken` after login. Attach `Authorization: Bearer <accessToken>` on protected calls.
5. Implement 401 refresh flow with `POST /auth/refresh`, then retry original request once.
6. If refresh fails, clear auth state and redirect user to login.
7. Add role-based route guards for `buyer`, `seller`, `admin` using decoded user/account data.
8. For uploads, send `multipart/form-data` via `FormData` and call `POST /upload?folder=<folder>`.
9. For create/update endpoints, send only documented fields. Extra fields can trigger `400`.
10. Configure frontend domain in backend `CORS_ORIGIN` for production.
11. Use `/health` under the API base for runtime checks (`GET /health` => `/api/v1/health`).
12. Generate and send `x-correlation-id` per request for traceability.

### API Client Skeleton (Recommended)

```typescript
// api/client.ts
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { v4 as uuid } from 'uuid';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL!; // e.g. https://.../api/v1

type ApiSuccess<T> = {
  success: true;
  statusCode: number;
  data: T;
  meta: { timestamp: string; correlationId: string };
};

type ApiFailure = {
  success: false;
  statusCode: number;
  error: string;
  message: string | string[];
  errorCode?: string;
  details?: unknown[];
  meta?: { timestamp: string; correlationId?: string; path?: string };
};

type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  config.headers = config.headers ?? {};
  config.headers['x-correlation-id'] = uuid();
  const accessToken = localStorage.getItem('accessToken');
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let isRefreshing = false;
let waiters: Array<(token: string | null) => void> = [];

const subscribe = (cb: (token: string | null) => void) => waiters.push(cb);
const publish = (token: string | null) => {
  waiters.forEach((cb) => cb(token));
  waiters = [];
};

async function refreshTokens(): Promise<string> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) throw new Error('Missing refresh token');

  const res = await axios.post<ApiEnvelope<{ accessToken: string; refreshToken: string }>>(
    `${API_BASE_URL}/auth/refresh`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json', 'x-correlation-id': uuid() } },
  );

  if (!res.data.success) throw new Error(String(res.data.message));
  localStorage.setItem('accessToken', res.data.data.accessToken);
  localStorage.setItem('refreshToken', res.data.data.refreshToken);
  return res.data.data.accessToken;
}

api.interceptors.response.use(
  async (response) => {
    const envelope = response.data as ApiEnvelope<unknown>;
    if (envelope && typeof envelope === 'object' && 'success' in envelope && !envelope.success) {
      return Promise.reject(envelope);
    }
    return response;
  },
  async (error: AxiosError<ApiFailure>) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;
    const isAuthPath = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh');

    if (status !== 401 || original?._retry || isAuthPath) {
      return Promise.reject(error.response?.data ?? error);
    }

    original._retry = true;
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        subscribe((token) => {
          if (!token) return reject(error);
          original.headers = original.headers ?? {};
          original.headers.Authorization = `Bearer ${token}`;
          resolve(api(original));
        });
      });
    }

    isRefreshing = true;
    try {
      const token = await refreshTokens();
      publish(token);
      original.headers = original.headers ?? {};
      original.headers.Authorization = `Bearer ${token}`;
      return api(original);
    } catch (refreshError) {
      publish(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.assign('/login');
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export async function apiGet<T>(path: string): Promise<T> {
  const res = await api.get<ApiEnvelope<T>>(path);
  if (!res.data.success) throw res.data;
  return res.data.data;
}
```

### Required Headers

Every request should include:

```http
Content-Type: application/json
x-correlation-id: <uuid>          # Optional but recommended for tracing
```

Protected endpoints additionally require:

```http
Authorization: Bearer <accessToken>
```

### CORS

The backend allows:
- **Credentials**: `true` — cookies are sent cross-origin
- **Methods**: `GET, POST, PUT, PATCH, DELETE, OPTIONS`
- **Allowed Headers**: `Content-Type, Authorization, x-correlation-id`
- **Origin**: configured per environment via `CORS_ORIGIN` env var

### Validation Behavior

The backend uses a global validation pipe with these settings:
- **whitelist: true** — unknown properties are silently stripped from the body
- **forbidNonWhitelisted: true** — if a stripped property is detected, it returns a `400` error
- **transform: true** — query strings are auto-cast to their DTO types (e.g. `"true"` → `true`)

> **Takeaway**: only send the fields documented below. Extra fields will cause a `400`.

---

## 2. Response Envelope

**Every** response from the API follows the same envelope shape.

### Success

```typescript
{
  success: true,
  statusCode: number,       // 200, 201, 204
  data: T,                  // The actual payload — varies per endpoint
  meta: {
    timestamp: string,      // ISO-8601, e.g. "2026-03-10T08:20:00.000Z"
    correlationId: string   // Matches your x-correlation-id or auto-generated
  }
}
```

### Error

```typescript
{
  success: false,
  statusCode: number,              // 400, 401, 403, 404, 409, 422, 429, 500
  error: string,                   // HTTP status text, e.g. "Bad Request"
  message: string | string[],     // Human-readable message or array of messages
  errorCode?: string,              // Stable code for FE switch/case (e.g. "OUT_OF_STOCK")
  details?: unknown[],             // Validation details when applicable
  meta: {
    timestamp: string,
    correlationId: string,
    path: string                   // e.g. "/api/v1/products"
  }
}
```

### How to consume

```typescript
// Pseudocode — adapt to your HTTP client (axios, fetch, etc.)
const res = await api.get('/products');

if (res.data.success) {
  const products = res.data.data.items;         // ← actual data lives inside .data
  const pagination = res.data.data.pagination;
} else {
  const errorMsg = res.data.message;
  const errorCode = res.data.errorCode;         // optional — use for specific handling
}
```

---

## 3. Authentication Flow

### Account Types

```typescript
type AccountType = 'buyer' | 'seller' | 'investor' | 'admin';
```

> Note: these are **lowercase** in all payloads.

---

### 3.1 Registration (5-step wizard)

Registration is session-based. Step 1 returns a `sessionId` that must be passed to steps 2–4.

#### Step 1 — Email

```http
POST /auth/register/email
```

```json
{ "email": "john@example.com" }
```

**201 Response** `data`:
```json
{ "sessionId": "reg_abc123" }
```

Store the `sessionId` — you'll need it for the next 3 steps.

**Errors**: `409` — email already registered.

---

#### Step 2 — Account Type

```http
POST /auth/register/account-type
```

```json
{
  "sessionId": "reg_abc123",
  "accountType": "buyer"
}
```

**201 Response** `data`:
```json
{ "sessionId": "reg_abc123" }
```

---

#### Step 3 — Personal Details

```http
POST /auth/register/details
```

```json
{
  "sessionId": "reg_abc123",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+2348012345678",
  "dateOfBirth": "1995-06-15",
  "termsAccepted": true
}
```

| Field | Required | Notes |
|---|---|---|
| `sessionId` | Yes | From step 1 |
| `firstName` | Yes | |
| `lastName` | Yes | |
| `phoneNumber` | No | E.164 format preferred |
| `dateOfBirth` | No | ISO date string |
| `termsAccepted` | Yes | Must be `true` |

**201 Response** `data`:
```json
{ "sessionId": "reg_abc123" }
```

---

#### Step 4 — Password

```http
POST /auth/register/password
```

```json
{
  "sessionId": "reg_abc123",
  "password": "StrongP@ss123",
  "confirmPassword": "StrongP@ss123"
}
```

- Minimum 8 characters
- `password` and `confirmPassword` must match
- Validated against firstName, lastName, email for common patterns

**201 Response** `data`:
```json
{ "message": "Account created. Please verify your email." }
```

At this point the account exists but is **unverified**. An OTP has been sent to the email.

---

#### Step 5 — Verify Email

```http
POST /auth/register/verify
```

```json
{
  "email": "john@example.com",
  "code": "123456"
}
```

- `code` is exactly 6 characters

**200 Response** `data`:
```json
{
  "message": "Email verified successfully"
}
```

> After verification, redirect user to the login page.

---

#### Resend Verification OTP

```http
POST /auth/register/resend-otp
```

```json
{ "email": "john@example.com" }
```

**200 Response** `data`:
```json
{ "message": "Verification code sent" }
```

---

### 3.2 Login

```http
POST /auth/login
```

```json
{
  "email": "john@example.com",
  "password": "StrongP@ss123"
}
```

**200 Response — Normal login** `data`:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "15m",
  "user": {
    "id": "6615a...",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "accountType": "buyer"
  }
}
```

**200 Response — 2FA required** `data`:
```json
{
  "requires2FA": true,
  "email": "john@example.com"
}
```

When `requires2FA` is `true`, redirect to the 2FA verification screen.

**Errors**:
- `401` — invalid credentials
- `401` — email not verified (prompt user to verify)

---

### 3.3 2FA Verification (during login)

```http
POST /auth/login/verify-2fa
```

```json
{
  "email": "john@example.com",
  "code": "123456"
}
```

**200 Response** `data`: same token + user shape as normal login.

---

### 3.4 Forgot Password (3-step)

#### Request reset

```http
POST /auth/forgot-password
```

```json
{ "email": "john@example.com" }
```

**200 Response** `data`:
```json
{ "message": "If an account exists, a reset code has been sent" }
```

> Always returns the same message regardless of whether the email exists (security).

#### Verify reset code

```http
POST /auth/forgot-password/verify
```

```json
{
  "email": "john@example.com",
  "code": "123456"
}
```

**200 Response** `data`:
```json
{ "resetToken": "eyJhbGciOi..." }
```

Store the `resetToken` for the next step.

#### Set new password

```http
POST /auth/forgot-password/reset
```

```json
{
  "resetToken": "eyJhbGciOi...",
  "password": "NewStr0ngP@ss!",
  "confirmPassword": "NewStr0ngP@ss!"
}
```

**200 Response** `data`:
```json
{ "message": "Password reset successfully" }
```

---

### 3.5 2FA Management (authenticated)

#### Enable — Step 1: request code

```http
POST /auth/2fa/enable
Authorization: Bearer <accessToken>
```

No body. Sends OTP to user email.

#### Enable — Step 2: confirm

```http
POST /auth/2fa/confirm
Authorization: Bearer <accessToken>
```

```json
{ "code": "123456" }
```

#### Disable

```http
POST /auth/2fa/disable
Authorization: Bearer <accessToken>
```

```json
{ "code": "123456" }
```

---

### 3.6 Profile

```http
GET /auth/profile
Authorization: Bearer <accessToken>
```

**200 Response** `data`:
```json
{
  "id": "6615a...",
  "email": "john@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+2348012345678",
  "accountType": "buyer",
  "isEmailVerified": true,
  "isTwoFactorEnabled": false,
  "createdAt": "2026-03-10T08:00:00.000Z"
}
```

---

### 3.7 Logout

```http
POST /auth/logout
Authorization: Bearer <accessToken>
```

**200 Response** `data`:
```json
{ "message": "Logged out successfully" }
```

Clear both tokens from client storage after this call.

---

## 4. Token Management & Protected Requests

### JWT Payload (decoded)

```typescript
{
  sub: string;           // userId
  email: string;
  accountType: AccountType;
}
```

### Token Refresh

When you receive a `401` on any request, call:

```http
POST /auth/refresh
```

```json
{ "refreshToken": "<your-refresh-token>" }
```

**200 Response** `data`:
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "expiresIn": "15m"
}
```

**Recommended FE pattern**: use an axios/fetch interceptor that:
1. Catches `401` responses
2. Calls `/auth/refresh` with the stored refresh token
3. Retries the original request with the new access token
4. If refresh also fails → redirect to login

### Authorization Rules

| Decorator | What it means for FE |
|---|---|
| `@Public()` | No `Authorization` header needed |
| (no decorator) | Requires `Authorization: Bearer <accessToken>` (any account type) |
| `@AccountTypes('seller')` | Requires token + `accountType` must be `seller` |
| `@AccountTypes('seller', 'admin')` | Requires token + `accountType` must be `seller` OR `admin` |
| `@AccountTypes('admin')` | Admin-only |

If the user's account type doesn't match, the API returns `403 Forbidden`.

---

## 5. Homepage

```http
GET /home?limitPerSection=8&location=lagos
```

| Param | Type | Default | Notes |
|---|---|---|---|
| `limitPerSection` | number | `8` | 1–20, products per section |
| `location` | string | — | For localized banners |

**200 Response** `data`:

```typescript
{
  heroBanners: [
    {
      id: string,
      title: string,
      subtitle: string | null,
      description: string | null,
      imageUrl: string | null,
      mobileImageUrl: string | null,
      ctaLabel: string | null,
      ctaUrl: string | null,         // Internal path, e.g. "/products?campaign=hero_01"
      discountLabel: string | null,
      startAt: string | null,        // ISO date — check if banner is active
      endAt: string | null
    }
  ],
  sections: [
    {
      key: "best_deals" | "recommended" | "top_sellers" | "new_arrivals",
      title: string,                 // Display title
      viewAllUrl: string,            // Link for "View All" button
      products: ProductCard[]        // See §27 for ProductCard shape
    }
  ],
  topCategories: [
    {
      id: string,
      name: string,
      slug: string,
      iconUrl: string | null,
      productCount: number
    }
  ],
  campaignBanners: Banner[],        // Same shape as heroBanners
  growthCards: [
    {
      id: string,
      title: string,
      description: string | null,
      ctaLabel: string | null,
      ctaUrl: string | null
    }
  ]
}
```

### FE Implementation Notes

- **Hero carousel**: render `heroBanners` — check `startAt`/`endAt` to filter active banners
- **Product grids**: iterate `sections`, each section has a `key` for styling and a `products[]` array
- **Category icons row**: render `topCategories` — clicking one navigates to `/products?category={slug}`
- **Campaign banners**: position between product sections as per design
- **Growth cards**: "Sell More" / "Partner with us" cards at the bottom

---

## 6. Categories

```http
GET /categories?tree=true&includeCounts=true
```

| Param | Type | Default | Notes |
|---|---|---|---|
| `tree` | boolean | `false` | `true` = nested children under parents |
| `includeCounts` | boolean | `false` | Include `productCount` per category |

**200 Response** `data`:

```typescript
{
  items: [
    {
      id: string,
      name: string,
      slug: string,
      iconUrl: string | null,
      productCount?: number,
      children: [
        {
          id: string,
          name: string,
          slug: string,
          productCount?: number
        }
      ]
    }
  ]
}
```

### FE Implementation Notes

- **Header mega-menu**: call with `tree=true` to get parent → children hierarchy
- Navigate to `/products?category={slug}` for parent, `/products?subCategory={slug}` for child

---

## 7. Products — Listing & Search

```http
GET /products?q=phone&category=electronics&sort=price_asc&page=1&limit=10
```

| Param | Type | Default | Notes |
|---|---|---|---|
| `q` | string | — | Full-text search |
| `section` | string | — | `best_deals`, `recommended`, `top_sellers`, `new_arrivals` |
| `category` | string | — | Parent category slug |
| `subCategory` | string | — | Sub-category slug |
| `brand` | string | — | Brand name filter |
| `minPrice` | number | — | ≥ 0 |
| `maxPrice` | number | — | ≥ 0 |
| `inStock` | boolean | — | Only show in-stock items |
| `ratingGte` | number | — | Min rating (0–5) |
| `sort` | string | `relevance` | See sort options below |
| `page` | number | `1` | ≥ 1 |
| `limit` | number | `10` | 1–100 |

**Sort options**: `relevance`, `price_asc`, `price_desc`, `newest`, `popular`

**200 Response** `data`:

```typescript
{
  items: ProductCard[],
  pagination: {
    page: number,
    limit: number,
    totalItems: number,
    totalPages: number,
    hasNextPage: boolean,
    hasPrevPage: boolean
  }
}
```

**ProductCard shape** (used across homepage, listings, wishlist, related):

```typescript
{
  id: string,
  slug: string,
  name: string,
  brand: string | null,
  thumbnailUrl: string | null,
  price: {
    amount: number,          // e.g. 415000
    currency: "NGN",
    formatted: string        // e.g. "₦415,000"
  },
  originalPrice: {           // null if no discount
    amount: number,
    currency: "NGN",
    formatted: string
  } | null,
  savings: {                 // null if no discount
    amount: number,
    currency: "NGN",
    formatted: string
  } | null,
  discountPercent: number,   // 0 if no discount
  rating: number,            // 0–5
  reviewCount: number,
  inventoryStatus: "in_stock" | "low_stock" | "out_of_stock",
  badge: string | null,      // e.g. "Best Seller", "New", "Flash Deal"
  store: {
    id: string,
    name: string,
    isVerified: boolean,
    location: string | null,           // e.g. "Computer Village, Ikeja"
    deliveryTimeRange: string | null   // e.g. "40-60 min"
  } | null
}
```

### FE Implementation Notes

- Use `formatted` for display — no need to format prices on the FE
- `inventoryStatus` drives the "In Stock" / "Low Stock" / "Out of Stock" badge
- `badge` is freeform text — render it as a ribbon/chip
- `store.location` + `store.deliveryTimeRange` go in the product card footer
- `originalPrice` with `discountPercent` → render strikethrough price + discount tag
- Use `pagination.hasNextPage` / `hasPrevPage` for pagination controls

---

## 8. Products — Detail Page (PDP)

```http
GET /products/:slug?variantId=optional
```

| Param | Type | Notes |
|---|---|---|
| `:slug` | path | Product slug (e.g. `hisense-50-smart-tv`) |
| `variantId` | query | Pre-select a variant (e.g. from cart link) |

**200 Response** `data`:

```typescript
{
  id: string,
  slug: string,
  sku: string | null,
  productCode: string | null,         // alias of sku for direct UI display
  name: string,
  brand: string | null,

  breadcrumbs: [
    { label: "Home", url: "/" },
    { label: "Electronics", url: "/products?category=electronics" },
    { label: "TV & Audio", url: "/products?subCategory=tv-audio" },
    { label: "Hisense 50\" Smart TV", url: null }  // current page → no link
  ],

  rating: number,
  reviewCount: number,

  // Pricing
  price: Money,
  originalPrice: Money | null,
  discountPercent: number,
  savings: Money | null,         // originalPrice - price, null if no discount

  inventoryStatus: "in_stock" | "low_stock" | "out_of_stock",
  badge: string | null,

  // Gallery
  gallery: [
    { id: string, url: string, alt: string | null }
  ],

  // Variants
  variantAxes: [
    {
      name: string,             // e.g. "colour"
      displayName: string,      // e.g. "Colour"
      options: [
        {
          id: string,           // e.g. "midnight-black"
          label: string,        // e.g. "Midnight Black"
          swatchHex: string | null  // e.g. "#1f2d47" — show colour swatch
        }
      ]
    }
  ],
  variants: [
    {
      id: string,
      sku: string,
      attributes: Record<string, string>,  // e.g. { "colour": "midnight-black", "size": "s" }
      price: Money,
      stockQty: number,
      isInStock: boolean,
      images: string[]          // Variant-specific image URLs
    }
  ],
  defaultVariantId: string | null,
  selectedVariantId: string | null,
  selectedVariant: ProductVariant | null,

  // Content
  descriptionHtml: string | null,       // Rich HTML — render with dangerouslySetInnerHTML
  tabs: [
    {
      label: string,                    // Tab title, e.g. "Description", "How to Use"
      contentHtml: string               // Tab body as HTML
    }
  ],
  specifications: [
    { name: string, value: string }     // e.g. { name: "Screen Size", value: "50 inch" }
  ],

  // Store card
  store: {
    id: string,
    name: string,
    logoUrl: string | null,
    isVerified: boolean,
    responseRatePercent: number,
    rating: number,
    joinedYear: number,
    reviewCount: number,
    location: string | null,
    deliveryTimeRange: string | null,
    storeUrl: string
  } | null
}
```

### FE Implementation Notes

- **Breadcrumbs**: render from `breadcrumbs[]`, skip link on last item (where `url` is null)
- **Gallery**: use `gallery[]` for the image carousel. When user selects a variant, check `variants[].images` for variant-specific images
- **Variant selection**: render `variantAxes` as selectors (colour swatches, size buttons). On selection, find matching variant in `variants[]` by `attributes`, update price/stock/images accordingly
- **Selected variant**: backend returns `selectedVariantId` and `selectedVariant` (already resolved from `variantId` query when valid, otherwise default/first variant)
- **Tabs**: render `tabs[]` as a tab component. `contentHtml` is sanitized HTML — render with `dangerouslySetInnerHTML` (or a sanitizer like DOMPurify)
- **Specifications**: render as a 2-column table
- **Store card**: use `store.id` to link to `/stores/{store.id}` and call `GET /stores/:storeId/summary` if more detail is needed
- **Add to Cart**: send `productId: data.id`, `variantId: selectedVariant.id`, `quantity: 1`

---

## 9. Related Products

```http
GET /products/:productId/related?limit=8
```

| Param | Type | Default |
|---|---|---|
| `limit` | number | `8` (max 20) |

**200 Response** `data`:

```typescript
{ items: ProductCard[] }
```

---

## 10. Reviews

```http
GET /products/:productId/reviews?sort=most_recent&page=1&limit=10
```

| Param | Type | Default |
|---|---|---|
| `sort` | string | `most_recent` |
| `page` | number | `1` |
| `limit` | number | `10` |

**Sort options**: `most_recent`, `highest_rating`, `lowest_rating`, `most_helpful`

**200 Response** `data`:

```typescript
{
  summary: {
    averageRating: number,
    totalReviews: number,
    breakdown: {
      "5": number,
      "4": number,
      "3": number,
      "2": number,
      "1": number
    }
  },
  items: [
    {
      id: string,
      rating: number,
      title: string,
      comment: string,
      reviewerName: string,
      createdAt: string,
      isVerifiedPurchase: boolean
    }
  ],
  pagination: Pagination
}
```

### FE Implementation Notes

- **Star bar**: use `summary.breakdown` to render the 5-star distribution bars
- **Verified badge**: show a "Verified Purchase" badge when `isVerifiedPurchase` is `true`

---

## 11. Store Summary

```http
GET /stores/:storeId/summary
```

**200 Response** `data`:

```typescript
{
  id: string,
  name: string,
  isVerified: boolean,
  responseRatePercent: number,
  averageRating: number,
  joinedYear: number,
  reviewCount: number,
  logoUrl: string | null,
  storeUrl: string            // e.g. "/stores/steppers-store-ng"
}
```

---

## 12. Shipping Estimate

```http
GET /shipping/estimate?productId=xxx&city=lagos&variantId=yyy
```

| Param | Type | Required |
|---|---|---|
| `productId` | string | Yes |
| `city` | string | Yes |
| `variantId` | string | No |

**200 Response** `data`:

```typescript
{
  city: string,
  sameCityDelivery: string,           // e.g. "2-4 working days"
  otherCitiesDelivery: string,        // e.g. "5-7 working days"
  freeShippingThreshold: Money,
  estimatedShippingCost: Money
}
```

---

## 13. Policies

```http
GET /policies/products/:productId
```

**200 Response** `data`:

```typescript
{
  returnPolicy: {
    title: string,
    summary: string,
    detailsUrl: string | null
  },
  warrantyPolicy: {
    title: string,
    summary: string,
    detailsUrl: string | null
  }
}
```

---

## 14. Cart

All cart endpoints require `Authorization: Bearer <accessToken>`.

### Get Cart

```http
GET /cart
```

**200 Response** `data`:

```typescript
{
  id: string | null,
  currency: "NGN",
  items: [
    {
      itemId: string,
      productId: string,
      variantId: string | null,
      name: string,
      thumbnailUrl: string | null,
      price: Money,
      quantity: number,
      stockQty: number,
      lineTotal: Money
    }
  ],
  totals: {
    subtotal: Money,
    shipping: Money,
    discount: Money,
    grandTotal: Money
  }
}
```

### Add Item

```http
POST /cart/items
```

```json
{
  "productId": "6615a...",
  "variantId": "var_001",
  "quantity": 1
}
```

| Field | Required | Notes |
|---|---|---|
| `productId` | Yes | |
| `variantId` | No | Required if product has variants |
| `quantity` | Yes | ≥ 1 |

**201 Response** `data`: updated cart (same shape as `GET /cart`)

**Errors**: `422` — out of stock

### Update Quantity

```http
PATCH /cart/items/:itemId
```

```json
{ "quantity": 3 }
```

**200 Response** `data`: updated cart

### Remove Item

```http
DELETE /cart/items/:itemId
```

**200 Response** `data`: updated cart

### FE Implementation Notes

- Cart endpoints return the **entire cart** after every mutation — replace your local state with the response
- Use `items[].stockQty` to cap the quantity selector
- Use `totals.grandTotal.formatted` for the checkout button

---

## 15. Wishlist

All wishlist endpoints require `Authorization: Bearer <accessToken>`.

### Get Wishlist

```http
GET /wishlist
```

**200 Response** `data`:

```typescript
{
  items: [
    {
      productId: string,
      addedAt: string,
      product: ProductCard
    }
  ]
}
```

### Add to Wishlist

```http
POST /wishlist/:productId
```

**201 Response** `data`:
```json
{ "message": "Added to wishlist" }
```

**Errors**: `409` — already in wishlist

### Remove from Wishlist

```http
DELETE /wishlist/:productId
```

**200 Response** `data`:
```json
{ "message": "Removed from wishlist" }
```

### FE Implementation Notes

- Toggle the heart icon based on whether `productId` is in the local wishlist state
- On `409`, just treat as already wishlisted (no error toast needed)

---

## 16. Search Suggestions

```http
GET /search/suggest?q=phone&limit=8
```

| Param | Type | Default |
|---|---|---|
| `q` | string (required) | — |
| `limit` | number | `8` |

**200 Response** `data`:

```typescript
{
  items: [
    {
      id: string,
      name: string,
      slug: string,
      thumbnailUrl: string | null,
      price: Money,
      brand: string | null
    }
  ]
}
```

### FE Implementation Notes

- Debounce input by ~300ms before calling
- Navigate to `/products/{slug}` on click, or `/products?q={query}` on Enter

---

## 17. Newsletter

```http
POST /newsletter/subscriptions
```

```json
{ "email": "user@example.com" }
```

**201 Response** `data`:
```json
{ "message": "Subscription successful" }
```

---

## 18. Site Config

```http
GET /site-config
```

**200 Response** `data`:

```typescript
{
  footer: {
    aboutText: string,
    links: [{ label: string, url: string }]
  },
  socialLinks: [{ platform: string, url: string }],
  contact: {
    email: string,
    phone: string
  }
}
```

### FE Implementation Notes

- Fetch once on app init and cache — this data rarely changes
- Use for footer, "Contact Us" page, social icons

---

## 19. Upload (Seller / Admin)

**Requires**: `AccountTypes('seller', 'admin')`

```http
POST /upload?folder=products
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
```

| Query Param | Options | Default |
|---|---|---|
| `folder` | `products`, `stores`, `categories`, `general` | `general` |

**Form-data field**: `file` — image file

**Constraints**:
- Max size: **5 MB**
- Allowed types: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`, `image/gif`

**201 Response** `data`:

```json
{
  "url": "https://res.cloudinary.com/.../cadna-mart/products/abc123.webp",
  "publicId": "cadna-mart/products/abc123"
}
```

### FE Implementation Notes

- Use the `url` value directly in product/store creation payloads (e.g. `thumbnailUrl`, `gallery[].url`, `logoUrl`)
- Upload images **first**, then create/update the product with the returned URLs
- Example with FormData:

```typescript
const formData = new FormData();
formData.append('file', selectedFile);

const res = await api.post('/upload?folder=products', formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
    'Authorization': `Bearer ${token}`
  }
});

const imageUrl = res.data.data.url;  // Use this in product creation
```

---

## 20. Seller — Store Management

**Requires**: `AccountTypes('seller')`

### Create Store

```http
POST /stores
```

```json
{
  "name": "My Electronics Shop",
  "logoUrl": "https://res.cloudinary.com/...",
  "location": "Computer Village, Ikeja",
  "deliveryTimeRange": "30-60 min"
}
```

| Field | Required | Notes |
|---|---|---|
| `name` | Yes | |
| `logoUrl` | No | Upload via `POST /upload?folder=stores` first |
| `location` | No | Display text |
| `deliveryTimeRange` | No | Display text, e.g. "30-60 min" |

**201 Response** `data`:

```typescript
{
  id: string,
  name: string,
  slug: string,
  logoUrl: string | null,
  location: string | null,
  deliveryTimeRange: string | null,
  isVerified: boolean,       // false initially — admin verifies
  responseRatePercent: number,
  averageRating: number,
  reviewCount: number,
  joinedYear: number,
  storeUrl: string
}
```

**Errors**: `409` — seller already has a store (one store per seller)

### Get My Store

```http
GET /stores/my
```

**200 Response** `data`: same store shape

### Update My Store

```http
PATCH /stores/my
```

```json
{
  "name": "Updated Name",
  "location": "Surulere, Lagos"
}
```

All fields optional. **200 Response** `data`: updated store.

---

## 21. Seller / Admin — Product Management

**Requires**: `AccountTypes('seller', 'admin')`

### Create Product

```http
POST /products
```

```typescript
{
  // Required
  name: string,
  storeId: string,
  priceAmount: number,          // Server builds the Money object from this

  // Optional
  brand?: string,
  sku?: string,
  categoryId?: string,
  subCategoryId?: string,
  thumbnailUrl?: string,
  originalPriceAmount?: number,
  discountPercent?: number,     // 0–100
  gallery?: [{ id: string, url: string, alt?: string }],
  variantAxes?: [{
    name: string,
    displayName: string,
    options: [{ id: string, label: string, swatchHex?: string }]
  }],
  variants?: [{
    id: string,
    sku: string,
    attributes: Record<string, string>,
    priceAmount: number,
    stockQty?: number,
    isInStock?: boolean,
    images?: string[]
  }],
  defaultVariantId?: string,
  descriptionHtml?: string,
  tabs?: [{ label: string, contentHtml: string }],
  specifications?: [{ name: string, value: string }],
  breadcrumbs?: [{ label: string, url?: string }],
  badge?: string,
  sections?: string[],          // e.g. ["best_deals", "new_arrivals"]
  inventoryStatus?: string,
  isActive?: boolean            // default true
}
```

> **Important**: use `priceAmount` (number), not `price`. The server constructs the `Money` object.

**201 Response** `data`: ProductCard

### Update Product

```http
PATCH /products/:id
```

Same body as create, all fields optional.

- **Seller**: can only update their own store's products
- **Admin**: can update any product

**Errors**: `403` — seller doesn't own this product

### Delete Product

```http
DELETE /products/:id
```

**204**: no content

---

## 22. Admin — Products

**Requires**: `AccountTypes('admin')`

### List All Products

```http
GET /admin/products?page=1&limit=20&includeInactive=true
```

| Param | Default | Notes |
|---|---|---|
| `page` | `1` | |
| `limit` | `20` | |
| `includeInactive` | `true` | Show deactivated products too |

**200 Response** `data`:
```typescript
{
  items: ProductCard[],
  pagination: Pagination
}
```

### Update Product

```http
PATCH /admin/products/:id
```

Same body as `PATCH /products/:id`. No ownership check.

### Toggle Status

```http
PATCH /admin/products/:id/status
```

```json
{ "isActive": false }
```

### Force Delete

```http
DELETE /admin/products/:id
```

**204**: no content

---

## 23. Admin — Stores

**Requires**: `AccountTypes('admin')`

### List All Stores

```http
GET /admin/stores?page=1&limit=20
```

### Update Store

```http
PATCH /admin/stores/:id
```

Same fields as `CreateStoreDto`, all optional.

### Toggle Verified

```http
PATCH /admin/stores/:id/verify
```

```json
{ "isVerified": true }
```

---

## 24. Admin — Categories

**Requires**: `AccountTypes('admin')`

### List Categories

```http
GET /admin/categories
```

### Create Category

```http
POST /admin/categories
```

```json
{
  "name": "Skincare",
  "slug": "skincare",
  "iconUrl": "https://...",
  "parentId": "parent-category-id-or-null",
  "order": 3,
  "isActive": true
}
```

| Field | Required | Notes |
|---|---|---|
| `name` | Yes | |
| `slug` | Yes | URL-safe, unique |
| `iconUrl` | No | Upload first |
| `parentId` | No | `null` = top-level category |
| `order` | No | Sort position, ≥ 0 |
| `isActive` | No | Default `true` |

### Update Category

```http
PATCH /admin/categories/:id
```

All fields optional.

### Delete Category

```http
DELETE /admin/categories/:id
```

Soft delete. **204**: no content.

---

## 25. Admin — Users

**Requires**: `AccountTypes('admin')`

### List Users

```http
GET /users?page=1&limit=20
```

**200 Response** `data`:
```typescript
{
  items: [{
    id: string,
    email: string,
    firstName: string,
    lastName: string,
    accountType: AccountType,
    isEmailVerified: boolean,
    createdAt: string
  }],
  pagination: Pagination
}
```

### Create User

```http
POST /users
```

```json
{
  "email": "seller@example.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "password": "TempPass123!",
  "accountType": "seller"
}
```

### Get User

```http
GET /users/:id
```

### Update User

```http
PATCH /users/:id
```

### Delete User (Soft)

```http
DELETE /users/:id
```

**204**: no content.

---

## 26. Error Handling

### Common HTTP Status Codes

| Code | Meaning | When |
|---|---|---|
| `400` | Bad Request | Validation failed, malformed body |
| `401` | Unauthorized | Missing/expired token, invalid credentials |
| `403` | Forbidden | Valid token but wrong account type or ownership check failed |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Duplicate (e.g. email exists, store already created, item in wishlist) |
| `422` | Unprocessable | Business rule (e.g. out of stock) |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Server Error | Unexpected error |

### Error Codes (stable for FE switch/case)

| errorCode | Description |
|---|---|
| `PRODUCT_NOT_FOUND` | Product doesn't exist |
| `CATEGORY_NOT_FOUND` | Category doesn't exist |
| `STORE_NOT_FOUND` | Store doesn't exist |
| `VARIANT_NOT_FOUND` | Variant doesn't exist |
| `OUT_OF_STOCK` | Product/variant out of stock |
| `INVALID_QUANTITY` | Quantity below 1 or exceeds stock |
| `CART_ITEM_NOT_FOUND` | Cart item doesn't exist |
| `WISHLIST_ITEM_EXISTS` | Already wishlisted |
| `STORE_ALREADY_EXISTS` | Seller already has a store |
| `STORAGE_NOT_CONFIGURED` | Server-side: Cloudinary not configured |
| `UNAUTHORIZED` | Auth failed |
| `FORBIDDEN` | Permission denied |
| `VALIDATION_FAILED` | Body/query validation error |

### Recommended FE Error Handler

```typescript
function handleApiError(error: ApiError) {
  switch (error.statusCode) {
    case 401:
      // Try token refresh, then redirect to login
      break;
    case 403:
      // Show "Permission denied" toast
      break;
    case 409:
      // Show specific conflict message from error.message
      break;
    case 422:
      if (error.errorCode === 'OUT_OF_STOCK') {
        // Show "Item is out of stock" and disable Add to Cart
      }
      break;
    case 429:
      // Show "Please wait and try again"
      break;
    default:
      // Show error.message as a toast
  }
}
```

---

## 27. TypeScript Types Reference

Copy these into your FE codebase as a starting point:

```typescript
// ─── Shared ───────────────────────────────────────

type AccountType = 'buyer' | 'seller' | 'investor' | 'admin';

interface Money {
  amount: number;
  currency: 'NGN';
  formatted: string;
}

interface Pagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  data: T;
  meta: {
    timestamp: string;
    correlationId: string;
  };
}

interface ApiError {
  success: false;
  statusCode: number;
  error: string;
  message: string | string[];
  errorCode?: string;
  details?: unknown[];
  meta: {
    timestamp: string;
    correlationId: string;
    path: string;
  };
}

// ─── Auth ─────────────────────────────────────────

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  user: UserSummary;
}

interface Login2FAResponse {
  requires2FA: true;
  email: string;
}

interface UserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  accountType: AccountType;
}

interface UserProfile extends UserSummary {
  phoneNumber?: string;
  isEmailVerified: boolean;
  isTwoFactorEnabled: boolean;
  createdAt: string;
}

// ─── Products ─────────────────────────────────────

interface ProductCard {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  thumbnailUrl: string | null;
  price: Money;
  originalPrice: Money | null;
  savings: Money | null;
  discountPercent: number;
  rating: number;
  reviewCount: number;
  inventoryStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  badge: string | null;
  store: ProductCardStore | null;
}

interface ProductCardStore {
  id: string;
  name: string;
  isVerified: boolean;
  location: string | null;
  deliveryTimeRange: string | null;
}

interface ProductDetail {
  id: string;
  slug: string;
  sku: string | null;
  productCode: string | null;
  name: string;
  brand: string | null;
  breadcrumbs: Breadcrumb[];
  rating: number;
  reviewCount: number;
  price: Money;
  originalPrice: Money | null;
  discountPercent: number;
  savings: Money | null;
  inventoryStatus: string;
  badge: string | null;
  gallery: GalleryImage[];
  variantAxes: VariantAxis[];
  variants: ProductVariant[];
  defaultVariantId: string | null;
  selectedVariantId: string | null;
  selectedVariant: ProductVariant | null;
  descriptionHtml: string | null;
  tabs: ProductTab[];
  specifications: Specification[];
  store: ProductDetailStore | null;
}

interface Breadcrumb {
  label: string;
  url: string | null;
}

interface GalleryImage {
  id: string;
  url: string;
  alt: string | null;
}

interface VariantAxis {
  name: string;
  displayName: string;
  options: VariantOption[];
}

interface VariantOption {
  id: string;
  label: string;
  swatchHex: string | null;
}

interface ProductVariant {
  id: string;
  sku: string;
  attributes: Record<string, string>;
  price: Money;
  stockQty: number;
  isInStock: boolean;
  images: string[];
}

interface ProductTab {
  label: string;
  contentHtml: string;
}

interface Specification {
  name: string;
  value: string;
}

interface ProductDetailStore {
  id: string;
  name: string;
  logoUrl: string | null;
  isVerified: boolean;
  responseRatePercent: number;
  rating: number;
  joinedYear: number;
  reviewCount: number;
  location: string | null;
  deliveryTimeRange: string | null;
  storeUrl: string;
}

// ─── Cart ─────────────────────────────────────────

interface Cart {
  id: string | null;
  currency: 'NGN';
  items: CartItem[];
  totals: CartTotals;
}

interface CartItem {
  itemId: string;
  productId: string;
  variantId: string | null;
  name: string;
  thumbnailUrl: string | null;
  price: Money;
  quantity: number;
  stockQty: number;
  lineTotal: Money;
}

interface CartTotals {
  subtotal: Money;
  shipping: Money;
  discount: Money;
  grandTotal: Money;
}

// ─── Wishlist ─────────────────────────────────────

interface WishlistItem {
  productId: string;
  addedAt: string;
  product: ProductCard;
}

// ─── Reviews ──────────────────────────────────────

interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  breakdown: Record<string, number>;
}

interface Review {
  id: string;
  rating: number;
  title: string;
  comment: string;
  reviewerName: string;
  createdAt: string;
  isVerifiedPurchase: boolean;
}

// ─── Store ────────────────────────────────────────

interface StoreSummary {
  id: string;
  name: string;
  isVerified: boolean;
  responseRatePercent: number;
  averageRating: number;
  joinedYear: number;
  reviewCount: number;
  logoUrl: string | null;
  storeUrl: string;
}

interface SellerStore extends StoreSummary {
  slug: string;
  location: string | null;
  deliveryTimeRange: string | null;
}

// ─── Upload ───────────────────────────────────────

interface UploadResponse {
  url: string;
  publicId: string;
}

// ─── Categories ───────────────────────────────────

interface Category {
  id: string;
  name: string;
  slug: string;
  iconUrl: string | null;
  productCount?: number;
  children: Category[];
}

// ─── Shipping ─────────────────────────────────────

interface ShippingEstimate {
  city: string;
  sameCityDelivery: string;
  otherCitiesDelivery: string;
  freeShippingThreshold: Money;
  estimatedShippingCost: Money;
}

// ─── Policies ─────────────────────────────────────

interface ProductPolicies {
  returnPolicy: Policy;
  warrantyPolicy: Policy;
}

interface Policy {
  title: string;
  summary: string;
  detailsUrl: string | null;
}

// ─── Banner ───────────────────────────────────────

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  imageUrl: string | null;
  mobileImageUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  discountLabel: string | null;
  startAt: string | null;
  endAt: string | null;
}

// ─── Homepage ─────────────────────────────────────

interface HomeSection {
  key: string;
  title: string;
  viewAllUrl: string;
  products: ProductCard[];
}

interface HomeResponse {
  heroBanners: Banner[];
  sections: HomeSection[];
  topCategories: Category[];
  campaignBanners: Banner[];
  growthCards: {
    id: string;
    title: string;
    description: string | null;
    ctaLabel: string | null;
    ctaUrl: string | null;
  }[];
}

// ─── Site Config ──────────────────────────────────

interface SiteConfig {
  footer: {
    aboutText: string;
    links: { label: string; url: string }[];
  };
  socialLinks: { platform: string; url: string }[];
  contact: {
    email: string;
    phone: string;
  };
}
```
