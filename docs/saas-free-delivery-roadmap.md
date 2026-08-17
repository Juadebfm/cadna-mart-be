# CADNA Mart: SaaS-Free Delivery Roadmap

## Purpose

This is the implementation handoff for work that can be completed **without adding or activating a new external provider integration**. It is intended for a coding agent or developer joining the project.

It complements the [Neon/PostgreSQL migration blueprint](./neon-postgres-migration-blueprint.md). That document concerns a future database migration; this one concerns product and backend work that can proceed on the current application.

## Scope boundary

"SaaS-free" does **not** mean the application can run without a database. The current backend requires MongoDB through `MONGO_URI` and uses Mongoose. It means no new dependency on, or activation of, third-party messaging, payment, identity, media, logistics, analytics, KYC, or credit-check services.

The work in this document may read and write the existing database and use the application runtime. It must not require live credentials, provider dashboards, provider webhooks, or outbound provider calls to be considered complete.

## Verified current state

The following source-level facts define the starting point:

| Area | Current state | Evidence |
| --- | --- | --- |
| In-app notifications | Preference saving is deferred and broadcasts are only reported as queued; provider delivery is deferred. | `src/notifications/notifications.service.ts` |
| Checkout pricing | The cart service contains a default tax rate of 7.5%, a delivery charge of 1,500, and returns `pricingLocked: false`. | `src/cart/cart.service.ts` |
| Wallet | Local debit/credit logic exists, while Paystack top-up and transfers are deferred. | `src/wallet/wallet.service.ts` |
| Promotions | Promo-slot checkout returns a placeholder Paystack URL. | `src/promo-slots/promo-slots.service.ts` |
| Logistics | Uber/Bolt work is represented by placeholders/deferred integration paths. | `src/logistics/` |
| Admin operations | Some audit-log, role, VAT, and report-download paths are deferred or return placeholder results. | `src/admin/` |
| External delivery | Email, SMS/push, payments, real logistics booking, KYC/credit checking, and media hosting remain external-integration work. | service/module source under `src/` |

Do not change these facts merely to make an endpoint look finished. A deferred external action must remain explicit until its provider integration is separately approved and implemented.

## Outcomes

At the end of this roadmap, CADNA Mart should have reliable, tested internal workflows for notification records, pricing calculations, order/inventory state, internal returns and promotions, wallet safety rules, and operational records. External side effects remain disabled or explicitly deferred.

## Priority and dependency order

| Order | Workstream | Why it comes now | External service required? |
| ---: | --- | --- | --- |
| 1 | In-app notification centre | Creates a trustworthy internal event history and user-facing notification state. | No |
| 2 | Pricing and checkout integrity | Prevents inconsistent totals before payment work starts. | No |
| 3 | Inventory and order lifecycle integrity | Protects stock and makes commerce state changes deterministic. | No |
| 4 | Returns, promo slots, and wallet safety | Completes internal workflows while keeping money movement and payment collection disabled. | No |
| 5 | Admin, compliance, and operational reporting | Makes the preceding activity supportable and auditable. | No |
| 6 | Test and contract hardening | Provides release confidence for every preceding workstream. | No |

Complete the workstreams in this order unless the product owner explicitly reprioritises them. Workstreams 2 and 3 are prerequisites for safe real-payment activation.

## Workstream 1 — In-app notification centre

### Goal

Replace accepted-but-non-persistent notification preferences and queued-only broadcast responses with database-backed in-app notifications. This does not include email, SMS, push, WhatsApp, or FCM delivery.

### Deliverables

- A notification record model with: recipient user ID, type, title, body, optional structured metadata, read timestamp, creation timestamp, and a safe actor/reference field where applicable.
- A persistent notification-preference model, or well-defined fields on the existing user model. Preferences must be scoped to the authenticated user.
- Service methods to create a single notification, create notifications for a bounded recipient list, list a user’s notifications with pagination, and mark one/all as read.
- Controlled internal fan-out for the existing broadcast concept. It must use explicit recipient selection and pagination/batching; it must not silently send externally.
- Authorization tests proving one user cannot read or update another user’s notifications/preferences.
- OpenAPI updates if the existing routes change or new routes are added.

### Acceptance criteria

- Preferences survive a process restart because they are persisted in MongoDB.
- A broadcast creates visible in-app records for its intended recipients, not merely `{ queued: true }`.
- List endpoints return only the current user’s records and stable pagination metadata.
- Read state is idempotent.
- No notification code imports or calls an email, SMS, push, or FCM provider as part of this roadmap.

## Workstream 2 — Pricing and checkout integrity

### Goal

