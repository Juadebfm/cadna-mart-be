#!/usr/bin/env node
/**
 * Generates docs/cadna-mart.postman_collection.json from docs/openapi.json.
 * Produces 12 flat tag-based folders — no path-segment nesting.
 * Run: node scripts/gen-postman.js
 */
const fs = require('fs');
const path = require('path');

const spec = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/openapi.json'), 'utf-8'));

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

function buildUrl(rawPath) {
  const postmanPath = rawPath.replace(/\{([^}]+)\}/g, ':$1');
  const segments = postmanPath.split('/').filter(Boolean);
  return {
    raw: `{{baseUrl}}/${segments.join('/')}`,
    host: ['{{baseUrl}}'],
    path: segments,
  };
}

function sampleValue(prop, key) {
  if (prop.example !== undefined) return prop.example;
  const t = prop.type;
  if (t === 'string') {
    if (key.toLowerCase().includes('email')) return 'user@example.com';
    if (key.toLowerCase().includes('password')) return 'Password123!';
    if (key.toLowerCase().includes('phone')) return '+2348012345678';
    if (key.toLowerCase().includes('name')) return 'John Doe';
    if (key.toLowerCase().includes('url')) return 'https://example.com/image.jpg';
    return '';
  }
  if (t === 'number' || t === 'integer') return 0;
  if (t === 'boolean') return false;
  if (t === 'array') return [];
  if (t === 'object') return {};
  return null;
}

function buildSampleBody(schema) {
  if (!schema) return null;
  if (schema.$ref) return { _ref: schema.$ref };
  if (schema.type === 'object' && schema.properties) {
    const obj = {};
    for (const [k, v] of Object.entries(schema.properties)) {
      obj[k] = sampleValue(v, k);
    }
    return obj;
  }
  return {};
}

function buildBody(operation) {
  const rb = operation.requestBody;
  if (!rb) return undefined;
  const jsonContent = (rb.content || {})['application/json'];
  if (!jsonContent) return undefined;
  const sample = buildSampleBody(jsonContent.schema);
  return {
    mode: 'raw',
    raw: JSON.stringify(sample ?? {}, null, 2),
    options: { raw: { language: 'json' } },
  };
}

function buildQueryParams(operation) {
  return (operation.parameters || [])
    .filter((p) => p.in === 'query')
    .map((p) => ({
      key: p.name,
      value: String(p.example ?? ''),
      description: p.description ?? '',
      disabled: !p.required,
    }));
}

// Process every path × method combination
for (const [rawPath, pathItem] of Object.entries(spec.paths ?? {})) {
  for (const [method, operation] of Object.entries(pathItem)) {
    if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;

    const tag = (operation.tags ?? ['System'])[0];
    if (!folders[tag]) folders[tag] = []; // catch unknown tags

    const urlObj = buildUrl(rawPath);
    const queryParams = buildQueryParams(operation);
    if (queryParams.length > 0) {
      urlObj.query = queryParams;
      urlObj.raw += '?' + queryParams.map((p) => `${p.key}=${p.value}`).join('&');
    }

    const headers = [];
    if (operation.requestBody) {
      headers.push({ key: 'Content-Type', value: 'application/json', type: 'text' });
    }

    const request = {
      method: method.toUpperCase(),
      header: headers,
      url: urlObj,
    };
    if (operation.description || operation.summary) {
      request.description = operation.description ?? operation.summary;
    }

    const body = buildBody(operation);
    if (body) request.body = body;

    const name = operation.summary ?? `${method.toUpperCase()} ${rawPath}`;
    folders[tag].push({ name, request, response: [] });
  }
}

// Warn about any operations that fell into unknown tags
const knownTags = new Set(TAG_ORDER);
for (const tag of Object.keys(folders)) {
  if (!knownTags.has(tag) && folders[tag].length > 0) {
    console.warn(`⚠️  Unknown tag "${tag}" — ${folders[tag].length} request(s) will be orphaned`);
    // Append them to System as fallback
    folders['System'].push(...folders[tag]);
  }
}

const collection = {
  info: {
    name: 'Cadna Mart API',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    description:
      'All endpoints grouped into 12 flat folders. Each request uses {{baseUrl}} — set it in your active environment.',
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
