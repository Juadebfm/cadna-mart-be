# Neon PostgreSQL Migration Blueprint

## Purpose

This is the execution document for moving Cadna Mart Backend from MongoDB Atlas/Mongoose to PostgreSQL on Neon before public launch. It is written so that a future engineer or coding agent can continue the work without guessing at requirements, credentials, or rollout safety.

**Status:** planning only. No database schema, application code, credentials, or deployment configuration should be changed until the decision gates in this document are approved.

## Executive decision

### Recommended path

1. Create a **Neon Free** PostgreSQL project for development and migration rehearsals.
2. Build, seed, and validate the PostgreSQL-backed version of the backend in a non-production environment.
3. When the product is ready to launch, upgrade the **same Neon project** to a paid plan; do not migrate to a second PostgreSQL provider/project merely because billing starts.
4. Switch from MongoDB Atlas to PostgreSQL in a planned pre-launch cutover.
5. Retain MongoDB Atlas as a read-only rollback source until the PostgreSQL data and workflows are accepted.

This is intentionally a pre-launch, single-cutover migration. Do **not** add permanent dual writes between MongoDB and PostgreSQL. Dual writes create two sources of truth and are unnecessary while the application has no live customer traffic.

## Facts verified in the current repository

| Area | Current state |
| --- | --- |
| Application | NestJS 11 API, TypeScript |
| Current database | MongoDB Atlas, configured through required `MONGO_URI` |
| Data library | `mongoose` 8 and `@nestjs/mongoose` 11 |
| Session store | `connect-mongo` is configured in `src/main.ts` |
| Schema count | 34 Mongoose schema files under `src/**/schemas/` |
| Identifier coupling | Controllers use `ParseObjectIdPipe`; services/repositories use `Types.ObjectId` |
| Query coupling | Repositories use Mongoose filters, `.populate()`, aggregation pipelines, and soft deletes through `deletedAt` |
| Current base repository | `src/shared/base/base.repository.ts` is Mongoose-specific |
| Current transactions | No `startSession` or `withTransaction` use was found in `src/` |
| Backend hosting reference | Render is the documented backend host; the chosen Neon region must be selected close to the Render service region |

The current source of truth is MongoDB Atlas. Its connection string and all Neon credentials are secrets: do not place them in Git, documentation, test fixtures, or agent memory.

## Non-goals

- Do not launch payments, wallet transfers, refunds, or inventory reservation merely because PostgreSQL exists.
- Do not change public API contracts, authentication behavior, or frontend IDs without an approved compatibility decision.
- Do not copy real customer PII to a development/test branch without an approved data-handling method.
- Do not delete MongoDB Atlas during the migration.
- Do not commit `.env*`, `env.*`, database exports, Neon URLs, passwords, or agent configuration. The repository ignore rules already cover those paths.

## Required decisions — stop before implementation

An executing agent must obtain these answers from the project owner. It must not choose them by itself.

| Decision | Recommended answer | Why it matters |
| --- | --- | --- |
| PostgreSQL provider | Neon | The project is pre-launch, and Neon Free supports migration rehearsal without a second later provider migration. |
| Neon region | Closest Neon region to the existing Render backend and intended customers | Region affects latency and cannot be treated as an implementation detail. |
| ORM/migration tool | Prisma | Provides typed schema, versioned migrations, generated client, and a predictable migration workflow for a TypeScript/NestJS codebase. |
| Primary-key strategy | UUID primary keys plus a unique nullable `legacy_mongo_id` during migration | This is the clean long-term relational design, but it changes the current 24-character ObjectId assumption and therefore needs API/frontend approval. |
| API compatibility strategy | Preserve endpoint shapes; decide whether resource IDs remain ObjectId-shaped temporarily or move to UUID | Existing controllers validate ObjectId route parameters. |
| Session strategy | Replace `connect-mongo` with a PostgreSQL session store only if Passport sessions remain required; otherwise remove session use deliberately after auth review | Mongo currently stores Express sessions. |
| Data used in test | Seeded/synthetic data first | Avoids copying email, address, banking, and support-ticket data into a free development environment. |
| Production cutover window | A maintenance window with writes disabled | Allows a safe final copy and a real rollback option. |

