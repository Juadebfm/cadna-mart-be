# Cadna Mart — Postman API Reference

Base URL: `{{baseUrl}}/api/v1`

Set `{{baseUrl}}` to `http://localhost:3000` (dev) or your deployed URL.

---

## Variables (set in Postman environment)

| Variable | Description |
|---|---|
| `{{baseUrl}}` | e.g. `http://localhost:3000` |
| `{{accessToken}}` | Obtained from login / register |
| `{{refreshToken}}` | Obtained from login / register |

---

## Auth Header (for protected endpoints)

```
Authorization: Bearer {{accessToken}}
```

---

## 1. AUTH

### `POST /auth/register/email`
**Headers:** `Content-Type: application/json`

**Body:**
```json
{ "email": "user@example.com" }
```

**Success 201:**
```json
{ "message": "OTP sent to your email. Proceed to account type selection." }
```

**Errors:**
- `400` — invalid email format
- `409` — email already registered

---

### `POST /auth/register/account-type`
**Headers:** `Content-Type: application/json`

**Body:**
```json
{ "email": "user@example.com", "accountType": "BUYER" }
```
> `accountType`: `BUYER | SELLER | INVESTOR`

**Success 201:**
```json
{ "message": "Account type selected." }
```

---

### `POST /auth/register/details`
**Headers:** `Content-Type: application/json`

**Body:**
```json
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+2348012345678"
}
```

**Success 201:**
```json
{ "message": "Details saved." }
```

---

### `POST /auth/register/password`
**Headers:** `Content-Type: application/json`

**Body:**
```json
{ "email": "user@example.com", "password": "StrongPass123!" }
```

**Success 201:**
```json
{ "message": "Account created. Please verify your email." }
```

---

### `POST /auth/register/verify`
**Headers:** `Content-Type: application/json`

**Body:**
```json
{ "email": "user@example.com", "otp": "123456" }
```

**Success 200:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "accountType": "BUYER",
    "isEmailVerified": true
  }
}
```

**Errors:**
- `400` — invalid or expired OTP

---

### `POST /auth/register/resend-otp`
**Headers:** `Content-Type: application/json`

**Body:**
```json
{ "email": "user@example.com" }
```

**Success 200:**
```json
{ "message": "OTP resent." }
```

---

### `POST /auth/login`
**Headers:** `Content-Type: application/json`

**Body:**
```json
{ "email": "user@example.com", "password": "StrongPass123!" }
```

**Success 200 (no 2FA):**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "accountType": "BUYER"
  }
}
```

**Success 200 (2FA enabled):**
```json
{ "requires2FA": true, "message": "2FA code sent to your email." }
```

**Errors:**
- `400` — validation error
- `401` — invalid credentials
- `401` — email not verified

---

### `POST /auth/login/verify-2fa`
**Headers:** `Content-Type: application/json`

**Body:**
```json
{ "email": "user@example.com", "code": "123456" }
```

**Success 200:** same as login success (with tokens + user)

**Errors:**
- `401` — invalid or expired 2FA code

---

### `POST /auth/forgot-password`
**Headers:** `Content-Type: application/json`

**Body:**
```json
{ "email": "user@example.com" }
```

**Success 200:**
```json
{ "message": "Reset OTP sent to your email." }
```

---

### `POST /auth/forgot-password/verify`
**Headers:** `Content-Type: application/json`

**Body:**
```json
{ "email": "user@example.com", "otp": "123456" }
```

**Success 200:**
```json
{ "resetToken": "tok_abc123xyz" }
```

**Errors:**
- `400` — invalid or expired OTP

---

### `POST /auth/forgot-password/reset`
**Headers:** `Content-Type: application/json`

**Body:**
```json
{ "resetToken": "tok_abc123xyz", "newPassword": "NewPass123!" }
```

**Success 200:**
```json
{ "message": "Password reset successful." }
```

---

### `POST /auth/refresh`
**Headers:** `Content-Type: application/json`

**Body:**
```json
{ "refreshToken": "eyJ..." }
```

**Success 200:**
```json
{ "accessToken": "eyJ...", "refreshToken": "eyJ..." }
```

**Errors:**
- `401` — invalid or expired refresh token

---