Move hard-coded cart totals toward a single deterministic calculation and persist an immutable price snapshot when an order is created.

### Product decisions required before implementation

The owner must confirm these policies; do not invent them in code:

1. Tax basis: jurisdiction, rate source, inclusive/exclusive display, and which items are taxable.
2. Delivery pricing: flat amount, zone/weight rules, free-delivery threshold, and currency.
3. Discount stacking: whether coupon, campaign, seller, and promotion discounts may combine.
4. Price validity: whether a cart price may change at checkout and how long an order quote is valid.

### Deliverables after those decisions

- A pure pricing calculator that accepts line items and explicit pricing inputs, and returns item subtotal, discount total, tax, delivery, grand total, and an itemised breakdown.
- Decimal-safe money handling. Do not introduce floating-point arithmetic for persisted or comparison-sensitive monetary values.
- A single application path used by cart display and order creation.
- An order price snapshot containing the calculation inputs, item prices, applied rules, totals, currency, and calculation version.
- A clear `pricingLocked` meaning backed by actual persisted data.
- Unit tests for zero quantities, rounding, discounts, tax, delivery, recalculation, and stale/changed prices.

### Acceptance criteria

- Totals are reproducible from the stored order snapshot without reading the current catalogue price.
- A client cannot submit its own authoritative total.
- Every monetary amount has a defined currency and representation.
- No Paystack, Stripe, or other payment action is required to exercise or test this work.

## Workstream 3 — Inventory and order lifecycle integrity

### Goal

Make stock and order transitions safe under repeat requests and competing checkouts, before a real payment provider is turned on.

### Product decisions required before implementation

- What constitutes available stock: on-hand stock only, or on-hand minus reservations?
- When a reservation begins and its expiry duration.
- Which order statuses are allowed, and which actor may perform each transition.
- Cancellation and return-to-stock rules.
- Whether partial fulfilment is supported in the first release.

### Deliverables after those decisions

- Explicit stock reservation/release/commit operations with a documented state machine.
- Atomic, conditional inventory updates so stock cannot fall below zero under concurrent requests.
- Idempotency protection for order creation and reservation release operations.
- Order transition validation, including actor/role/ownership checks.
- A recoverable expiry process for abandoned reservations. Its first version may be an internal scheduled application task; it must be safe to run repeatedly.
- Tests covering duplicate requests, insufficient stock, cancellation, expiry, and concurrent reservation attempts.

### Acceptance criteria

- The same checkout request cannot create multiple paid-or-pending orders accidentally.
- Inventory never becomes negative through supported routes.
- A cancellation or expired reservation returns stock exactly once.
- This work performs no payment capture, payout, or real delivery booking.

## Workstream 4 — Internal commerce workflows

This workstream makes existing internal workflows complete and truthful while excluding external financial or provider actions.

### 4A. Returns

- Finish the internal return request lifecycle: request, evidence/notes where supported by the current model, seller/admin decision, status history, and buyer visibility.
- Enforce ownership and actor permissions at every transition.
- Represent a refund as a pending/internal decision only. Do not report an external refund as completed without an actual payment-provider refund.
- Test repeated approval/rejection requests and unauthorized transitions.

### 4B. Promo slots

- Complete slot availability, capacity, booking intent, expiry, cancellation, suspension, and internal reporting rules.
- Retain the placeholder checkout response or replace it with an explicit `paymentIntegrationRequired` state; do not fabricate a usable checkout URL.
- Verify that a seller can only view or alter their own promo booking data, except for authorized admin operations.

### 4C. Wallet safety

- Document wallet balance semantics and establish a transaction/ledger record for every internal credit, debit, hold, release, or adjustment.
- Enforce idempotency and non-negative-balance rules for operations that are permitted by product policy.
- Add reconciliation queries/tests that compare materialised balance with ledger entries.
- Keep Paystack top-up and external transfers disabled/deferred. Do not treat an internal balance update as proof that real money moved.

### Acceptance criteria

- Each workflow has an explicit state machine and auditable history.
- Repeating the same supported command is safe or predictably rejected.
- No endpoint claims to have charged, refunded, topped up, or transferred external funds.

## Workstream 5 — Admin, compliance, and operational reporting

### Goal

Make internal activity reviewable without requiring a compliance SaaS, export provider, or third-party analytics platform.

### Product decisions required before implementation

- Roles and permissions required for the pre-launch team.
- Audit-log retention, access, and redaction requirements.
- Applicable tax/VAT policy; legal/compliance policies must come from the business or qualified adviser.
- Whether reports are on-screen/API-only initially or require downloadable files later.

### Deliverables after those decisions