If the primary-key or session decision changes, update this blueprint before writing code.

## Target architecture

```text
                 ┌──────────────────────┐
                 │ Neon PostgreSQL       │
                 │ primary branch        │
                 │ - staging before      │
                 │   launch              │
                 │ - production after    │
                 │   approval             │
                 └──────────┬───────────┘
                            │ pooled runtime connection
                            ▼
┌──────────┐       ┌──────────────────────┐       ┌─────────────────┐
│ Frontend │ ────► │ NestJS backend        │ ────► │ Paystack/Clerk/ │
└──────────┘       │ Render-hosted         │       │ Resend/Cloudinary│
                   │ Prisma repositories   │       └─────────────────┘
                   └──────────────────────┘

MongoDB Atlas remains read-only after cutover until acceptance is complete.
```

Use a Neon branch or isolated project for each disposable migration rehearsal. Never point a local developer, CI job, or preview environment at the eventual production branch by default.

## Target data model principles

1. Use PostgreSQL foreign keys for true relationships.
2. Use `numeric` or integer minor units (`*_kobo`) for money; never binary floating point for money.
3. Keep immutable order-line, delivery-address, and pricing snapshots alongside normalized references.
4. Use `jsonb` only for genuinely flexible provider payloads and snapshots, not as a substitute for core order/payment/wallet tables.
5. Apply explicit unique constraints for identity and provider idempotency:
   - user email where applicable;
   - seller slugs and product slugs;
   - order references;
   - Paystack transaction references;
   - processed webhook event IDs;
   - one wallet per user.
6. Carry soft-delete behavior forward deliberately with `deleted_at`; all default repository queries must continue to exclude soft-deleted rows.
7. Write transactional workflows for checkout, stock reservation, payment confirmation, refunds, and wallet balance/ledger changes. Use row locks or equivalent concurrency controls where inventory or balances are changed.
8. Use an append-only wallet ledger. A mutable balance can be a cached projection, but it must be derivable from ledger entries.

## Source-to-target inventory

The exact field-level schema is a design task. This table tells an agent which source collections must be accounted for before cutover.

| Domain | Current Mongo schemas | PostgreSQL target direction |
| --- | --- | --- |
| Identity and access | users, otp, registration sessions, auth events, data requests | users, OTP/challenge records, registration sessions, audit events, privacy requests |
| Seller and catalogue | sellers, seller profiles, seller followers, categories, products, brands, banners, collections, product policies | sellers, seller_profiles, seller_followers, categories, products, variants, brands, banners, collections, product_policies |
| Buyer journeys | carts, wishlists, addresses, newsletter subscriptions, reviews | carts/cart_items, wishlists, addresses, newsletter_subscriptions, reviews |
| Commerce | checkout sessions, orders, returns, logistics bookings | checkout_sessions, orders, order_items, returns, logistics_bookings |
| Payments and wallet | order payment fields, wallets, wallet transactions | payment_attempts, payment_webhook_events, refunds, wallets, wallet_ledger_entries |
| Promotions and business operations | deal campaigns, promo slots, slot types, duration tiers, slot bookings, partners, rewards, pricing rules | relational tables with junction tables where a document currently stores an array of references |
| Support and configuration | notifications, support tickets, site config | notifications, support_tickets, site_config |

Specific conversion concerns:

- `orders.items`, order timelines, tracking events, and delivery/pricing snapshots are embedded Mongo objects; preserve their historical snapshots.
- Product variants and flexible product attributes need a deliberate normalized-vs-`jsonb` design.
- Mongo references must be mapped consistently before inserting dependent records.
- `$lookup`/aggregation behavior in reviews, seller statistics, admin reporting, and catalog queries must be rewritten and benchmarked as SQL queries.
- Mongo `.populate()` behavior in cart, product, seller, deal, and admin flows must become explicit relational queries.

## Phased implementation plan

### Phase 0 — Owner setup and safety baseline

**Owner action required**

1. Create a Neon Free project in the approved region.
2. Enable MFA on the Neon account and retain recovery codes securely.
3. Create two isolated non-production targets:
   - a persistent `staging` branch/database for integration testing;
   - disposable branches for migration experiments and CI.