### `GET /auth/profile`
**Headers:** `Authorization: Bearer {{accessToken}}`

**Success 200:**
```json
{
  "id": "...",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+2348012345678",
  "accountType": "BUYER",
  "isEmailVerified": true,
  "isTwoFactorEnabled": false,
  "createdAt": "2026-03-10T08:00:00.000Z"
}
```

---

### `POST /auth/logout`
**Headers:** `Authorization: Bearer {{accessToken}}`, `Content-Type: application/json`

**Body:** `{}`

**Success 200:**
```json
{ "message": "Logged out successfully." }
```

---

### `POST /auth/2fa/enable`
**Headers:** `Authorization: Bearer {{accessToken}}`

No body. Sends OTP to user's email.

**Success 200:**
```json
{ "message": "OTP sent to your email. Confirm to enable 2FA." }
```

---

### `POST /auth/2fa/confirm`
**Headers:** `Authorization: Bearer {{accessToken}}`, `Content-Type: application/json`

**Body:**
```json
{ "otp": "123456" }
```

**Success 200:**
```json
{ "message": "2FA enabled successfully." }
```

---

### `POST /auth/2fa/disable`
**Headers:** `Authorization: Bearer {{accessToken}}`, `Content-Type: application/json`

**Body:**
```json
{ "otp": "123456" }
```

**Success 200:**
```json
{ "message": "2FA disabled." }
```

---

## 2. HOME

### `GET /home`
**Headers:** none

**Query Params:**
- `limitPerSection` (number, default `8`)
- `location` (string, optional) — e.g. `lagos`

**Success 200:**
```json
{
  "heroBanners": [
    {
      "id": "...",
      "title": "Shop Smarter.",
      "subtitle": "Delivered Faster.",
      "description": "Find top products at amazing prices",
      "imageUrl": "https://...",
      "mobileImageUrl": "https://...",
      "ctaLabel": "Shop Now",
      "ctaUrl": "/products?campaign=hero_01",
      "discountLabel": null,
      "startAt": "2026-03-01T00:00:00.000Z",
      "endAt": "2026-03-31T23:59:59.000Z"
    }
  ],
  "sections": [
    {
      "key": "best_deals",
      "title": "Get the best deals",
      "viewAllUrl": "/products?section=best_deals",
      "products": [
        {
          "id": "...",
          "slug": "hisense-50-smart-tv",
          "name": "Hisense 50\" Smart TV",
          "brand": "Hisense",
          "thumbnailUrl": "https://...",
          "price": { "amount": 415000, "currency": "NGN", "formatted": "₦415,000" },
          "originalPrice": { "amount": 520000, "currency": "NGN", "formatted": "₦520,000" },
          "discountPercent": 19,
          "rating": 4.5,
          "reviewCount": 128,
          "inventoryStatus": "in_stock",
          "badge": "Best Seller",
          "store": {
            "id": "...",
            "name": "Steppers Store NG",
            "isVerified": true,
            "location": "Computer Village, Ikeja",
            "deliveryTimeRange": "40-60 min"
          }
        }
      ]
    },
    { "key": "recommended", "title": "Recommended Products For You", "viewAllUrl": "/products?section=recommended", "products": [] },
    { "key": "top_sellers", "title": "Featured Products From Our Top Sellers", "viewAllUrl": "/products?section=top_sellers", "products": [] },
    { "key": "new_arrivals", "title": "New Arrivals", "viewAllUrl": "/products?section=new_arrivals", "products": [] }
  ],
  "topCategories": [
    { "id": "...", "name": "Electronics", "slug": "electronics", "iconUrl": "https://...", "productCount": 120 }
  ],
  "campaignBanners": [
    {
      "id": "...",
      "title": "Flash Sale",
      "subtitle": "Limited stocks",
      "imageUrl": "https://...",
      "ctaLabel": "Shop Deals",
      "ctaUrl": "/products?campaign=flash_sale",
      "discountLabel": "up to 30% off",
      "startAt": null,
      "endAt": null
    }
  ],
  "growthCards": [
    {
      "id": "...",
      "title": "Sell More. Grow More.",
      "description": "Become a seller on Cadna Mart",
      "ctaLabel": "Get Started",
      "ctaUrl": "/sell"
    }
  ]
}
```

