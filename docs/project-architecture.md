# CADNA Mart Backend Architecture

## Purpose and source of truth

CADNA Mart is a modular NestJS backend for a marketplace with buyer, seller, supplier, partner, administrator, and rewards-related workflows.

This document is the durable architecture and engineering handoff. It replaces historical plans, endpoint checklists, and hand-written client API references that were no longer reliable after the API changed.

Use the following sources in this order:

1. The implementation under `src/` is the source of truth for behaviour.
2. [`openapi.json`](./openapi.json) is the versioned public HTTP contract. Regenerate it after public-route changes with `npm run swagger:export`.
3. This document explains the system shape, cross-cutting rules, and current boundaries.
4. [`product-overview-and-delivery-plan.md`](./product-overview-and-delivery-plan.md) records cross-repository status, open decisions, and the current delivery sequence.

Do not treat historical route names, old branch plans, or manually copied request examples as current API documentation.

## Technology and runtime

| Concern | Current implementation |
| --- | --- |
| Framework | NestJS 11 with TypeScript |
| HTTP platform | Express via `@nestjs/platform-express` |
| Persistence | MongoDB through Mongoose |
| Session store | MongoDB through `connect-mongo` |
| Authentication | Application JWT plus Passport session support; optional Clerk integration paths exist |
| Validation | Global `class-validator` validation pipe with whitelisting, rejection of unknown fields, and transformation |
| API documentation | Swagger/OpenAPI via `@nestjs/swagger` |
| Logging | Winston-backed application logger with correlation IDs |
| Test tooling | Jest and Supertest |
| Packaging | npm; Docker development files live under `docker/` |

Environment is validated at process startup by `src/config/config.service.ts` and `src/config/config.schema.ts`. Runtime configuration and secrets belong in ignored environment files or deployment configuration—never in source code, documentation, or Git.

## Request lifecycle

```text
client
  -> Nest global prefix/version routing
  -> correlation-ID and request-logging middleware
  -> authentication, account-type, and throttling guards
  -> controller -> service -> Mongoose models / external adapter
  -> response transformation interceptor
  -> consistent JSON envelope
```

`AppModule` registers the global JWT, account-type, and throttling guards. Routes explicitly marked public bypass authentication. Controllers should remain thin: validate/authorize at the boundary and keep business/state-transition logic in services.

## HTTP contract

### Routing

- The global API prefix is configured by `API_PREFIX`; the normal deployment configuration uses `api`.
- URI versioning is enabled with a configured default version; normal application routes are therefore under `/api/v1/...`.
- The health routes are `/api/v1/health` and `/api/v1/health/db`.
- Swagger UI is mounted at `/api/docs`; its JSON document is `/api/openapi.json`. These are not versioned routes.
- Swagger is disabled in production unless `ENABLE_SWAGGER=true` is configured.

Do not infer a route from this document. Consult `openapi.json` or its controller before integrating or changing it.

### Response envelopes

Successful responses are transformed globally:

```json
{
  "success": true,
  "statusCode": 200,
  "data": {},
  "meta": {
    "timestamp": "ISO-8601 timestamp",
    "correlationId": "request correlation ID"
  }
}
```

Errors are emitted by the global exception filter with `success: false`, HTTP status, message, error name, optional business error code/details, and the same metadata structure. Client code should read the envelope rather than assuming that the top-level response is the domain payload.

### Authentication and authorization

- Authenticated calls use `Authorization: Bearer <access token>`.
- Guest carts use a server-issued `x-guest-token` in addition to the cart identifier.
- Account-type checks are enforced globally through decorators/guards; every new protected route must declare its intended access level.
- Seller onboarding uses a dedicated seller profile and approval gate. An unapproved seller must not gain product-management capability.
- Banking data is handled through authenticated seller-self routes, not public seller registration requests.

## Module map

The root composition is `src/app.module.ts`. Modules are organised by business capability; schemas, DTOs, controllers, and services live with their capability.

| Area | Modules/directories | Responsibility |
| --- | --- | --- |
| Platform | `config`, `database`, `logger`, `common`, `shared`, `system`, `health` | Configuration, MongoDB connection, logging, cross-cutting filters/interceptors/guards, version/config endpoints, and health checks. |
| Identity | `auth`, `users`, `registration-session`, `otp`, `auth-events`, `addresses`, `data-requests`, `webhooks` | Registration/login/token flows, user profiles, seller registration session state, OTPs, auth events, addresses, privacy requests, and inbound webhook handlers. Signature checks vary by provider. |
| Catalogue | `categories`, `products`, `brands`, `collections`, `banners`, `home`, `search`, `reviews`, `policies`, `site-config`, `upload` | Browse/searchable catalogue, merchandising rails, review content, policies, public configuration, and media API surfaces. |
| Buyer commerce | `cart`, `wishlist`, `shipping`, `checkout`, `orders`, `returns`, `payments`, `wallet` | Guest/authenticated carts, saved products, shipping estimates, checkout/order lifecycle, returns/refunds, payment entry points, and internal wallet concepts. |
| Seller and supply | `sellers`, `suppliers`, `deals`, `promo-slots` | Seller storefront/onboarding/post-order capability, supplier operations, deals, and promotional inventory. |
| Operations | `admin`, `logistics`, `support`, `notifications` | Administrative operations/reporting, delivery state, support tickets, and notification API surfaces. |
| Expansion | `partners`, `rewards`, `newsletter`, `email` | Partner workflow, rewards/affiliate features, subscriptions, and email delivery support. |

