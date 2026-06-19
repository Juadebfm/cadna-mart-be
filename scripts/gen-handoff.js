#!/usr/bin/env node
/**
 * Generates docs/frontend-handoff.md — a complete BE→FE API handoff document.
 * Reads docs/openapi.json for endpoint metadata and uses inline response
 * examples for the most important routes.
 *
 * Run: node scripts/gen-handoff.js
 */
const fs = require('fs');
const path = require('path');

const spec = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/openapi.json'), 'utf-8'));
const schemas = (spec.components || {}).schemas || {};

// ── Tag order + display names ─────────────────────────────────────────────────
const GROUPS = [
  { tag: 'Authentication', emoji: '🔐' },
  { tag: 'Users', emoji: '👤' },
  { tag: 'Catalogue', emoji: '🛍️' },
  { tag: 'Commerce', emoji: '🛒' },
  { tag: 'Fulfilment', emoji: '📦' },
  { tag: 'Sellers', emoji: '🏪' },
  { tag: 'Suppliers', emoji: '🏭' },
  { tag: 'Support & Notifications', emoji: '🎧' },
  { tag: 'Partners & Rewards', emoji: '🤝' },
  { tag: 'Webhooks', emoji: '🔗' },
  { tag: 'System', emoji: '⚙️' },
];