---

## 3. CATEGORIES

### `GET /categories`
**Headers:** none

**Query Params:**
- `tree` (boolean, default `false`)
- `includeCounts` (boolean, default `false`)

**Success 200:**
```json
{
  "items": [
    {
      "id": "...",
      "name": "Electronics",
      "slug": "electronics",
      "iconUrl": "https://...",
      "productCount": 120,
      "order": 0,
      "children": [
        { "id": "...", "name": "TV & Audio", "slug": "tv-audio", "productCount": 45 }
      ]
    }
  ]
}
```

---

## 4. SEARCH

### `GET /search/suggest`
**Headers:** none

**Query Params:**
- `q` (string, required)
- `limit` (number, default `8`)

**Success 200:**
```json
{
  "items": [
    {
      "id": "...",
      "name": "Hisense 50\" Smart TV",
      "slug": "hisense-50-smart-tv",
      "thumbnailUrl": "https://...",
      "price": { "amount": 415000, "currency": "NGN", "formatted": "₦415,000" },
      "brand": "Hisense"
    }
  ]
}
```

---

## 5. PRODUCTS

### `GET /products`
**Headers:** none

**Query Params:**

| Param | Type | Notes |
|---|---|---|
| `q` | string | Full-text search |
| `section` | string | `best_deals \| recommended \| top_sellers \| new_arrivals` |
| `category` | string | Category slug |
| `subCategory` | string | Sub-category slug |
| `brand` | string | |
| `minPrice` | number | |
| `maxPrice` | number | |
| `inStock` | boolean | |
| `ratingGte` | number | |
| `sort` | string | `relevance \| price_asc \| price_desc \| newest \| popular \| discount` |
| `page` | number | default `1` |
| `limit` | number | default `10`, max `100` |