When adding a feature, first extend the domain module that owns the state. Do not create cross-module database access from a controller merely for convenience.

## Data architecture

The live codebase currently uses MongoDB and Mongoose. MongoDB is required by the database module, and its connection string is provided by `MONGO_URI`. HTTP sessions are also persisted in MongoDB.

The data model is document-oriented. Many modules refer to other records with MongoDB `ObjectId` references and use Mongoose query/population/aggregation patterns. Model changes must preserve ownership checks, relevant indexes, validation, and backward-compatible migrations for existing documents.

PostgreSQL is not used by this backend. No migration plan is maintained here; do not introduce Prisma, PostgreSQL credentials, or a second persistence path without an approved architecture decision.

## Important domain rules and current boundaries

### Seller onboarding

- Buyer email registration is a separate flow from seller registration.
- Seller profile information is created during seller registration; bank details are submitted only after authentication through seller-self endpoints.
- Seller approval is required before product creation is allowed.
- Investor registration remains deferred even though forward-compatible account-type support exists.

### Guest cart

- A guest cart has a public cart identifier and a server-issued guest token; the token must not be logged or exposed after issuance.
- A signed-in user may merge an owned guest cart into their user cart.
- Legacy authenticated cart routes are retained for compatibility alongside cart-ID-scoped routes.

### Pricing, stock, payment, and fulfilment

- Cart totals currently expose `pricingLocked: false`; the hard-coded tax/delivery calculation is not a final checkout price engine.
- Payment, payout, refund, top-up, and external transfer claims must remain truthful. Some endpoints intentionally defer their external provider action.
- Real Uber/Bolt delivery integration is not implemented; existing logistics paths must not imply a third-party booking occurred unless an approved provider integration completes it.
- The [product overview and delivery plan](./product-overview-and-delivery-plan.md) is the single maintained backlog for the cross-repository work and open decisions.

## External integration boundary

The repository contains integration code or configuration for Clerk, Resend, Paystack, and Cloudinary, along with inbound webhook handlers. Their presence does not mean each capability is live or complete.

Before enabling or changing any integration:

1. Obtain product/owner approval and service credentials through the deployment secret manager.
2. Define idempotency, failure handling, reconciliation, and observability.
3. Validate provider signatures before applying domain changes; do not treat every webhook handler as signed.
4. Never add credentials to Git, examples, fixtures, docs, or logs.
5. Update `openapi.json`, tests, and this document if the architecture boundary changes.

## Security and operational conventions

- `helmet`, compression, cookie parsing, CORS, sessions, request throttling, validation, and global exception handling are installed in `src/main.ts`.
- Development CORS permits configured origins and localhost; production CORS is supplied from configuration. Use explicit production origins rather than a wildcard.
- Correlation ID middleware runs before request logging. Preserve and propagate the supplied `x-correlation-id` when making service-to-service calls.
- Do not log passwords, bearer tokens, guest tokens, database URIs, webhook secrets, payment data, or raw banking details.
- Verify user ownership and account type in every state-changing feature. Identifier possession is not authorization.
- Some webhook endpoints are intentionally excluded from the public OpenAPI document. Verify signature and raw-body handling in each provider-specific controller before applying domain changes.

## Development and verification

### Common commands

```bash
npm install
npm run start:dev
npm run typecheck
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run swagger:export
```

`npm run lint` runs ESLint with `--fix`, so it can modify the working tree. Run it deliberately and inspect its changes.

### Change checklist

1. Read the owning module and relevant schemas, DTOs, guards, service, controller, and tests.
2. Make the smallest coherent domain change; preserve public compatibility unless a deliberate API version/contract decision is made.
3. Add tests for validation, authorization/ownership, state transitions, and failure/idempotency paths as appropriate.
4. Run typecheck, build, relevant unit tests, and relevant end-to-end tests.
5. Regenerate `openapi.json` for public route or schema changes and inspect the resulting diff.
6. Update the product overview or this architecture document if verified product, architecture, or delivery status changes.

## Documentation layout

These maintained Markdown documents describe the current product and implementation:

| Document | Role |
| --- | --- |
| `README.md` | Project entry point, local setup, and verification commands. |
| `docs/product-overview-and-delivery-plan.md` | Cross-repository product map, current state, open decisions, and delivery priorities. |
| `docs/project-architecture.md` | This architecture and engineering handoff. |
| `docs/README.md` | Documentation index and local API entry points. |

`docs/openapi.json` remains the machine-readable API contract. Do not create a second manual endpoint reference unless a concrete audience and maintenance owner are agreed first.

The Word product overview is a distribution copy; the Markdown product overview is the editable source of truth.