// ── Response examples for critical endpoints ─────────────────────────────────
// key: "METHOD /path"
const RESPONSE_EXAMPLES = {
  'POST /auth/register/email': {
    status: 201,
    body: { sessionId: 'sess_01J2K3L4M5N6P7Q8R9S0T1U2V3' },
  },
  'POST /auth/register/details': {
    status: 201,
    body: { sessionId: 'sess_01J2K3L4M5N6P7Q8R9S0T1U2V3' },
  },
  'POST /auth/register/password': {
    status: 201,
    body: { message: 'Account created. Please verify your email.' },
  },
  'POST /auth/register/verify': {
    status: 200,
    body: { message: 'Email verified successfully' },
  },
  'POST /auth/login': {
    status: 200,
    body: {
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.<payload>.<sig>',
      refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.<payload>.<sig>',
      expiresIn: '15m',
      user: {
        id: '64a1f2e3b4c5d6e7f8a9b0c1',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'user@example.com',
        accountType: 'BUYER',
        isVerified: true,
        isTwoFactorEnabled: false,
      },
    },
  },
  'POST /auth/refresh': {
    status: 200,
    body: {
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.<payload>.<sig>',
      refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.<payload>.<sig>',
      expiresIn: '15m',
    },
  },
  'POST /auth/logout': { status: 200, body: { message: 'Logged out successfully' } },
  'POST /auth/forgot-password': {
    status: 200,
    body: { message: 'If an account exists, a reset code has been sent' },
  },
  'POST /auth/forgot-password/reset': {
    status: 200,
    body: { message: 'Password reset successfully' },
  },
  'GET /users/me': {
    status: 200,
    body: {
      id: '64a1f2e3b4c5d6e7f8a9b0c1',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'user@example.com',
      phoneNumber: '+2348012345678',
      accountType: 'BUYER',
      isVerified: true,
      isTwoFactorEnabled: false,
      createdAt: '2025-01-15T10:00:00.000Z',
    },
  },
  'GET /products': {
    status: 200,
    body: {
      items: [
        {
          id: '64a1f2e3b4c5d6e7f8a9b0c1',
          name: 'iPhone 15 Pro Max',
          slug: 'iphone-15-pro-max',
          priceKobo: 120000000,
          discountedPriceKobo: 115000000,
          imageUrl: 'https://cdn.cadnamart.com/products/iphone-15.jpg',
          rating: 4.8,
          reviewCount: 234,
          inStock: true,
          seller: { id: '64a1f2e3b4c5d6e7f8a9b0c3', name: 'TechStore NG', slug: 'techstore-ng' },
        },
      ],
      meta: { page: 1, limit: 20, totalItems: 142, totalPages: 8 },
    },
  },
  'GET /products/{idOrSlug}': {
    status: 200,
    body: {
      id: '64a1f2e3b4c5d6e7f8a9b0c1',
      name: 'iPhone 15 Pro Max',
      slug: 'iphone-15-pro-max',
      description: 'Latest Apple flagship with titanium frame.',
      priceKobo: 120000000,
      discountedPriceKobo: 115000000,
      images: ['https://cdn.cadnamart.com/products/iphone-15.jpg'],
      rating: 4.8,
      reviewCount: 234,
      inStock: true,
      variants: [
        { id: '64a1f2e3b4c5d6e7f8a9b0c4', name: '256GB Natural Titanium', priceKobo: 120000000, inStock: true },
        { id: '64a1f2e3b4c5d6e7f8a9b0c5', name: '512GB Black Titanium', priceKobo: 135000000, inStock: true },
      ],
      seller: { id: '64a1f2e3b4c5d6e7f8a9b0c3', name: 'TechStore NG', slug: 'techstore-ng' },
      returnPolicy: { windowDays: 7, conditions: 'Unopened original packaging' },
    },
  },
  'POST /cart': {
    status: 201,
    body: {
      id: '64a1f2e3b4c5d6e7f8a9b0d1',
      guestToken: 'guest_01J2K3L4M5N6P7Q8R9S0T1U2V3',
    },
    note: '`guestToken` is only present for unauthenticated users. Store it in localStorage and send it as `x-guest-token` on every subsequent cart request.',
  },
  'GET /cart/{cartId}': {
    status: 200,
    body: {
      id: '64a1f2e3b4c5d6e7f8a9b0d1',
      items: [
        {
          id: '64a1f2e3b4c5d6e7f8a9b0d2',
          productId: '64a1f2e3b4c5d6e7f8a9b0c1',
          variantId: '64a1f2e3b4c5d6e7f8a9b0c4',
          name: 'iPhone 15 Pro Max — 256GB Natural Titanium',
          imageUrl: 'https://cdn.cadnamart.com/products/iphone-15.jpg',
          priceKobo: 120000000,
          quantity: 1,
          subtotalKobo: 120000000,
          inStock: true,
        },
      ],
      itemCount: 1,
      subtotalKobo: 120000000,
    },
  },
  'GET /cart/{cartId}/totals': {
    status: 200,
    body: {
      subtotalKobo: 120000000,
      deliveryFeeKobo: 150000,
      serviceFeeKobo: 50000,
      discountKobo: 0,
      totalKobo: 120200000,
      currency: 'NGN',
    },
  },
  'POST /checkout/session': {
    status: 201,
    body: {
      sessionId: 'chk_01J2K3L4M5N6P7Q8R9S0T1U2V3',
      cartId: '64a1f2e3b4c5d6e7f8a9b0d1',
      expiresAt: '2025-01-15T11:00:00.000Z',
    },
  },
  'GET /checkout/{sessionId}/summary': {
    status: 200,
    body: {
      sessionId: 'chk_01J2K3L4M5N6P7Q8R9S0T1U2V3',
      items: [{ name: 'iPhone 15 Pro Max', quantity: 1, priceKobo: 120000000 }],
      pricing: {
        subtotalKobo: 120000000,
        deliveryFeeKobo: 150000,
        serviceFeeKobo: 50000,
        totalKobo: 120200000,
      },
      deliveryAddress: { fullName: 'Jane Doe', street: '12 Marina Road', city: 'Lagos', state: 'Lagos' },
    },
  },
  'POST /checkout/{sessionId}/confirm': {
    status: 201,
    body: {
      orderId: '64a1f2e3b4c5d6e7f8a9b0e1',
      orderRef: 'CM-20250115-A1B2C3',
      status: 'pending_payment',
      paymentMethod: 'paystack',
      paymentUrl: 'https://checkout.paystack.com/pay/abc123def456',
      totalKobo: 120200000,
    },
    note: 'Redirect the user to `paymentUrl` to complete payment on Paystack. After payment, Paystack calls the webhook and the order status updates automatically.',
  },
  'GET /orders': {
    status: 200,
    body: {
      items: [
        {
          id: '64a1f2e3b4c5d6e7f8a9b0e1',
          orderRef: 'CM-20250115-A1B2C3',
          status: 'delivered',
          paymentStatus: 'paid',
          totalKobo: 120200000,
          itemCount: 1,
          createdAt: '2025-01-15T10:00:00.000Z',
        },
      ],
      meta: { page: 1, limit: 20, totalItems: 5, totalPages: 1 },
    },
  },
  'GET /orders/{id}': {
    status: 200,
    body: {
      id: '64a1f2e3b4c5d6e7f8a9b0e1',
      orderRef: 'CM-20250115-A1B2C3',
      items: [
        {
          productId: '64a1f2e3b4c5d6e7f8a9b0c1',
          name: 'iPhone 15 Pro Max — 256GB Natural Titanium',
          quantity: 1,
          unitPriceKobo: 120000000,
          subtotalKobo: 120000000,
        },
      ],
      deliveryAddress: { fullName: 'Jane Doe', street: '12 Marina Road', city: 'Lagos', state: 'Lagos' },
      pricing: { subtotalKobo: 120000000, deliveryFeeKobo: 150000, totalKobo: 120200000 },
      status: 'delivered',
      paymentStatus: 'paid',
      timeline: [
        { status: 'pending_payment', timestamp: '2025-01-15T10:00:00.000Z' },
        { status: 'paid', timestamp: '2025-01-15T10:05:00.000Z' },
        { status: 'delivered', timestamp: '2025-01-16T14:30:00.000Z' },
      ],
      createdAt: '2025-01-15T10:00:00.000Z',
    },
  },
  'GET /wallet': {
    status: 200,
    body: { id: '64a1f2e3b4c5d6e7f8a9b0f1', balanceKobo: 500000, tier: 'standard', currency: 'NGN' },
  },
  'GET /rewards/me': {
    status: 200,
    body: { totalPoints: 2500, cashbackKobo: 75000, tier: 'silver', isAffiliate: false },
  },
  'GET /rewards/tiers': {
    status: 200,
    body: {
      tiers: [
        { name: 'Bronze', minPoints: 0, maxPoints: 999, cashbackRate: 0.01 },
        { name: 'Silver', minPoints: 1000, maxPoints: 4999, cashbackRate: 0.02 },
        { name: 'Gold', minPoints: 5000, maxPoints: null, cashbackRate: 0.03 },
      ],
    },
  },
};