**Success 200:**
```json
{
  "items": [
    {
      "id": "...",
      "slug": "hisense-50-smart-tv",
      "name": "Hisense 50\" Smart TV 50A4Q",
      "brand": "Hisense",
      "thumbnailUrl": "https://...",
      "price": { "amount": 415000, "currency": "NGN", "formatted": "₦415,000" },
      "originalPrice": { "amount": 520000, "currency": "NGN", "formatted": "₦520,000" },
      "discountPercent": 19,
      "rating": 4.5,
      "reviewCount": 1285,
      "inventoryStatus": "in_stock",
      "badge": "Best Seller",
      "store": {
        "id": "...",
        "name": "Steppers Store NG",
        "isVerified": true,
        "location": "Computer Village, Ikeja",
        "deliveryTimeRange": "40-60 min"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 250,
    "totalPages": 25,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

### `GET /products/:slug`
**Headers:** none

**Query Params:**
- `variantId` (string, optional) — preselect a variant

**Success 200:**
```json
{
  "id": "...",
  "slug": "hisense-50-smart-tv-50a4q",
  "sku": "6945056",
  "name": "Hisense 50\" Smart TV 50A4Q",
  "brand": "Hisense",
  "breadcrumbs": [
    { "label": "Home", "url": "/" },
    { "label": "Electronics", "url": "/products?category=electronics" },
    { "label": "TV & Audio", "url": "/products?subCategory=tv-audio" },
    { "label": "Hisense 50\" Smart TV", "url": null }
  ],
  "rating": 4.5,
  "reviewCount": 1285,
  "price": { "amount": 415000, "currency": "NGN", "formatted": "₦415,000" },
  "originalPrice": { "amount": 520000, "currency": "NGN", "formatted": "₦520,000" },
  "discountPercent": 19,
  "savings": { "amount": 105000, "currency": "NGN", "formatted": "₦105,000" },
  "inventoryStatus": "in_stock",
  "badge": "Best Seller",
  "gallery": [
    { "id": "img1", "url": "https://...", "alt": "Front view" }
  ],
  "variantAxes": [
    {
      "name": "colour",
      "displayName": "Colour",
      "options": [
        { "id": "black", "label": "Black", "swatchHex": "#111111" }
      ]
    }
  ],
  "variants": [
    {
      "id": "var_001",
      "sku": "6945056-BLK",
      "attributes": { "colour": "black" },
      "price": { "amount": 415000, "currency": "NGN", "formatted": "₦415,000" },
      "stockQty": 23,
      "isInStock": true,
      "images": ["https://..."]
    }
  ],
  "defaultVariantId": "var_001",
  "selectedVariantId": "var_001",
  "descriptionHtml": "<p>Full product description HTML</p>",
  "tabs": [
    { "label": "Description", "contentHtml": "<p>...</p>" },
    { "label": "How to Use", "contentHtml": "<ol><li>...</li></ol>" }
  ],
  "specifications": [
    { "name": "Screen Size", "value": "50 inch" },
    { "name": "Resolution", "value": "4K UHD" }
  ],
  "store": {
    "id": "...",
    "name": "Steppers Store NG",
    "isVerified": true,
    "responseRatePercent": 98,
    "rating": 4.9,
    "joinedYear": 2022
  }
}
```

**Errors:**
- `404` — product not found

---

### `GET /products/:productId/related`
**Headers:** none

**Query Params:**
- `limit` (number, default `8`, max `20`)

**Success 200:**
```json
{ "items": [ /* same shape as product listing items */ ] }
```

---

### `GET /products/:productId/reviews`
**Headers:** none

**Query Params:**
- `sort` (`most_recent | highest_rating | lowest_rating | most_helpful`, default `most_recent`)
- `page` (default `1`)
- `limit` (default `10`)

**Success 200:**
```json
{
  "summary": {
    "averageRating": 4.5,
    "totalReviews": 1285,
    "breakdown": { "5": 800, "4": 320, "3": 100, "2": 40, "1": 25 }
  },
  "items": [
    {
      "id": "...",
      "rating": 5,
      "title": "Excellent quality",
      "comment": "Great picture and sound.",
      "reviewerName": "A. James",
      "createdAt": "2026-03-02T10:00:00.000Z",
      "isVerifiedPurchase": true
    }
  ],
  "pagination": {
    "page": 1, "limit": 10, "totalItems": 1285, "totalPages": 129,
    "hasNextPage": true, "hasPrevPage": false
  }
}
```

---

### `POST /products` — SELLER | ADMIN
**Headers:** `Authorization: Bearer {{accessToken}}`, `Content-Type: application/json`

**Body:**
```json
{
  "name": "Sony WH-1000XM5 Headphones",
  "brand": "Sony",
  "sku": "SONYWH1000XM5",
  "storeId": "{{storeId}}",
  "categoryId": "{{categoryId}}",
  "subCategoryId": "{{subCategoryId}}",
  "thumbnailUrl": "https://res.cloudinary.com/...",
  "priceAmount": 285000,
  "originalPriceAmount": 320000,
  "gallery": [
    { "id": "img1", "url": "https://...", "alt": "Front view" }
  ],
  "variantAxes": [
    {
      "name": "colour",
      "displayName": "Colour",
      "options": [
        { "id": "black", "label": "Black", "swatchHex": "#111111" }
      ]
    }
  ],
  "variants": [
    {
      "id": "var_001",
      "sku": "SONYWH5-BLK",
      "attributes": { "colour": "black" },
      "priceAmount": 285000,
      "stockQty": 15,
      "isInStock": true,
      "images": ["https://..."]
    }
  ],
  "defaultVariantId": "var_001",
  "descriptionHtml": "<p>Industry-leading noise cancellation...</p>",
  "tabs": [
    { "label": "Description", "contentHtml": "<p>...</p>" }
  ],
  "specifications": [
    { "name": "Driver Size", "value": "30mm" }
  ],
  "breadcrumbs": [
    { "label": "Home", "url": "/" },
    { "label": "Electronics", "url": "/products?category=electronics" }
  ],
  "badge": "New",
  "sections": ["new_arrivals", "recommended"],
  "inventoryStatus": "in_stock",
  "isActive": true
}
```

**Success 201:** Product card shape (see `GET /products` items)

**Errors:**
- `400` — validation error
- `401` — unauthenticated
- `403` — wrong account type

---

### `PATCH /products/:id` — SELLER (own) | ADMIN
**Headers:** `Authorization: Bearer {{accessToken}}`, `Content-Type: application/json`

**Body:** any subset of the `POST /products` body fields

**Success 200:** Updated product card

**Errors:**
- `403` — seller doesn't own this product
- `404` — product not found

---

### `DELETE /products/:id` — SELLER (own) | ADMIN
**Headers:** `Authorization: Bearer {{accessToken}}`

**Success 204:** No content

**Errors:**
- `403` — seller doesn't own this product
- `404` — product not found

---

## 6. STORES

### `GET /stores/:storeId/summary`
**Headers:** none

**Success 200:**
```json
{
  "id": "...",
  "name": "Steppers Store NG",
  "isVerified": true,
  "responseRatePercent": 98,
  "averageRating": 4.9,
  "joinedYear": 2022,
  "reviewCount": 4200,
  "logoUrl": "https://...",
  "storeUrl": "/stores/steppers-store-ng"
}
```

**Errors:**
- `404` — store not found

---

### `POST /stores` — SELLER only
**Headers:** `Authorization: Bearer {{accessToken}}`, `Content-Type: application/json`

**Body:**
```json
{
  "name": "My Store",
  "logoUrl": "https://res.cloudinary.com/...",
  "location": "Ikeja, Lagos",
  "deliveryTimeRange": "30-60 min"
}
```

**Success 201:**
```json
{
  "id": "...",
  "name": "My Store",
  "slug": "my-store-abc123",
  "logoUrl": "https://...",
  "location": "Ikeja, Lagos",
  "deliveryTimeRange": "30-60 min",
  "isVerified": false,
  "responseRatePercent": 0,
  "averageRating": 0,
  "reviewCount": 0,
  "storeUrl": "/stores/my-store-abc123"
}
```

**Errors:**
- `409` — seller already has a store

---

### `GET /stores/my` — SELLER only
**Headers:** `Authorization: Bearer {{accessToken}}`

**Success 200:** Same shape as `POST /stores` response

**Errors:**
- `404` — store not yet created

---

### `PATCH /stores/my` — SELLER only
**Headers:** `Authorization: Bearer {{accessToken}}`, `Content-Type: application/json`

**Body:** any subset of `POST /stores` body fields

**Success 200:** Updated store object

---

## 7. SHIPPING

### `GET /shipping/estimate`
**Headers:** none

**Query Params:**
- `productId` (required)
- `variantId` (optional)
- `city` (required) — e.g. `lagos`, `abuja`

**Success 200:**
```json
{
  "city": "lagos",
  "sameCityDelivery": "2-4 working days",
  "otherCitiesDelivery": "5-7 working days",
  "freeShippingThreshold": { "amount": 150000, "currency": "NGN", "formatted": "₦150,000" },
  "estimatedShippingCost": { "amount": 0, "currency": "NGN", "formatted": "₦0" }
}
```

---

## 8. POLICIES

### `GET /policies/products/:productId`
**Headers:** none

**Success 200:**
```json
{
  "returnPolicy": {
    "title": "Return Policy",
    "summary": "Free return within 7 days for eligible items",
    "detailsUrl": "/policies/returns"
  },
  "warrantyPolicy": {
    "title": "Warranty",
    "summary": "1 year manufacturer warranty",
    "detailsUrl": null
  }
}
```

---

## 9. CART

### `GET /cart`
**Headers:** `Authorization: Bearer {{accessToken}}`

**Success 200:**
```json
{
  "id": "...",
  "currency": "NGN",
  "items": [
    {
      "itemId": "...",
      "productId": "...",
      "variantId": "var_001",
      "name": "Hisense 50\" Smart TV",
      "thumbnailUrl": "https://...",
      "price": { "amount": 415000, "currency": "NGN", "formatted": "₦415,000" },
      "quantity": 1,
      "stockQty": 23,
      "lineTotal": { "amount": 415000, "currency": "NGN", "formatted": "₦415,000" }
    }
  ],
  "totals": {
    "subtotal": { "amount": 415000, "currency": "NGN", "formatted": "₦415,000" },
    "shipping": { "amount": 0, "currency": "NGN", "formatted": "₦0" },
    "discount": { "amount": 0, "currency": "NGN", "formatted": "₦0" },
    "grandTotal": { "amount": 415000, "currency": "NGN", "formatted": "₦415,000" }
  }
}
```

---

### `POST /cart/items`
**Headers:** `Authorization: Bearer {{accessToken}}`, `Content-Type: application/json`

**Body:**
```json
{ "productId": "...", "variantId": "var_001", "quantity": 1 }
```

**Success 201:** Updated cart (same as `GET /cart`)

**Errors:**
- `422` — out of stock
- `400` — invalid quantity

---

### `PATCH /cart/items/:itemId`
**Headers:** `Authorization: Bearer {{accessToken}}`, `Content-Type: application/json`

**Body:**
```json
{ "quantity": 2 }
```

**Success 200:** Updated cart

**Errors:**
- `404` — cart item not found

---

### `DELETE /cart/items/:itemId`
**Headers:** `Authorization: Bearer {{accessToken}}`

**Success 204:** No content

---

## 10. WISHLIST

### `GET /wishlist`
**Headers:** `Authorization: Bearer {{accessToken}}`

**Success 200:**
```json
{
  "items": [
    {
      "productId": "...",
      "addedAt": "2026-03-10T08:20:00.000Z",
      "product": { /* product card */ }
    }
  ]
}
```

---

### `POST /wishlist/:productId`
**Headers:** `Authorization: Bearer {{accessToken}}`

**Success 201:**
```json
{ "message": "Added to wishlist." }
```

**Errors:**
- `409` — already in wishlist

---

### `DELETE /wishlist/:productId`
**Headers:** `Authorization: Bearer {{accessToken}}`

**Success 204:** No content

---

## 11. NEWSLETTER

### `POST /newsletter/subscriptions`
**Headers:** `Content-Type: application/json`

**Body:**
```json
{ "email": "user@example.com" }
```

**Success 201:**
```json
{ "message": "Subscription successful." }
```

---

## 12. SITE CONFIG

### `GET /site-config`
**Headers:** none

**Success 200:**
```json
{
  "footer": {
    "aboutText": "...",
    "links": [
      { "label": "About Us", "url": "/about" },
      { "label": "Contact", "url": "/contact" }
    ]
  },
  "socialLinks": [
    { "platform": "instagram", "url": "https://instagram.com/cadnamart" }
  ],
  "contact": {
    "email": "support@cadnamart.com",
    "phone": "+2348012345678"
  }
}
```

---

## 13. UPLOAD

### `POST /upload` — SELLER | ADMIN
**Headers:** `Authorization: Bearer {{accessToken}}`, `Content-Type: multipart/form-data`

**Query Params:**
- `folder` (optional) — `products | stores | categories | general` (default `general`)

**Body (form-data):**
- Key: `file`, Type: File — JPEG / PNG / WebP / GIF, max 5 MB

**Success 201:**
```json
{
  "url": "https://res.cloudinary.com/your-cloud/image/upload/v.../cadna-mart/products/abc123.webp",
  "publicId": "cadna-mart/products/abc123"
}
```

**Errors:**
- `400` — file too large, wrong type, or storage not configured
- `401` / `403` — not authenticated or wrong account type

---

## 14. ADMIN — PRODUCTS

### `GET /admin/products` — ADMIN
**Headers:** `Authorization: Bearer {{accessToken}}`

**Query Params:** `page`, `limit`, `includeInactive` (boolean, default `true`)

**Success 200:**
```json
{
  "items": [ /* product cards */ ],
  "pagination": { "page": 1, "limit": 20, "totalItems": 150, "totalPages": 8 }
}
```

---

### `PATCH /admin/products/:id` — ADMIN
**Headers:** `Authorization: Bearer {{accessToken}}`, `Content-Type: application/json`

**Body:** any subset of `POST /products` fields

**Success 200:** Updated product card

---

### `PATCH /admin/products/:id/status` — ADMIN
**Headers:** `Authorization: Bearer {{accessToken}}`, `Content-Type: application/json`

**Body:**
```json
{ "isActive": false }
```

**Success 200:** Updated product

---

### `DELETE /admin/products/:id` — ADMIN
**Headers:** `Authorization: Bearer {{accessToken}}`

**Success 204:** No content

---

## 15. ADMIN — STORES

### `GET /admin/stores` — ADMIN
**Headers:** `Authorization: Bearer {{accessToken}}`

**Query Params:** `page` (default `1`), `limit` (default `20`)

**Success 200:**
```json
{
  "items": [ /* store documents */ ],
  "pagination": { "page": 1, "limit": 20, "totalItems": 30, "totalPages": 2 }
}
```

---

### `PATCH /admin/stores/:id` — ADMIN
**Headers:** `Authorization: Bearer {{accessToken}}`, `Content-Type: application/json`

**Body:**
```json
{ "name": "...", "logoUrl": "...", "location": "...", "deliveryTimeRange": "..." }
```

**Success 200:** Updated store

---

### `PATCH /admin/stores/:id/verify` — ADMIN
**Headers:** `Authorization: Bearer {{accessToken}}`, `Content-Type: application/json`

**Body:**
```json
{ "isVerified": true }
```

**Success 200:** Updated store

---

## 16. ADMIN — CATEGORIES

### `GET /admin/categories` — ADMIN
**Headers:** `Authorization: Bearer {{accessToken}}`

**Success 200:**
```json
{ "items": [ /* same as GET /categories */ ] }
```

---

### `POST /admin/categories` — ADMIN
**Headers:** `Authorization: Bearer {{accessToken}}`, `Content-Type: application/json`

**Body:**
```json
{
  "name": "Skincare",
  "slug": "skincare",
  "iconUrl": "https://...",
  "parentId": "{{parentCategoryId}}",
  "order": 3,
  "isActive": true
}
```

**Success 201:** Created category document

---

### `PATCH /admin/categories/:id` — ADMIN
**Headers:** `Authorization: Bearer {{accessToken}}`, `Content-Type: application/json`

**Body:** any subset of `POST /admin/categories` fields

**Success 200:** Updated category

---

### `DELETE /admin/categories/:id` — ADMIN
**Headers:** `Authorization: Bearer {{accessToken}}`

**Success 204:** No content

---

## 17. ADMIN — USERS

### `GET /users` — ADMIN
**Headers:** `Authorization: Bearer {{accessToken}}`

**Query Params:** `page`, `limit`

**Success 200:**
```json
{
  "items": [
    {
      "id": "...",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "accountType": "BUYER",
      "isEmailVerified": true,
      "createdAt": "2026-03-10T00:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "totalItems": 100, "totalPages": 5 }
}
```

---

### `POST /users` — ADMIN
**Headers:** `Authorization: Bearer {{accessToken}}`, `Content-Type: application/json`

**Body:**
```json
{
  "email": "seller@example.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "password": "TempPass123!",
  "accountType": "SELLER"
}
```

**Success 201:** Created user object

---

### `GET /users/:id` — JWT
**Headers:** `Authorization: Bearer {{accessToken}}`

**Success 200:** User object

---

### `PATCH /users/:id` — JWT
**Headers:** `Authorization: Bearer {{accessToken}}`, `Content-Type: application/json`

**Body:**
```json
{ "firstName": "Johnny", "phone": "+2348099999999" }
```

**Success 200:** Updated user

---

### `DELETE /users/:id` — ADMIN
**Headers:** `Authorization: Bearer {{accessToken}}`

**Success 204:** No content

---

## 18. HEALTH

### `GET /health`
**Headers:** none

**Success 200:**
```json
{ "status": "ok" }
```

---

### `GET /health/db`
**Headers:** none

**Success 200:**
```json
{ "status": "ok", "db": "connected" }
```

---

## 19. WEBHOOKS

### `POST /webhooks/clerk`
**Headers:**
- `svix-id: <event-id>`
- `svix-timestamp: <timestamp>`
- `svix-signature: <signature>`
- `Content-Type: application/json`

**Body:** Clerk webhook payload (user.created / user.updated / user.deleted)

**Success 200:**
```json
{ "received": true }
```

**Errors:**
- `400` — invalid Svix signature

---

## Common Error Responses

### 400 Validation Error
```json
{
  "success": false,
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [{ "field": "email", "message": "must be a valid email" }]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "statusCode": 403,
  "error": "Forbidden",
  "message": "You do not own this product"
}
```

### 404 Not Found
```json
{
  "success": false,
  "statusCode": 404,
  "error": "Not Found",
  "message": "Product not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "statusCode": 409,
  "error": "Conflict",
  "message": "You already have a store. A seller can only have one store."
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Try again later."
}
```
