#!/usr/bin/env node
/**
 * Generates docs/cadna-mart.postman_collection.json from docs/openapi.json.
 * - 12 flat tag-based folders (no path-segment nesting)
 * - Request bodies with real field values resolved from $ref schemas
 * - Success response examples wrapped in the global response envelope
 *
 * Run: node scripts/gen-postman.js
 */
const fs = require('fs');
const path = require('path');

const spec = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/openapi.json'), 'utf-8'));
const schemas = (spec.components || {}).schemas || {};

const TAG_ORDER = [
  'Authentication',
  'Users',
  'Catalogue',
  'Commerce',
  'Fulfilment',
  'Sellers',
  'Suppliers',
  'Support & Notifications',
  'Partners & Rewards',
  'Admin',
  'Webhooks',
  'System',
];

const folders = {};
for (const tag of TAG_ORDER) folders[tag] = [];

// ── Hardcoded response overrides for high-priority endpoints ─────────────────
// Key: "<METHOD> <path>" — path matches the stripped key from openapi.json.
// Value: the object that goes into `data` inside the global envelope.
// These fill the gap for controllers that don't have @ApiResponse decorators.
const RESPONSE_OVERRIDES = {
  // ── Authentication ──────────────────────────────────────────────────────────
  'POST /auth/register/email': {
    status: 201,
    data: { sessionId: 'sess_01J2K3L4M5N6P7Q8R9S0T1U2V3' },
  },
  'POST /auth/register/details': {
    status: 201,
    data: { sessionId: 'sess_01J2K3L4M5N6P7Q8R9S0T1U2V3' },
  },
  'POST /auth/register/password': {
    status: 201,
    data: { message: 'Account created. Please verify your email.' },
  },
  'POST /auth/register/verify': {
    status: 200,
    data: { message: 'Email verified successfully' },
  },
  'POST /auth/register/resend-otp': {
    status: 200,
    data: { message: 'Verification code sent' },
  },
  'POST /auth/register/seller/email': {
    status: 201,
    data: { sessionId: 'sess_01J2K3L4M5N6P7Q8R9S0T1U2V3' },
  },
  'POST /auth/register/seller/profile': {
    status: 201,
    data: { sessionId: 'sess_01J2K3L4M5N6P7Q8R9S0T1U2V3' },
  },
  'POST /auth/register/seller/password': {
    status: 201,
    data: { message: 'Seller account created. Please verify your email.' },
  },
  'POST /auth/register/seller/verify': {
    status: 200,
    data: { message: 'Email verified successfully' },
  },
  'POST /auth/register': {
    status: 201,
    data: { message: 'Account created. Please verify your email.', email: 'user@example.com' },
  },
  'POST /auth/login': {
    status: 200,
    data: {
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NGExZjJlM2I0YzVkNmU3ZjhhOWIwYzEiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJpYXQiOjE3MzY5MzA0MDAsImV4cCI6MTczNjkzMTMwMH0.EXAMPLE',
      refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NGExZjJlM2I0YzVkNmU3ZjhhOWIwYzEiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTczNjkzMDQwMH0.EXAMPLE',
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
  'POST /auth/login/password': {
    status: 200,
    data: {
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.EXAMPLE',
      refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.EXAMPLE',
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
    data: {
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.EXAMPLE',
      refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.EXAMPLE',
      expiresIn: '15m',
    },
  },
  'POST /auth/logout': { status: 200, data: { message: 'Logged out successfully' } },
  'POST /auth/forgot-password': {
    status: 200,
    data: { message: 'If an account exists, a reset code has been sent' },
  },
  'POST /auth/forgot-password/verify': {
    status: 200,
    data: { resetToken: 'rst_01J2K3L4M5N6P7Q8R9S0T1U2V3' },
  },
  'POST /auth/forgot-password/reset': {
    status: 200,
    data: { message: 'Password reset successfully' },
  },
  'POST /auth/password/reset/request': {
    status: 200,
    data: { message: 'If an account exists, a reset code has been sent' },
  },
  'POST /auth/password/reset/confirm': {
    status: 200,
    data: { message: 'Password reset successfully' },
  },
  'POST /auth/login/verify-2fa': {
    status: 200,
    data: {
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.EXAMPLE',
      refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.EXAMPLE',
      expiresIn: '15m',
    },
  },
  'POST /auth/2fa/enable': {
    status: 200,
    data: { message: 'Verification code sent to your email' },
  },
  'POST /auth/2fa/confirm': {
    status: 200,
    data: { message: 'Two-factor authentication enabled' },
  },
  'POST /auth/2fa/disable': {
    status: 200,
    data: { message: 'Two-factor authentication disabled' },
  },
  'POST /auth/clerk/login': {
    status: 200,
    data: {
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.EXAMPLE',
      refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.EXAMPLE',
      expiresIn: '15m',
      user: { id: '64a1f2e3b4c5d6e7f8a9b0c1', email: 'user@example.com', accountType: 'BUYER' },
    },
  },

  // ── Users ───────────────────────────────────────────────────────────────────
  'GET /users/me': {
    status: 200,
    data: {
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
  'PATCH /users/me': {
    status: 200,
    data: {
      id: '64a1f2e3b4c5d6e7f8a9b0c1',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'user@example.com',
    },
  },
  'GET /users/me/addresses': {
    status: 200,
    data: {
      addresses: [
        {
          id: '64a1f2e3b4c5d6e7f8a9b0c2',
          label: 'Home',
          fullName: 'Jane Doe',
          phone: '+2348012345678',
          street: '12 Marina Road',
          city: 'Lagos',
          state: 'Lagos',
          isDefault: true,
        },
      ],
    },
  },
  'POST /users/me/addresses': {
    status: 201,
    data: {
      id: '64a1f2e3b4c5d6e7f8a9b0c2',
      label: 'Home',
      fullName: 'Jane Doe',
      phone: '+2348012345678',
      street: '12 Marina Road',
      city: 'Lagos',
      state: 'Lagos',
      isDefault: true,
    },
  },

  // ── Catalogue ───────────────────────────────────────────────────────────────
  'GET /products': {
    status: 200,
    data: {
      items: [
        {
          id: '64a1f2e3b4c5d6e7f8a9b0c1',
          name: 'iPhone 15 Pro Max',
          slug: 'iphone-15-pro-max',
          priceKobo: 120000000,
          discountedPriceKobo: 115000000,
          imageUrl: 'https://example.com/products/iphone-15.jpg',
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
    data: {
      id: '64a1f2e3b4c5d6e7f8a9b0c1',
      name: 'iPhone 15 Pro Max',
      slug: 'iphone-15-pro-max',
      description: 'Latest Apple flagship smartphone with titanium frame.',
      priceKobo: 120000000,
      discountedPriceKobo: 115000000,
      images: ['https://example.com/products/iphone-15.jpg'],
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
  'GET /products/{productId}/variants': {
    status: 200,
    data: {
      variants: [
        { id: '64a1f2e3b4c5d6e7f8a9b0c4', name: '256GB Natural Titanium', priceKobo: 120000000, inStock: true },
        { id: '64a1f2e3b4c5d6e7f8a9b0c5', name: '512GB Black Titanium', priceKobo: 135000000, inStock: true },
      ],
    },
  },
  'GET /products/{productId}/availability': {
    status: 200,
    data: { inStock: true, stockCount: 14, allowsBackorder: false },
  },

  // ── Commerce — Cart ─────────────────────────────────────────────────────────
  'POST /cart': {
    status: 201,
    data: {
      id: '64a1f2e3b4c5d6e7f8a9b0d1',
      guestToken: 'guest_01J2K3L4M5N6P7Q8R9S0T1U2V3',
      note: 'guestToken is only returned for unauthenticated users. Store it client-side.',
    },
  },
  'GET /cart/{cartId}': {
    status: 200,
    data: {
      id: '64a1f2e3b4c5d6e7f8a9b0d1',
      items: [
        {
          id: '64a1f2e3b4c5d6e7f8a9b0d2',
          productId: '64a1f2e3b4c5d6e7f8a9b0c1',
          variantId: '64a1f2e3b4c5d6e7f8a9b0c4',
          name: 'iPhone 15 Pro Max — 256GB Natural Titanium',
          imageUrl: 'https://example.com/products/iphone-15.jpg',
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
  'POST /cart/{cartId}/items': {
    status: 201,
    data: {
      id: '64a1f2e3b4c5d6e7f8a9b0d2',
      productId: '64a1f2e3b4c5d6e7f8a9b0c1',
      variantId: '64a1f2e3b4c5d6e7f8a9b0c4',
      name: 'iPhone 15 Pro Max — 256GB Natural Titanium',
      priceKobo: 120000000,
      quantity: 1,
      subtotalKobo: 120000000,
    },
  },
  'GET /cart/{cartId}/totals': {
    status: 200,
    data: {
      subtotalKobo: 120000000,
      deliveryFeeKobo: 150000,
      serviceFeeKobo: 50000,
      discountKobo: 0,
      totalKobo: 120200000,
      currency: 'NGN',
    },
  },
  'POST /cart/{cartId}/validate': {
    status: 200,
    data: {
      valid: true,
      issues: [],
    },
  },
  'GET /cart': {
    status: 200,
    data: {
      id: '64a1f2e3b4c5d6e7f8a9b0d1',
      items: [
        {
          id: '64a1f2e3b4c5d6e7f8a9b0d2',
          productId: '64a1f2e3b4c5d6e7f8a9b0c1',
          name: 'iPhone 15 Pro Max — 256GB Natural Titanium',
          priceKobo: 120000000,
          quantity: 1,
          subtotalKobo: 120000000,
        },
      ],
      itemCount: 1,
      subtotalKobo: 120000000,
    },
  },

  // ── Commerce — Checkout ─────────────────────────────────────────────────────
  'POST /checkout/session': {
    status: 201,
    data: {
      sessionId: 'chk_01J2K3L4M5N6P7Q8R9S0T1U2V3',
      cartId: '64a1f2e3b4c5d6e7f8a9b0d1',
      expiresAt: '2025-01-15T11:00:00.000Z',
    },
  },
  'GET /checkout/{sessionId}/summary': {
    status: 200,
    data: {
      sessionId: 'chk_01J2K3L4M5N6P7Q8R9S0T1U2V3',
      items: [{ name: 'iPhone 15 Pro Max', quantity: 1, priceKobo: 120000000 }],
      pricing: {
        subtotalKobo: 120000000,
        deliveryFeeKobo: 150000,
        serviceFeeKobo: 50000,
        totalKobo: 120200000,
      },
      deliveryAddress: {
        fullName: 'Jane Doe',
        street: '12 Marina Road',
        city: 'Lagos',
        state: 'Lagos',
      },
    },
  },
  'POST /checkout/{sessionId}/confirm': {
    status: 201,
    data: {
      orderId: '64a1f2e3b4c5d6e7f8a9b0e1',
      orderRef: 'CM-20250115-A1B2C3',
      status: 'pending_payment',
      paymentMethod: 'paystack',
      paymentUrl: 'https://checkout.paystack.com/pay/abc123def456',
      totalKobo: 120200000,
    },
  },

  // ── Commerce — Orders ───────────────────────────────────────────────────────
  'GET /orders': {
    status: 200,
    data: {
      items: [
        {
          id: '64a1f2e3b4c5d6e7f8a9b0e1',
          orderRef: 'CM-20250115-A1B2C3',
          status: 'delivered',
          paymentStatus: 'paid',
          paymentMethod: 'paystack',
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
    data: {
      id: '64a1f2e3b4c5d6e7f8a9b0e1',
      orderRef: 'CM-20250115-A1B2C3',
      userId: '64a1f2e3b4c5d6e7f8a9b0c1',
      items: [
        {
          productId: '64a1f2e3b4c5d6e7f8a9b0c1',
          variantId: '64a1f2e3b4c5d6e7f8a9b0c4',
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
      paymentMethod: 'paystack',
      timeline: [
        { status: 'pending_payment', timestamp: '2025-01-15T10:00:00.000Z' },
        { status: 'paid', timestamp: '2025-01-15T10:05:00.000Z' },
        { status: 'delivered', timestamp: '2025-01-16T14:30:00.000Z' },
      ],
      createdAt: '2025-01-15T10:00:00.000Z',
    },
  },
  'POST /orders/{id}/cancel': {
    status: 200,
    data: {
      id: '64a1f2e3b4c5d6e7f8a9b0e1',
      orderRef: 'CM-20250115-A1B2C3',
      status: 'cancelled',
      cancelReason: 'Changed my mind',
      cancelledAt: '2025-01-15T10:30:00.000Z',
    },
  },
  'GET /orders/{id}/timeline': {
    status: 200,
    data: {
      timeline: [
        { status: 'pending_payment', timestamp: '2025-01-15T10:00:00.000Z', note: null },
        { status: 'paid', timestamp: '2025-01-15T10:05:00.000Z', note: null },
        { status: 'delivered', timestamp: '2025-01-16T14:30:00.000Z', note: null },
      ],
    },
  },

  // ── Commerce — Wallet ───────────────────────────────────────────────────────
  'GET /wallet': {
    status: 200,
    data: {
      id: '64a1f2e3b4c5d6e7f8a9b0f1',
      userId: '64a1f2e3b4c5d6e7f8a9b0c1',
      balanceKobo: 500000,
      tier: 'standard',
      currency: 'NGN',
    },
  },
  'GET /wallet/transactions': {
    status: 200,
    data: {
      items: [
        {
          id: '64a1f2e3b4c5d6e7f8a9b0f2',
          type: 'topup',
          amountKobo: 500000,
          description: 'Wallet top-up via Paystack',
          createdAt: '2025-01-15T10:00:00.000Z',
        },
      ],
      meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
    },
  },

  // ── Fulfilment — Returns ────────────────────────────────────────────────────
  'POST /returns': {
    status: 201,
    data: {
      id: '64a1f2e3b4c5d6e7f8a9b0g1',
      orderId: '64a1f2e3b4c5d6e7f8a9b0e1',
      status: 'pending',
      reason: 'Item arrived damaged',
      createdAt: '2025-01-20T10:00:00.000Z',
    },
  },
  'GET /returns': {
    status: 200,
    data: {
      items: [
        {
          id: '64a1f2e3b4c5d6e7f8a9b0g1',
          orderId: '64a1f2e3b4c5d6e7f8a9b0e1',
          orderRef: 'CM-20250115-A1B2C3',
          status: 'pending',
          reason: 'Item arrived damaged',
          createdAt: '2025-01-20T10:00:00.000Z',
        },
      ],
      meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
    },
  },

  // ── Sellers ─────────────────────────────────────────────────────────────────
  'GET /sellers/me': {
    status: 200,
    data: {
      id: '64a1f2e3b4c5d6e7f8a9b0c3',
      businessName: 'TechStore NG',
      slug: 'techstore-ng',
      email: 'seller@techstore.com',
      status: 'active',
      rating: 4.7,
      totalSales: 340,
      walletBalanceKobo: 2500000,
    },
  },
  'GET /sellers/me/orders': {
    status: 200,
    data: {
      items: [
        {
          id: '64a1f2e3b4c5d6e7f8a9b0e1',
          orderRef: 'CM-20250115-A1B2C3',
          status: 'paid',
          items: [{ name: 'iPhone 15 Pro Max', quantity: 1, unitPriceKobo: 120000000 }],
          totalKobo: 120200000,
          createdAt: '2025-01-15T10:00:00.000Z',
        },
      ],
      meta: { page: 1, limit: 20, totalItems: 12, totalPages: 1 },
    },
  },

  // ── Support ─────────────────────────────────────────────────────────────────
  'POST /support/tickets': {
    status: 201,
    data: {
      id: '64a1f2e3b4c5d6e7f8a9b0h1',
      ticketRef: 'TKT-20250115-001',
      subject: 'Order not delivered',
      status: 'open',
      createdAt: '2025-01-15T10:00:00.000Z',
    },
  },
  'GET /support/tickets': {
    status: 200,
    data: {
      items: [
        {
          id: '64a1f2e3b4c5d6e7f8a9b0h1',
          ticketRef: 'TKT-20250115-001',
          subject: 'Order not delivered',
          status: 'open',
          createdAt: '2025-01-15T10:00:00.000Z',
        },
      ],
      meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
    },
  },

  // ── Partners & Rewards ──────────────────────────────────────────────────────
  'GET /rewards/me': {
    status: 200,
    data: {
      id: '64a1f2e3b4c5d6e7f8a9b0i1',
      userId: '64a1f2e3b4c5d6e7f8a9b0c1',
      totalPoints: 2500,
      cashbackKobo: 75000,
      tier: 'silver',
      isAffiliate: false,
    },
  },
  'GET /rewards/tiers': {
    status: 200,
    data: {
      tiers: [
        { name: 'Bronze', minPoints: 0, maxPoints: 999, cashbackRate: 0.01 },
        { name: 'Silver', minPoints: 1000, maxPoints: 4999, cashbackRate: 0.02 },
        { name: 'Gold', minPoints: 5000, maxPoints: null, cashbackRate: 0.03 },
      ],
    },
  },
  'POST /partners/onboard': {
    status: 201,
    data: {
      message: 'Partner application received. Our team will contact you within 48 hours.',
      email: 'partner@example.com',
      businessName: 'Partner Ltd',
    },
  },
  'GET /partners/me/dashboard': {
    status: 200,
    data: {
      status: 'approved',
      fundingCapNGN: 500000,
      totalCommittedNGN: 120000,
      availableCapNGN: 380000,
      activeCommitments: 2,
    },
  },
};

// ── Schema resolution ────────────────────────────────────────────────────────

function resolveRef(ref) {
  const name = ref.replace('#/components/schemas/', '');
  return schemas[name] || null;
}

function sampleForSchema(schema, depth) {
  if (!schema || depth > 5) return null;

  if (schema.$ref) return sampleForSchema(resolveRef(schema.$ref), depth + 1);

  if (schema.example !== undefined) return schema.example;

  if (schema.allOf) {
    const merged = {};
    for (const sub of schema.allOf) Object.assign(merged, sampleForSchema(sub, depth + 1) || {});
    return merged;
  }

  if (schema.oneOf || schema.anyOf) {
    return sampleForSchema((schema.oneOf || schema.anyOf)[0], depth + 1);
  }

  if (schema.type === 'array') {
    return schema.items ? [sampleForSchema(schema.items, depth + 1)] : [];
  }

  if (schema.type === 'object' || schema.properties) {
    const obj = {};
    for (const [key, prop] of Object.entries(schema.properties || {})) {
      obj[key] = sampleForProp(prop, key, depth + 1);
    }
    return obj;
  }

  return sampleScalar(schema, '');
}

function sampleForProp(prop, key, depth) {
  if (prop.example !== undefined) return prop.example;
  if (prop.$ref) return sampleForSchema(resolveRef(prop.$ref), depth);
  if (prop.allOf || prop.oneOf || prop.anyOf) return sampleForSchema(prop, depth);
  if (prop.type === 'object' || prop.properties) return sampleForSchema(prop, depth);
  if (prop.type === 'array') return prop.items ? [sampleForSchema(prop.items, depth)] : [];
  return sampleScalar(prop, key);
}

function sampleScalar(prop, key) {
  if (prop.example !== undefined) return prop.example;
  if (prop.enum && prop.enum.length) return prop.enum[0];
  const k = key.toLowerCase();
  const t = prop.type;
  if (t === 'boolean') return false;
  if (t === 'integer' || t === 'number') {
    if (k.includes('price') || k.includes('amount') || k.includes('kobo')) return 100000;
    if (k.includes('quantity') || k.includes('qty')) return 1;
    if (k.includes('page')) return 1;
    if (k.includes('limit')) return 20;
    if (k.includes('total')) return 1;
    return 0;
  }
  if (t === 'string') {
    if (k.includes('email')) return 'user@example.com';
    if (k.includes('password')) return 'Password123!';
    if (k.includes('phone')) return '+2348012345678';
    if (k === 'firstname' || k.includes('firstname')) return 'John';
    if (k === 'lastname' || k.includes('lastname')) return 'Doe';
    if (k.includes('accesstoken')) return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
    if (k.includes('refreshtoken')) return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
    if (k.includes('token')) return 'sample-token';
    if (k.includes('name') && !k.includes('user')) return 'Sample Name';
    if (k.includes('url') || k.includes('image')) return 'https://example.com/image.jpg';
    if (k.includes('date')) return '2025-01-15';
    if (k.includes('_id') || k === 'id') return '64a1f2e3b4c5d6e7f8a9b0c1';
    if (k.includes('id')) return '64a1f2e3b4c5d6e7f8a9b0c1';
    if (k.includes('slug')) return 'sample-slug';
    if (k.includes('description') || k.includes('message') || k.includes('reason'))
      return 'Sample text here';
    if (k.includes('code')) return 'ABC123';
    return '';
  }
  return null;
}

// ── Response builder ──────────────────────────────────────────────────────────

function globalEnvelope(statusCode, data) {
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

function buildResponseSample(operation, request, overrideKey) {
  // Check hardcoded overrides first
  const override = RESPONSE_OVERRIDES[overrideKey];
  if (override) {
    const envelope = globalEnvelope(override.status, override.data);
    const statusText = { 200: 'OK', 201: 'Created', 204: 'No Content' }[override.status] || 'OK';
    return [
      {
        name: `${override.status} ${statusText}`,
        originalRequest: request,
        status: statusText,
        code: override.status,
        _postman_previewlanguage: 'json',
        header: [{ key: 'Content-Type', value: 'application/json' }],
        cookie: [],
        body: JSON.stringify(envelope, null, 2),
      },
    ];
  }

  const responses = operation.responses || {};

  // Pick the first 2xx code
  const successCode = Object.keys(responses)
    .map(Number)
    .filter((c) => c >= 200 && c < 300)
    .sort()[0];

  if (!successCode) return [];

  const responseObj = responses[String(successCode)];
  const jsonContent = (responseObj.content || {})['application/json'];

  let data = null;

  if (jsonContent) {
    const s = jsonContent.schema;
    if (s) {
      // Has explicit schema — resolve it
      data = sampleForSchema(s, 0);
    }
  }

  // If no schema resolved, fall back to a minimal data shape
  if (data === null || data === undefined) {
    data = {};
  }

  const envelope = globalEnvelope(successCode, data);

  const statusText = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
  }[successCode] || 'OK';

  return [
    {
      name: `${successCode} ${statusText}`,
      originalRequest: request,
      status: statusText,
      code: successCode,
      _postman_previewlanguage: 'json',
      header: [{ key: 'Content-Type', value: 'application/json' }],
      cookie: [],
      body: JSON.stringify(envelope, null, 2),
    },
  ];
}

// ── URL builder ──────────────────────────────────────────────────────────────

function buildUrl(rawPath, operation) {
  const postmanPath = rawPath.replace(/\{([^}]+)\}/g, ':$1');
  const segments = postmanPath.split('/').filter(Boolean);

  const urlObj = {
    raw: `{{baseUrl}}/${segments.join('/')}`,
    host: ['{{baseUrl}}'],
    path: segments,
  };

  const queryParams = (operation.parameters || [])
    .filter((p) => p.in === 'query')
    .map((p) => ({
      key: p.name,
      value: p.example !== undefined ? String(p.example) : '',
      description: p.description || '',
      disabled: !p.required,
    }));

  if (queryParams.length > 0) {
    urlObj.query = queryParams;
    const qs = queryParams
      .filter((p) => !p.disabled)
      .map((p) => `${p.key}=${p.value}`)
      .join('&');
    if (qs) urlObj.raw += '?' + qs;
  }

  return urlObj;
}

// ── Body builder ─────────────────────────────────────────────────────────────

function buildBody(operation) {
  const rb = operation.requestBody;
  if (!rb) return undefined;

  const jsonContent = (rb.content || {})['application/json'];
  const formContent =
    (rb.content || {})['multipart/form-data'] ||
    (rb.content || {})['application/x-www-form-urlencoded'];

  if (jsonContent) {
    const sample = sampleForSchema(jsonContent.schema, 0);
    return {
      mode: 'raw',
      raw: JSON.stringify(sample ?? {}, null, 2),
      options: { raw: { language: 'json' } },
    };
  }

  if (formContent) {
    const props = (formContent.schema || {}).properties || {};
    const formdata = Object.entries(props).map(([key, prop]) => ({
      key,
      value: prop.example !== undefined ? String(prop.example) : '',
      type: prop.format === 'binary' ? 'file' : 'text',
      description: prop.description || '',
    }));
    return { mode: 'formdata', formdata };
  }

  return undefined;
}

// ── Headers ──────────────────────────────────────────────────────────────────

function buildHeaders(operation) {
  const headers = [];
  if (operation.requestBody && (operation.requestBody.content || {})['application/json']) {
    headers.push({ key: 'Content-Type', value: 'application/json', type: 'text' });
  }
  return headers;
}

// ── Main processing loop ──────────────────────────────────────────────────────

for (const [rawPath, pathItem] of Object.entries(spec.paths ?? {})) {
  for (const [method, operation] of Object.entries(pathItem)) {
    if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;

    const tag = (operation.tags ?? ['System'])[0];
    if (!folders[tag]) folders[tag] = [];

    const request = {
      method: method.toUpperCase(),
      header: buildHeaders(operation),
      url: buildUrl(rawPath, operation),
    };

    if (operation.description || operation.summary) {
      request.description = operation.description || operation.summary;
    }

    const body = buildBody(operation);
    if (body) request.body = body;

    const overrideKey = `${method.toUpperCase()} ${rawPath}`;
    const responses = buildResponseSample(operation, request, overrideKey);

    const name = operation.summary || `${method.toUpperCase()} ${rawPath}`;
    folders[tag].push({ name, request, response: responses });
  }
}

// Merge unknown tags into System
const knownTags = new Set(TAG_ORDER);
for (const [tag, items] of Object.entries(folders)) {
  if (!knownTags.has(tag) && items.length > 0) {
    console.warn(`⚠️  Unknown tag "${tag}" — ${items.length} request(s) moved to System`);
    folders['System'].push(...items);
  }
}

// ── Build collection ──────────────────────────────────────────────────────────

const collection = {
  info: {
    name: 'Cadna Mart API',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    description:
      'All endpoints in 12 flat folders. Set {{baseUrl}} in your active environment.',
  },
  auth: {
    type: 'bearer',
    bearer: [{ key: 'token', value: '{{authToken}}', type: 'string' }],
  },
  variable: [
    { key: 'baseUrl', value: 'http://localhost:3000/api/v1', type: 'string' },
    { key: 'authToken', value: '', type: 'string' },
    { key: 'adminToken', value: '', type: 'string' },
    { key: 'sellerToken', value: '', type: 'string' },
    { key: 'supplierToken', value: '', type: 'string' },
    { key: 'partnerToken', value: '', type: 'string' },
    { key: 'userId', value: '', type: 'string' },
    { key: 'productId', value: '', type: 'string' },
    { key: 'orderId', value: '', type: 'string' },
    { key: 'returnId', value: '', type: 'string' },
    { key: 'ticketId', value: '', type: 'string' },
    { key: 'commitmentId', value: '', type: 'string' },
    { key: 'tierId', value: '', type: 'string' },
    { key: 'campaignId', value: '', type: 'string' },
    { key: 'cartId', value: '', type: 'string' },
    { key: 'sellerId', value: '', type: 'string' },
  ],
  item: TAG_ORDER.filter((tag) => folders[tag] && folders[tag].length > 0).map((tag) => ({
    name: tag,
    item: folders[tag],
  })),
};

const outPath = path.join(__dirname, '../docs/cadna-mart.postman_collection.json');
fs.writeFileSync(outPath, JSON.stringify(collection, null, 2));

console.log(`\n✅  Postman collection → ${outPath}`);
console.log('\nFolders:');
for (const tag of TAG_ORDER) {
  if (folders[tag]?.length > 0) {
    console.log(`  ${tag.padEnd(28)} ${folders[tag].length} requests`);
  }
}