// ── Schema resolution (for request body samples) ─────────────────────────────
function resolveRef(ref) {
  return schemas[ref.replace('#/components/schemas/', '')] || null;
}

function sampleForSchema(schema, depth) {
  if (!schema || depth > 4) return null;
  if (schema.$ref) return sampleForSchema(resolveRef(schema.$ref), depth + 1);
  if (schema.example !== undefined) return schema.example;
  if (schema.allOf) {
    const m = {};
    for (const s of schema.allOf) Object.assign(m, sampleForSchema(s, depth + 1) || {});
    return m;
  }
  if (schema.oneOf || schema.anyOf)
    return sampleForSchema((schema.oneOf || schema.anyOf)[0], depth + 1);
  if (schema.type === 'array') return schema.items ? [sampleForSchema(schema.items, depth + 1)] : [];
  if (schema.type === 'object' || schema.properties) {
    const obj = {};
    for (const [k, v] of Object.entries(schema.properties || {})) {
      obj[k] = v.example !== undefined ? v.example : sampleScalar(v, k);
    }
    return obj;
  }
  return sampleScalar(schema, '');
}

function sampleScalar(prop, key) {
  if (prop.example !== undefined) return prop.example;
  if (prop.enum?.length) return prop.enum[0];
  const k = key.toLowerCase();
  const t = prop.type;
  if (t === 'boolean') return false;
  if (t === 'integer' || t === 'number') return k.includes('kobo') ? 100000 : 0;
  if (t === 'string') {
    if (k.includes('email')) return 'user@example.com';
    if (k.includes('password')) return 'Password123!';
    if (k.includes('phone')) return '+2348012345678';
    if (k.includes('firstname')) return 'John';
    if (k.includes('lastname')) return 'Doe';
    if (k.includes('token')) return 'sample-token';
    if (k.includes('id')) return '64a1f2e3b4c5d6e7f8a9b0c1';
    return '';
  }
  return null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function json(obj) {
  return '```json\n' + JSON.stringify(obj, null, 2) + '\n```';
}

function envelope(statusCode, data) {
  return {
    success: true,
    statusCode,
    data,
    message: 'Request successful',
    meta: {
      correlationId: 'req-00000000-0000-0000-0000-000000000000',
      timestamp: '2025-01-15T10:00:00.000Z',
    },
  };
}

function methodBadge(m) {
  return `\`${m.toUpperCase()}\``;
}

function authLabel(op) {
  const security = op.security;
  if (security && security.length === 0) return 'Public';
  const tags = op.tags || [];
  if (tags.includes('Admin')) return '🔒 Admin JWT';
  if (tags.includes('Sellers') || tags.includes('Webhooks')) return '🔒 Seller JWT';
  return '🔒 Bearer JWT';
}

// ── Collect endpoints per tag ─────────────────────────────────────────────────
const byTag = {};
for (const g of GROUPS) byTag[g.tag] = [];

for (const [rawPath, pathItem] of Object.entries(spec.paths || {})) {
  for (const [method, op] of Object.entries(pathItem)) {
    if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
    const tag = (op.tags || ['System'])[0];
    if (!byTag[tag]) byTag[tag] = [];
    byTag[tag].push({ method, path: rawPath, op });
  }
}

// ── Document builder ──────────────────────────────────────────────────────────
const lines = [];

const push = (...args) => lines.push(...args);
const hr = () => push('---', '');

push(
  '# Cadna Mart — Backend API Handoff',
  '',
  '> **Version:** 1.0 · **Generated:** 2025-01-15 · **Environment:** Production + Local',
  '',
  'This document is the single source of truth for the Cadna Mart REST API.',
  'Import `docs/cadna-mart.postman_collection.json` into Postman to get all endpoints',
  'pre-loaded with sample request bodies and response examples.',
  '',
);

hr();

// ── 1. Base URLs ──────────────────────────────────────────────────────────────
push(
  '## 1. Base URLs',
  '',
  '| Environment | Base URL |',
  '|---|---|',
  '| **Production** | `https://cadna-mart-be-nsz2.onrender.com/api/v1` |',
  '| **Local dev** | `http://localhost:3000/api/v1` |',
  '',
  '> All paths in this document are **relative to the base URL**.',
  '> Example: `POST /auth/login` → `POST https://cadna-mart-be-nsz2.onrender.com/api/v1/auth/login`',
  '',
);

hr();

// ── 2. Authentication ─────────────────────────────────────────────────────────
push(
  '## 2. Authentication',
  '',
  'The API uses **JWT Bearer tokens**. Every protected endpoint requires:',
  '',
  '```',
  'Authorization: Bearer <accessToken>',
  '```',
  '',
  '### Token lifecycle',
  '',
  '| Token | Expiry | How to get |',
  '|---|---|---|',
  '| `accessToken` | **15 minutes** | `POST /auth/login` or `POST /auth/otp/verify` |',
  '| `refreshToken` | **7 days** | Same response as `accessToken` |',
  '',
  '### Refreshing a token',
  '',
  'When the `accessToken` expires you will receive a `401 Unauthorized`. Call:',
  '',
  '```',
  'POST /auth/refresh',
  'Content-Type: application/json',
  '',
  '{ "refreshToken": "<your refreshToken>" }',
  '```',
  '',
  'You receive a new `accessToken` + `refreshToken` pair. Update both in storage.',
  '',
  '### Guest users (cart)',
  '',
  'Unauthenticated users can still use the cart. `POST /cart` returns a `guestToken`.',
  'Send it on every subsequent cart request as:',
  '',
  '```',
  'x-guest-token: <guestToken>',
  '```',
  '',
  'When the user logs in, call `POST /cart/{cartId}/merge` to merge the guest cart.',
  '',
);

hr();

// ── 3. Response envelope ──────────────────────────────────────────────────────
push(
  '## 3. Response Envelope',
  '',
  'Every response — success or error — is wrapped in a consistent envelope.',
  '',
  '### Success',
  '',
  json({
    success: true,
    statusCode: 200,
    data: { '...': '— the actual payload described per endpoint below' },
    message: 'Request successful',
    meta: {
      correlationId: 'req-550e8400-e29b-41d4-a716-446655440000',
      timestamp: '2025-01-15T10:00:00.000Z',
    },
  }),
  '',
  '### Error',
  '',
  json({
    success: false,
    statusCode: 400,
    message: 'Validation failed',
    errorCode: 'BAD_REQUEST',
    path: '/auth/login',
    correlationId: 'req-550e8400-e29b-41d4-a716-446655440000',
  }),
  '',
  '### Common HTTP status codes',
  '',
  '| Code | Meaning |',
  '|---|---|',
  '| `200` | OK |',
  '| `201` | Created |',
  '| `400` | Validation error — check `message` for field details |',
  '| `401` | Missing or expired token — refresh or re-login |',
  '| `403` | Authenticated but not allowed (wrong account type) |',
  '| `404` | Resource not found |',
  '| `409` | Conflict (duplicate email, already exists, etc.) |',
  '| `422` | Business rule violation (insufficient balance, out of stock, etc.) |',
  '| `429` | Rate limited |',
  '| `500` | Internal server error — report with `correlationId` |',
  '',
);

hr();

// ── 4. Money / amounts ────────────────────────────────────────────────────────
push(
  '## 4. Money & Amounts',
  '',
  'All monetary values are in **Kobo** (Nigerian smallest unit, 1 NGN = 100 Kobo).',
  '',
  '| Field name pattern | Value | Display as |',
  '|---|---|---|',
  '| `priceKobo: 120000000` | 120,000,000 kobo | ₦1,200,000.00 |',
  '| `deliveryFeeKobo: 150000` | 150,000 kobo | ₦1,500.00 |',
  '| `balanceKobo: 500000` | 500,000 kobo | ₦5,000.00 |',
  '',
  '```js',
  '// Convert for display',
  'const naira = koboAmount / 100;',
  "const formatted = '₦' + naira.toLocaleString('en-NG', { minimumFractionDigits: 2 });",
  '```',
  '',
);

hr();

// ── 5. Pagination ─────────────────────────────────────────────────────────────
push(
  '## 5. Pagination',
  '',
  'List endpoints accept `page` (default `1`) and `limit` (default `20`) query params.',
  'The `data` payload for paginated responses looks like:',
  '',
  json({
    items: ['...'],
    meta: { page: 1, limit: 20, totalItems: 142, totalPages: 8 },
  }),
  '',
);

hr();

// ── 6. Endpoint groups ────────────────────────────────────────────────────────
push('## 6. Endpoints', '');

for (const { tag, emoji } of GROUPS) {
  const endpoints = byTag[tag] || [];
  if (!endpoints.length) continue;

  push(`### ${emoji} ${tag}`, '');

  // Summary table
  push('| Method | Path | Auth | Description |', '|---|---|---|---|');
  for (const { method, path: p, op } of endpoints) {
    const desc = (op.summary || '').replace(/\|/g, '\\|');
    const auth = authLabel(op);
    push(`| ${methodBadge(method)} | \`${p}\` | ${auth} | ${desc} |`);
  }
  push('');

  // Detailed examples for endpoints that have response/request overrides
  const detailed = endpoints.filter(
    ({ method, path: p }) => RESPONSE_EXAMPLES[`${method.toUpperCase()} ${p}`],
  );

  for (const { method, path: p, op } of detailed) {
    const key = `${method.toUpperCase()} ${p}`;
    const ex = RESPONSE_EXAMPLES[key];
    push(`#### \`${method.toUpperCase()} ${p}\``, '');

    if (op.summary) push(`**${op.summary}**`, '');
    if (op.description && op.description !== op.summary) {
      const shortDesc = op.description.split('\n')[0];
      push(shortDesc, '');
    }

    // Auth
    const isPublic = op.security && op.security.length === 0;
    push(`**Auth:** ${isPublic ? 'None (public)' : 'Bearer JWT required'}`, '');

    // Request body
    const rb = op.requestBody;
    if (rb) {
      const jsonContent = (rb.content || {})['application/json'];
      if (jsonContent?.schema) {
        const sample = sampleForSchema(jsonContent.schema, 0);
        if (sample && Object.keys(sample).length > 0) {
          push('**Request body:**', '', json(sample), '');
        }
      }
    }

    // Path params
    const pathParams = (op.parameters || []).filter((p) => p.in === 'path');
    if (pathParams.length) {
      push('**Path parameters:**', '');
      push('| Param | Description |', '|---|---|');
      for (const param of pathParams) {
        push(`| \`${param.name}\` | ${param.description || ''} |`);
      }
      push('');
    }

    // Query params (only required ones in detail view)
    const requiredQuery = (op.parameters || []).filter((p) => p.in === 'query' && p.required);
    const optionalQuery = (op.parameters || []).filter((p) => p.in === 'query' && !p.required);
    if (requiredQuery.length || optionalQuery.length) {
      push('**Query parameters:**', '');
      push('| Param | Required | Default | Description |', '|---|---|---|---|');
      for (const param of [...requiredQuery, ...optionalQuery]) {
        const req = param.required ? '✅' : '—';
        const def = param.schema?.default !== undefined ? `\`${param.schema.default}\`` : '—';
        push(`| \`${param.name}\` | ${req} | ${def} | ${param.description || ''} |`);
      }
      push('');
    }

    // Success response
    push(`**Success response \`${ex.status}\`:**`, '');
    push(json(envelope(ex.status, ex.body)), '');

    if (ex.note) {
      push(`> **Note:** ${ex.note}`, '');
    }
  }
}

hr();

// ── 7. Auth flows (step by step) ─────────────────────────────────────────────
push(
  '## 7. Key Flows',
  '',
  '### Buyer registration',
  '',
  '```',
  'POST /auth/register/email        → { sessionId }',
  'POST /auth/register/details      → { sessionId }   (firstName, lastName, phone, dob)',
  'POST /auth/register/password     → { message }      (password + confirmPassword)',
  'POST /auth/register/verify       → { message }      (email + OTP code from email)',
  '→ User can now log in',
  '```',
  '',
  '### Seller registration',
  '',
  '```',
  'POST /auth/register/seller/email    → { sessionId }',
  'POST /auth/register/seller/profile  → { sessionId }   (business details)',
  'POST /auth/register/seller/password → { message }',
  'POST /auth/register/seller/verify   → { message }',
  '→ Seller account pending admin approval',
  '```',
  '',
  '### Login',
  '',
  '```',
  'POST /auth/login                 → { accessToken, refreshToken, expiresIn, user }',
  '— or OTP login:',
  'POST /auth/otp/request           → { message }',
  'POST /auth/otp/verify            → { purpose, tokens: { accessToken, refreshToken }, user }',
  '```',
  '',
  '### Password reset',
  '',
  '```',
  'POST /auth/forgot-password       → { message }',
  'POST /auth/forgot-password/verify→ { resetToken }',
  'POST /auth/forgot-password/reset → { message }',
  '```',
  '',
  '### Guest checkout (no account)',
  '',
  '```',
  'POST /cart                       → { id, guestToken }   ← store guestToken',
  'POST /cart/{id}/items            → add products (send x-guest-token header)',
  'GET  /cart/{id}/totals           → { subtotalKobo, deliveryFeeKobo, totalKobo }',
  'POST /checkout/session           → { sessionId }',
  'POST /checkout/{sessionId}/address',
  'POST /checkout/{sessionId}/delivery',
  'GET  /checkout/{sessionId}/summary',
  'POST /checkout/{sessionId}/confirm → { orderId, paymentUrl }',
  '→ Redirect user to paymentUrl',
  '```',
  '',
  '### Authenticated checkout',
  '',
  '```',
  'GET  /cart                       → existing cart (or POST /cart to create)',
  'POST /cart/items                 → { productId, variantId?, quantity }',
  'POST /checkout/session           → { sessionId }',
  'POST /checkout/{sessionId}/address',
  'POST /checkout/{sessionId}/delivery',
  'POST /checkout/{sessionId}/confirm → { orderId, paymentUrl }',
  '→ Redirect to paymentUrl; order status updates via Paystack webhook',
  '```',
  '',
);

hr();

// ── 8. Deferred / stub endpoints ─────────────────────────────────────────────
push(
  '## 8. Deferred / Stub Endpoints',
  '',
  'The following endpoints exist and return a structured response, but the',
  'underlying integration is deferred to a future release. They will not error —',
  'they return the response shape with a `note` field explaining the deferral.',
  '',
  '| Endpoint group | Deferred work |',
  '|---|---|',
  '| `POST /payments/stripe/*` | Stripe integration (international payments decision pending) |',
  '| `POST /wallet/topup/initialize` | Paystack topup initiation |',
  '| `POST /wallet/transfer` | Wallet-to-wallet transfers |',
  '| `GET /partners/me/eligible-items` | AI-powered inventory scoring |',
  '| `GET /partners/me/settlements` | Partner reconciliation engine |',
  '| `GET /affiliates/me/earnings` | Affiliate analytics pipeline |',
  '| `POST /affiliates/me/payout` | Paystack Connect affiliate payouts |',
  '| `POST /logistics/book` | Logistics provider API integration |',
  '',
);

hr();

// ── 9. Order statuses ─────────────────────────────────────────────────────────
push(
  '## 9. Reference: Order Statuses',
  '',
  '| Status | Meaning |',
  '|---|---|',
  '| `pending_payment` | Order created, awaiting payment |',
  '| `paid` | Payment confirmed by Paystack webhook |',
  '| `processing` | Seller acknowledged, preparing shipment |',
  '| `dispatched` | Seller marked as dispatched |',
  '| `in_transit` | With logistics provider |',
  '| `delivered` | Delivery confirmed |',
  '| `cancelled` | Cancelled by buyer or admin |',
  '| `refund_pending` | Refund approved, awaiting Paystack transfer |',
  '| `refunded` | Refund completed |',
  '',
);

hr();

// ── 10. Account types ─────────────────────────────────────────────────────────
push(
  '## 10. Reference: Account Types',
  '',
  '| `accountType` | Access level |',
  '|---|---|',
  '| `BUYER` | Standard shopper — can browse, cart, checkout, manage own orders |',
  '| `SELLER` | Manages products, sees own order queue |',
  '| `SUPPLIER` | Bulk supplier view, can mark orders ready/dispatched |',
  '| `ADMIN` | Full access including all admin endpoints |',
  '',
);

hr();

push(
  '## 11. Postman Setup',
  '',
  '1. Open Postman → **Import** → select `docs/cadna-mart.postman_collection.json`',
  '2. Import `docs/cadna-mart-local.postman_environment.json` for local testing',
  '3. Import `docs/cadna-mart-live.postman_environment.json` for production',
  '4. Select the environment from the top-right dropdown',
  '5. After login, copy the `accessToken` from the response and set `{{authToken}}` in your environment',
  '',
  'All request bodies and success responses are pre-filled.',
  '',
);

hr();

push(
  '_This document is auto-generated from `docs/openapi.json`._',
  '_To regenerate: `npm run postman:gen && node scripts/gen-handoff.js`_',
  '',
);

// ── Write output ──────────────────────────────────────────────────────────────
const outPath = path.join(__dirname, '../docs/frontend-handoff.md');
fs.writeFileSync(outPath, lines.join('\n'));

const words = lines.join(' ').split(/\s+/).length;
console.log(`\n✅  Handoff doc → ${outPath}`);
console.log(`   ~${words.toLocaleString()} words, ${lines.length.toLocaleString()} lines`);
console.log(`   ${Object.keys(RESPONSE_EXAMPLES).length} endpoints with full request+response examples`);