4. Add Neon connection values only to local secret storage and the non-production Render environment. Never commit them.
5. Confirm Neon usage alerts/budget behavior in the Neon console before relying on any spending ceiling.
6. Export and securely store a MongoDB Atlas backup before any real-data rehearsal.

**Exit criteria**

- The approved region is recorded.
- A non-production Neon connection can be made from the backend host.
- No secret appears in `git status`, `git diff`, tracked files, or documentation.

### Phase 1 — Database foundation in an isolated code branch

1. Create a dedicated migration branch; do not mix database migration work with product features.
2. Add Prisma and its PostgreSQL client/migration tooling.
3. Add non-secret configuration keys such as `DATABASE_URL` and an explicit database-provider selection; keep `MONGO_URI` valid until final cutover.
4. Implement the PostgreSQL connection module and health check without removing MongoDB yet.
5. Create the initial Prisma schema, SQL migrations, indexes, foreign keys, enum types, and timestamp/soft-delete conventions.
6. Replace the Mongoose-only base repository with domain interfaces that do not expose Mongo filter types.
7. Add test configuration that uses a disposable Neon branch or isolated PostgreSQL database.

**Do not proceed** until an empty database can run migrations repeatedly, from a clean checkout, with no manual SQL edits.

### Phase 2 — Rewrite data access by bounded domain

Rewrite and test each domain behind its repository/service boundary. Keep public endpoint behavior stable unless the owner has approved an API contract change.

Suggested order:

1. Shared infrastructure: configuration, identifiers, timestamps, pagination, soft delete, health checks, session store decision.
2. Identity: users, registration sessions, OTP, auth events, data requests.
3. Catalogue: sellers, profiles, categories, products, variants, brands, policies, collections, banners.
4. Buyer flows: addresses, wishlist, cart/cart items, newsletter, reviews.
5. Commerce core: checkout sessions, orders, order items, returns, logistics.
6. Financial core: payment attempts/webhook idempotency, refunds, wallet ledger and balance projection.
7. Remaining operations: deals, promo slots, partners, rewards, support, notifications, site configuration, reporting.

For every rewritten domain, add repository-level tests and at least one endpoint-level integration test against PostgreSQL.

### Phase 3 — Importer and reconciliation tooling

1. Write a standalone, idempotent import command. It must not run at application boot.
2. Use a deterministic mapping table or `legacy_mongo_id` to resolve every reference.
3. Import parent records before dependent records.
4. Produce a reconciliation report containing only counts, IDs, and checksums—never raw PII or secrets.
5. Detect and report, rather than silently skip:
   - duplicate unique values;
   - invalid references;
   - malformed dates/money values;
   - orphaned soft-deleted records;
   - missing referenced products/sellers/users.
6. Make the importer safe to rerun on a fresh target database and fail loudly on an already-partially-imported target unless an explicit resume mode is approved.

**Minimum reconciliation checks**

- Source and target counts match for every collection/table, including soft-deleted records.
- Every migrated relationship resolves to an existing target record.
- Totals for orders, payment statuses, wallet ledger amounts, and seller/product counts match source-derived reports.
- Sample API responses match the existing contract for representative buyer, seller, admin, and guest flows.

### Phase 4 — Staging rehearsal

1. Run the importer into the Neon staging target.
2. Deploy the PostgreSQL-backed backend to a staging environment with its own secrets.
3. Run smoke tests for authentication, seller onboarding, catalogue, guest/authenticated carts, checkout, order retrieval, uploads, and webhooks.
4. Run failure tests:
   - duplicate Paystack webhook;
   - two customers competing for final inventory;
   - interrupted checkout;
   - retry after database connection loss;
   - refund/wallet transaction rollback;
   - soft-deleted record access.
5. Record query latency and errors for catalogue, cart, checkout, seller/admin dashboards, and reporting.
6. Fix all parity, integrity, and performance findings, then repeat the rehearsal from an empty branch.

### Phase 5 — Pre-launch cutover

Because the service is not live, use a single clean cutover rather than dual writes.

