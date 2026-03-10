# Cadna Mart Storefront API Contract

Version: `0.1-draft`  
Date: `2026-03-10`  
Scope: Homepage and Product Details Page (PDP) data + core user actions shown in the shared UI.

## 1. Base Conventions

### Base URL
`/api/v1`

### Auth
- Public endpoints: no token required.
- Personalized endpoints: `Authorization: Bearer <access_token>` required.
- Optional request tracing header: `x-correlation-id`.

### Standard Success Envelope
```json
{
  "success": true,
  "statusCode": 200,
  "data": {},
  "meta": {
    "timestamp": "2026-03-10T08:20:00.000Z",
    "correlationId": "c9f4d2cb-c4f5-4f84-a2df-6bca8b8b7f86"
  }
}
```

### Standard Error Envelope
```json
{
  "success": false,
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [],
  "meta": {
    "timestamp": "2026-03-10T08:20:00.000Z",
    "correlationId": "c9f4d2cb-c4f5-4f84-a2df-6bca8b8b7f86",
    "path": "/api/v1/products"
  }
}
```

### Common Types
```ts
type Money = {
  amount: number;          // minor units not used; amount is decimal-ready integer for NGN
  currency: "NGN";
  formatted: string;       // e.g. "NGN 415,000"
};

type Pagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};
```

## 2. UI-to-API Mapping

### Homepage sections
- Top nav categories: `GET /categories?tree=true`
- Hero carousel: `GET /home`
- Product grids (best deals, recommended, top sellers, new arrivals): `GET /home` and/or `GET /products?section=...`
- Flash sale campaign banner: `GET /home`
- Footer links + social + contact: `GET /site-config`
- Newsletter subscribe: `POST /newsletter/subscriptions`

### Product details page
- Product gallery/title/price/variants/stock: `GET /products/:slug`
- Delivery/return/warranty panel: `GET /policies/products/:productId` + `GET /shipping/estimate`
- Seller card: `GET /stores/:storeId/summary`
- Description/specifications tabs: `GET /products/:slug`
- Reviews tab: `GET /products/:productId/reviews`
- Add to cart: `POST /cart/items`
- Wishlist toggle: `POST /wishlist/:productId`, `DELETE /wishlist/:productId`