- Append-only audit events for sensitive admin and commerce actions, including actor, action, target, timestamp, request correlation ID where available, and safe before/after summaries.
- Role/permission enforcement backed by persisted policy or a deliberately constrained configuration, rather than placeholder responses.
- Read-only operational report endpoints using database aggregation, with documented filters and pagination.
- A data-retention/erase-request workflow that records requests and status without asserting legal completion automatically.
- Tests ensuring audit data does not expose passwords, tokens, or secrets.

### Constraints

- A queued report-download job is not a completed file-export feature. File delivery/storage may need a separate approved solution.
- Do not encode VAT rates or legal retention periods until the owner provides the policy.

## Workstream 6 — Quality, API, and release hardening

### Deliverables

- Expand service and controller tests for all changed state transitions and ownership checks.
- Add integration tests against an isolated MongoDB test database for the critical flows above.
- Keep `docs/openapi.json` synchronized with the documented API. Deliberately excluded signed webhook endpoints may remain excluded.
- Validate errors are stable, typed, and do not leak sensitive implementation details.
- Add operational logging/correlation for internal failures without recording passwords, authentication tokens, database connection strings, or provider secrets.
- Run the existing quality commands before each merge: typecheck, build, unit tests, and end-to-end tests.

### Definition of done for each change

1. The product rule is written down and approved when a decision is required.
2. The endpoint/service performs the promised internal work against the database.
3. Authentication, authorization, ownership, validation, and idempotency are tested where relevant.
4. API documentation and examples match the implementation.
5. No provider call, real-money claim, or placeholder masquerades as a completed external action.
6. Required test/build commands pass and the change is reviewed for regressions.

## Explicitly out of scope: external-provider backlog

The following should be planned and approved separately. Do not block the roadmap above on them.

| Capability | Why it is out of scope |
| --- | --- |
| Email, SMS, push, WhatsApp, and FCM delivery | Requires a messaging provider, credentials, consent policy, and delivery observability. |
| Clerk/OAuth identity integration | Requires an identity-provider configuration and signed webhook/OAuth handling. |
| Paystack/Stripe charging, refunds, payouts, top-ups, and transfers | Requires merchant configuration, keys, signed webhooks, reconciliation, and financial controls. |
| Cloud media upload/storage | Requires a media provider/storage configuration and content policy. |
| Uber/Bolt quotations and bookings | Requires commercial/provider credentials and real-time lifecycle handling. |
| KYC, credit checks, and partner verification | Requires approved providers, legal basis, consent, and data-handling controls. |
| Third-party analytics and attribution | Requires a tracking plan, vendor choice, privacy review, and runtime configuration. |

## Suggested delivery sequence

1. Confirm the product decisions listed under pricing, inventory, wallet, and admin/compliance.
2. Implement and test the in-app notification centre.
3. Implement the pure pricing calculator and immutable order pricing snapshot.
4. Implement reservation and order transition safety.
5. Complete returns, promo slot, and wallet internal state machines.
6. Add audit records, administrative permissions, and read-only operational reports.
7. Run API synchronization and the full verification suite; review every remaining deferred endpoint so its response is truthful.

## Handoff instructions for the next agent

1. Read this document, the [project architecture](./project-architecture.md), and the [OpenAPI contract](./openapi.json) before changing endpoints.
2. Inspect the relevant schema, controller, service, DTO, guard, and tests before proposing a change. Existing MongoDB/Mongoose conventions are the current source of truth until the PostgreSQL migration is explicitly started.
3. Start with one workstream and one bounded vertical slice; do not activate unrelated integrations.
4. Preserve deferred external endpoints as explicit deferred behavior. If a proposed solution needs a provider, stop and obtain approval rather than adding credentials or a vendor SDK.
5. Update this roadmap and the API documentation when the verified implementation state changes.

## Open decisions register

| Decision | Owner input needed | Blocks |
| --- | --- | --- |
| Tax/VAT policy | Jurisdiction, taxability, rates, display | Pricing completion |
| Delivery pricing policy | Flat/zone/weight/free threshold, currency | Pricing completion |
| Discount stacking | Allowed combinations and precedence | Pricing completion |
| Stock reservation policy | Start time, expiry, cancellation, partial fulfilment | Inventory completion |
| Wallet policy | Allowed internal movements, holds, negative balances | Wallet completion |
| Admin roles | Pre-launch roles and privileges | RBAC completion |
| Retention/compliance rules | Business/legal policy | Compliance completion |

Until these decisions are supplied, an agent may prepare interfaces, tests, and non-policy plumbing, but must not hard-code guessed business or legal rules.