1. Freeze feature merges and take a tagged release candidate.
2. Back up MongoDB Atlas and verify the backup can be restored elsewhere.
3. Put the application into maintenance mode or otherwise block writes.
4. Perform the final import into the approved Neon production branch/database.
5. Run automated reconciliation and manual acceptance checks.
6. Update only the deployment secret/configuration to use PostgreSQL; do not publish the URL in source control.
7. Deploy the already-verified PostgreSQL-backed release.
8. Smoke-test critical flows before re-enabling writes.
9. Keep Atlas read-only and the previous backend release available for rollback.

### Phase 6 — Post-cutover acceptance and retirement

1. Monitor errors, database connections, slow queries, checkout results, and webhook processing.
2. Keep MongoDB Atlas for the agreed rollback retention period.
3. Do not remove Mongoose, `@nestjs/mongoose`, or `connect-mongo` until the owner explicitly accepts PostgreSQL production operation and confirms no rollback is needed.
4. After acceptance, remove Mongo-only configuration, dependencies, health checks, session configuration, scripts, tests, and documentation in a separate cleanup change.

## Test and release gates

The migration is not ready to move past a phase unless all applicable gates pass:

```text
Typecheck → unit tests → PostgreSQL repository tests → integration/E2E tests
→ importer from clean target → reconciliation report → staging smoke test
→ failure/concurrency tests → owner acceptance → cutover
```

At minimum, use the repository’s existing checks after every code change:

```bash
npm run typecheck
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

The current E2E suite needs a real database connection and is not a sufficient migration test on its own. Add PostgreSQL-specific integration coverage before relying on it for cutover approval.

## Security and operations checklist

- [ ] Neon account has MFA and a recoverable owner email.
- [ ] Separate runtime and migration roles are created with least privilege.
- [ ] Runtime connections use TLS and the provider-recommended pooler.
- [ ] Migration commands use a direct/admin connection only in controlled environments.
- [ ] Production secrets are stored in Render/environment settings, never source control.
- [ ] External database access is restricted where the Neon plan/configuration allows it.
- [ ] Backups/restore process has been tested before launch.
- [ ] Alerting exists for failed migrations, connection errors, slow queries, storage/compute use, and webhook failures.
- [ ] Logs and reconciliation reports contain no passwords, connection strings, banking data, email bodies, or unmasked PII.
- [ ] Paystack webhook processing is idempotent before live payments are enabled.

## Rollback runbook

### Before public launch

If staging or cutover validation fails before writes are re-enabled:

1. Keep PostgreSQL inaccessible to application traffic.
2. Restore the previous Mongo-backed backend deployment/configuration.
3. Retain the failed Neon branch for diagnosis only; do not reuse it as the next migration target.
4. Record the failure in an issue and fix it in the migration branch.
5. Rehearse again from an empty PostgreSQL target.

### After public launch

Do not switch back to MongoDB after PostgreSQL has accepted customer writes unless an explicit data-reconciliation plan is approved. A blind rollback would lose writes made after cutover. This is why the initial cutover must occur during a maintenance window and before launch where possible.

## Handoff instructions for another agent

1. Read this document first.
2. Inspect the current branch and confirm it is clean before editing.
3. Confirm every item in **Required decisions — stop before implementation** with the owner.
4. Read the current schemas, repositories, controllers, config schema, database module, and session configuration before proposing any code.
5. Work in small, reviewable commits. Do not rewrite all modules in one unreviewable change.
6. Never print, commit, or save credentials. Refer to environment variable *names* only.
7. Update this blueprint whenever a decision, schema, migration command, or release gate changes.
8. Stop and ask the owner if a decision would alter API IDs, authentication/session behavior, monetary semantics, or production data handling.

## First owner action needed

Confirm these two values before implementation starts:

1. **Provider:** Neon.
2. **Region:** the chosen Neon region closest to the existing Render service and initial customers.

Once confirmed, the first engineering task is **Phase 1, Steps 1–3 only**: create the isolated migration branch, add PostgreSQL/Prisma configuration without removing MongoDB, and establish an empty Neon staging connection. No source data import or production deployment occurs in that task.