## 3. Endpoint Contract Matrix

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/home` | Optional | Composite homepage payload |
| GET | `/site-config` | No | Footer, contact, social, legal links |
| GET | `/categories` | No | Header/category navigation |
| GET | `/search/suggest` | No | Search suggestions/autocomplete |
| GET | `/products` | No | Listing/search/filter/pagination |
| GET | `/products/:slug` | No | PDP payload |
| GET | `/products/:productId/reviews` | No | Review list + summary |
| GET | `/products/:productId/related` | No | Related recommendations |
| GET | `/stores/:storeId/summary` | No | Seller card info |
| GET | `/shipping/estimate` | No | Delivery timing/cost by location |
| GET | `/policies/products/:productId` | No | Return and warranty policy |
| GET | `/cart` | Yes | Current user cart |
| POST | `/cart/items` | Yes | Add item to cart |
| PATCH | `/cart/items/:itemId` | Yes | Change quantity or variant |
| DELETE | `/cart/items/:itemId` | Yes | Remove cart item |
| GET | `/wishlist` | Yes | Wishlist items |
| POST | `/wishlist/:productId` | Yes | Add to wishlist |
| DELETE | `/wishlist/:productId` | Yes | Remove from wishlist |
| POST | `/newsletter/subscriptions` | No | Newsletter signup |

## 4. Detailed Contracts

### 4.1 `GET /home`

#### Query Params
- `location` (optional, string): e.g. `lagos`, `abuja` for localized banners.
- `limitPerSection` (optional, number, default `8`, max `20`).

#### `data` Shape
```json
{
  "heroBanners": [
    {
      "id": "bnr_hero_01",
      "title": "Shop Smarter.",
      "subtitle": "Delivered Faster.",
      "description": "Find top products at amazing prices",
      "imageUrl": "https://cdn.cadna.com/banners/hero-01.webp",
      "mobileImageUrl": "https://cdn.cadna.com/banners/hero-01-mobile.webp",
      "ctaLabel": "Shop Now",
      "ctaUrl": "/products?campaign=hero_01",
      "startAt": "2026-03-01T00:00:00.000Z",
      "endAt": "2026-03-31T23:59:59.000Z"
    }
  ],
  "sections": [
    {
      "key": "best_deals",
      "title": "Get the best deals",
      "viewAllUrl": "/products?section=best_deals",
      "products": []
    },
    {
      "key": "recommended",
      "title": "Recommended Products For You",
      "viewAllUrl": "/products?section=recommended",
      "products": []
    },
    {
      "key": "top_sellers",
      "title": "Featured Products From Our Top Sellers",
      "viewAllUrl": "/products?section=top_sellers",
      "products": []
    },
    {
      "key": "new_arrivals",
      "title": "New Arrivals",
      "viewAllUrl": "/products?section=new_arrivals",
      "products": []
    }
  ],
  "topCategories": [
    {
      "id": "cat_home_living",
      "name": "Home & Living",
      "slug": "home-living",
      "iconUrl": "https://cdn.cadna.com/categories/home-living.png",
      "productCount": 530
    }
  ],
  "campaignBanners": [
    {
      "id": "bnr_flash_01",
      "type": "flash_sale",
      "title": "Flash Sale",
      "subtitle": "Limited stocks",
      "imageUrl": "https://cdn.cadna.com/banners/flash-sale.webp",
      "ctaLabel": "Shop Deals",
      "ctaUrl": "/products?campaign=flash_sale",
      "discountLabel": "up to 30% off"
    }
  ],
  "growthCards": [
    {
      "id": "grow_sell_more",
      "title": "Sell More. Grow More.",
      "description": "Become a seller on Cadna Mart",
      "ctaLabel": "Get Started",
      "ctaUrl": "/sell"
    },
    {
      "id": "grow_partner",
      "title": "Partner with Cadna Mart",
      "description": "Join our partnership program",
      "ctaLabel": "Learn More",
      "ctaUrl": "/partner"
    }
  ]
}
```

### 4.2 `GET /categories`

#### Query Params
- `tree` (optional, boolean, default `false`)
- `includeCounts` (optional, boolean, default `false`)

#### `data` Shape
```json
{
  "items": [
    {
      "id": "cat_electronics",
      "name": "Electronics",
      "slug": "electronics",
      "iconUrl": "https://cdn.cadna.com/categories/electronics.svg",
      "productCount": 1200,
      "children": [
        {
          "id": "cat_tv_audio",
          "name": "TV & Audio",
          "slug": "tv-audio"
        }
      ]
    }
  ]
}
```

### 4.3 `GET /products`

#### Query Params
- `q` (string, optional)
- `section` (`best_deals|recommended|top_sellers|new_arrivals`, optional)
- `category` (slug, optional)
- `subCategory` (slug, optional)
- `brand` (string, optional)
- `minPrice` (number, optional)
- `maxPrice` (number, optional)
- `inStock` (boolean, optional)
- `ratingGte` (number, optional)
- `sort` (`relevance|price_asc|price_desc|newest|popular|discount`, optional)
- `page` (number, default `1`)
- `limit` (number, default `10`, max `100`)

#### `data` Shape
```json
{
  "items": [
    {
      "id": "prd_6945056",
      "slug": "hisense-50-smart-tv-50a4q",
      "name": "Hisense 50\" Smart TV 50A4Q",
      "brand": "Hisense",
      "thumbnailUrl": "https://cdn.cadna.com/products/6945056/cover.webp",
      "price": { "amount": 415000, "currency": "NGN", "formatted": "NGN 415,000" },
      "originalPrice": { "amount": 520000, "currency": "NGN", "formatted": "NGN 520,000" },
      "discountPercent": 19,
      "rating": 4.5,
      "reviewCount": 1285,
      "inventoryStatus": "in_stock",
      "badge": "Best Seller",
      "store": {
        "id": "str_steppers",
        "name": "Steppers Store NG",
        "isVerified": true
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

### 4.4 `GET /products/:slug`

#### Query Params
- `variantId` (optional): preselect specific variant.

#### `data` Shape
```json
{
  "id": "prd_6945056",
  "slug": "hisense-50-smart-tv-50a4q",
  "sku": "6945056",
  "name": "Hisense 50\" Smart TV 50A4Q",
  "brand": "Hisense",
  "breadcrumbs": [
    { "label": "Home", "url": "/" },
    { "label": "Category", "url": "/category/electronics" },
    { "label": "Sub Category", "url": "/category/electronics/tv-audio" },
    { "label": "Product", "url": null }
  ],
  "rating": 4.5,
  "reviewCount": 1285,
  "price": { "amount": 415000, "currency": "NGN", "formatted": "NGN 415,000" },
  "originalPrice": { "amount": 520000, "currency": "NGN", "formatted": "NGN 520,000" },
  "discountPercent": 19,
  "savings": { "amount": 105000, "currency": "NGN", "formatted": "NGN 105,000" },
  "gallery": [
    {
      "id": "img1",
      "url": "https://cdn.cadna.com/products/6945056/1.webp",
      "alt": "Hisense 50 inch TV front view"
    }
  ],
  "variantAxes": [
    {
      "name": "colour",
      "displayName": "Colour",
      "options": [
        { "id": "midnight-black", "label": "Midnight Black", "swatchHex": "#1f2d47" },
        { "id": "red", "label": "Red", "swatchHex": "#d93232" }
      ]
    },
    {
      "name": "size",
      "displayName": "Size",
      "options": [
        { "id": "s", "label": "S" },
        { "id": "m", "label": "M" },
        { "id": "l", "label": "L" }
      ]
    }
  ],
  "variants": [
    {
      "id": "var_001",
      "sku": "6945056-BLACK-S",
      "attributes": { "colour": "midnight-black", "size": "s" },
      "price": { "amount": 415000, "currency": "NGN", "formatted": "NGN 415,000" },
      "stockQty": 23,
      "isInStock": true,
      "images": ["https://cdn.cadna.com/products/6945056/1.webp"]
    }
  ],
  "defaultVariantId": "var_001",
  "selectedVariantId": "var_001",
  "descriptionHtml": "<p>...</p>",
  "specifications": [
    { "name": "Screen Size", "value": "50 inch" },
    { "name": "Resolution", "value": "4K UHD" }
  ],
  "store": {
    "id": "str_steppers",
    "name": "Steppers Store NG",
    "isVerified": true,
    "responseRatePercent": 98,
    "rating": 4.9,
    "joinedYear": 2026
  }
}
```

### 4.5 `GET /products/:productId/reviews`

#### Query Params
- `sort` (`most_recent|highest_rating|lowest_rating|most_helpful`, default `most_recent`)
- `page` (default `1`)
- `limit` (default `10`)

#### `data` Shape
```json
{
  "summary": {
    "averageRating": 4.5,
    "totalReviews": 1285,
    "breakdown": {
      "5": 800,
      "4": 320,
      "3": 100,
      "2": 40,
      "1": 25
    }
  },
  "items": [
    {
      "id": "rev_001",
      "rating": 5,
      "title": "Excellent quality",
      "comment": "Great picture and sound.",
      "reviewerName": "A. James",
      "createdAt": "2026-03-02T10:00:00.000Z",
      "isVerifiedPurchase": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 1285,
    "totalPages": 129,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### 4.6 `GET /products/:productId/related`

#### Query Params
- `limit` (default `8`, max `20`)

#### `data` Shape
```json
{
  "items": []
}
```

Response uses same product card model as `GET /products`.

### 4.7 `GET /stores/:storeId/summary`

#### `data` Shape
```json
{
  "id": "str_steppers",
  "name": "Steppers Store NG",
  "isVerified": true,
  "responseRatePercent": 98,
  "averageRating": 4.9,
  "joinedYear": 2026,
  "reviewCount": 4200,
  "logoUrl": "https://cdn.cadna.com/stores/steppers/logo.webp",
  "storeUrl": "/stores/steppers-store-ng"
}
```

### 4.8 `GET /shipping/estimate`

#### Query Params
- `productId` (required)
- `variantId` (optional)
- `city` (required)

#### `data` Shape
```json
{
  "city": "lagos",
  "sameCityDelivery": "2-4 working days",
  "otherCitiesDelivery": "5-7 working days",
  "freeShippingThreshold": { "amount": 150000, "currency": "NGN", "formatted": "NGN 150,000" },
  "estimatedShippingCost": { "amount": 0, "currency": "NGN", "formatted": "NGN 0" }
}
```

### 4.9 `GET /policies/products/:productId`

#### `data` Shape
```json
{
  "returnPolicy": {
    "title": "Return Policy",
    "summary": "Free return within 7 days for eligible items",
    "detailsUrl": "/policies/returns"
  },
  "warrantyPolicy": {
    "title": "Warranty",
    "summary": "Warranty information unavailable for this product",
    "detailsUrl": null
  }
}
```

### 4.10 Cart Endpoints

#### `GET /cart`
```json
{
  "id": "cart_001",
  "currency": "NGN",
  "items": [
    {
      "itemId": "cit_001",
      "productId": "prd_6945056",
      "variantId": "var_001",
      "name": "Hisense 50\" Smart TV 50A4Q",
      "thumbnailUrl": "https://cdn.cadna.com/products/6945056/cover.webp",
      "price": { "amount": 415000, "currency": "NGN", "formatted": "NGN 415,000" },
      "quantity": 1,
      "stockQty": 23,
      "lineTotal": { "amount": 415000, "currency": "NGN", "formatted": "NGN 415,000" }
    }
  ],
  "totals": {
    "subtotal": { "amount": 415000, "currency": "NGN", "formatted": "NGN 415,000" },
    "shipping": { "amount": 0, "currency": "NGN", "formatted": "NGN 0" },
    "discount": { "amount": 0, "currency": "NGN", "formatted": "NGN 0" },
    "grandTotal": { "amount": 415000, "currency": "NGN", "formatted": "NGN 415,000" }
  }
}
```

#### `POST /cart/items`
Request:
```json
{
  "productId": "prd_6945056",
  "variantId": "var_001",
  "quantity": 1
}
```

#### `PATCH /cart/items/:itemId`
Request:
```json
{
  "quantity": 2
}
```

### 4.11 Wishlist Endpoints

#### `GET /wishlist`
```json
{
  "items": [
    {
      "productId": "prd_6945056",
      "addedAt": "2026-03-10T08:20:00.000Z",
      "product": {}
    }
  ]
}
```

`product` uses same product card model as `GET /products`.

### 4.12 `POST /newsletter/subscriptions`

Request:
```json
{
  "email": "user@example.com"
}
```

Response:
```json
{
  "message": "Subscription successful"
}
```

## 5. Error Codes (Recommended)

Use stable `errorCode` strings for frontend handling:
- `PRODUCT_NOT_FOUND`
- `CATEGORY_NOT_FOUND`
- `VARIANT_NOT_FOUND`
- `OUT_OF_STOCK`
- `INVALID_QUANTITY`
- `CART_ITEM_NOT_FOUND`
- `WISHLIST_ITEM_EXISTS`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `VALIDATION_FAILED`

## 6. Implementation Priority

1. `GET /home`, `GET /categories`, `GET /products`, `GET /products/:slug`  
2. `GET /products/:productId/reviews`, `GET /shipping/estimate`, `GET /policies/products/:productId`, `GET /stores/:storeId/summary`  
3. Cart + wishlist endpoints  
4. Newsletter + search suggest + related products

## 7. Notes

- Keep response envelope consistent with existing global interceptor/filter behavior.
- Put pagination object inside `data.pagination` for list endpoints.
- For non-authenticated users, return generic recommendations for `recommended` sections.
- Store image URLs should point to CDN-ready absolute URLs.



