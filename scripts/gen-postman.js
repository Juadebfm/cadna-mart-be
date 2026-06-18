#!/usr/bin/env node
/**
 * Generates docs/cadna-mart.postman_collection.json from docs/openapi.json.
 * Produces 12 flat tag-based folders — no path-segment nesting.
 * Fully resolves $ref schemas so every request body has real fields.
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

// ── Schema resolution ───────────────────────────────────────────────────────

function resolveRef(ref) {
  // ref looks like "#/components/schemas/SomeName"
  const name = ref.replace('#/components/schemas/', '');
  return schemas[name] || null;
}

function sampleForSchema(schema, depth) {
  if (!schema) return null;
  if (depth > 5) return null; // guard against circular refs

  if (schema.$ref) {
    const resolved = resolveRef(schema.$ref);
    return resolved ? sampleForSchema(resolved, depth + 1) : null;
  }

  if (schema.allOf) {
    const merged = {};
    for (const sub of schema.allOf) {
      Object.assign(merged, sampleForSchema(sub, depth + 1) || {});
    }
    return merged;
  }

  if (schema.oneOf || schema.anyOf) {
    const first = (schema.oneOf || schema.anyOf)[0];
    return sampleForSchema(first, depth + 1);
  }

  const t = schema.type;

  if (t === 'object' || schema.properties) {
    const obj = {};
    for (const [key, prop] of Object.entries(schema.properties || {})) {
      obj[key] = sampleForProp(prop, key, depth + 1);
    }
    return obj;
  }

  if (t === 'array') {
    const itemSchema = schema.items;
    if (!itemSchema) return [];
    return [sampleForSchema(itemSchema, depth + 1)];
  }

  return sampleScalar(schema, '');
}

function sampleForProp(prop, key, depth) {
  if (prop.example !== undefined) return prop.example;
  if (prop.$ref) {
    const resolved = resolveRef(prop.$ref);
    return resolved ? sampleForSchema(resolved, depth) : null;
  }
  if (prop.allOf) return sampleForSchema(prop, depth);
  if (prop.oneOf || prop.anyOf) return sampleForSchema(prop, depth);
  if (prop.type === 'object' || prop.properties) return sampleForSchema(prop, depth);
  if (prop.type === 'array') {
    const itemSchema = prop.items;
    if (!itemSchema) return [];
    return [sampleForSchema(itemSchema, depth)];
  }
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
    return 0;
  }
  if (t === 'string') {
    if (k.includes('email')) return 'user@example.com';
    if (k.includes('password')) return 'Password123!';
    if (k.includes('phone')) return '+2348012345678';
    if (k.includes('firstname') || k === 'firstname') return 'John';
    if (k.includes('lastname') || k === 'lastname') return 'Doe';
    if (k.includes('name') && !k.includes('user')) return 'Sample Name';
    if (k.includes('url') || k.includes('image')) return 'https://example.com/image.jpg';
    if (k.includes('date')) return '2025-01-15';
    if (k.includes('id')) return '64a1f2e3b4c5d6e7f8a9b0c1';
    if (k.includes('slug')) return 'sample-slug';
    if (k.includes('description') || k.includes('message') || k.includes('reason'))
      return 'Sample text here';
    if (k.includes('code')) return 'ABC123';
    if (k.includes('token')) return 'sample-token';
    return '';
  }
  return null;
}

// ── URL builder ─────────────────────────────────────────────────────────────

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

// ── Header builder ───────────────────────────────────────────────────────────

function buildHeaders(operation) {
  const headers = [];
  if (operation.requestBody && (operation.requestBody.content || {})['application/json']) {
    headers.push({ key: 'Content-Type', value: 'application/json', type: 'text' });
  }
  return headers;
}

// ── Main processing loop ─────────────────────────────────────────────────────

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

    const name = operation.summary || `${method.toUpperCase()} ${rawPath}`;
    folders[tag].push({ name, request, response: [] });
  }
}

// Merge any unknown tags into System
const knownTags = new Set(TAG_ORDER);
for (const [tag, items] of Object.entries(folders)) {
  if (!knownTags.has(tag) && items.length > 0) {
    console.warn(`⚠️  Unknown tag "${tag}" — ${items.length} request(s) moved to System`);
    folders['System'].push(...items);
  }
}

// ── Build collection ─────────────────────────────────────────────────────────

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
