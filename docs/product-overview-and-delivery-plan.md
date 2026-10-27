# CADNA Mart Product Overview and Delivery Plan

**Document status:** Working product handoff

**Source review date:** 20 October 2026

**Audience:** Product owner, engineering lead, engineers, QA, and interns

## Why this document exists

This document explains the product across its three current repositories, records what the code already provides, and turns the remaining work into tasks a team lead can assign by experience level. It is a product and delivery map, not a replacement for source code, API documentation, or an approved business policy.

## Product summary

CADNA Mart is a multi-vendor marketplace. Buyers browse products, manage a cart, place orders, and access account and post-purchase features. Sellers apply to join the marketplace and, after approval, are intended to manage products and fulfil orders. Administrators moderate and operate the marketplace. Supplier, partner, promotions, wallet, and rewards capabilities also exist in the backend.

The current backend is a NestJS API backed by MongoDB/Mongoose. The buyer storefront and seller onboarding site are separate React applications. PostgreSQL/Neon is not used by this backend, and this plan does not authorize a database migration.

## Repositories and ownership

| Repository | Current responsibility | Product surface visible in the checkout |
| --- | --- | --- |
| [Backend](https://github.com/Juadebfm/cadna-mart-be) | API, domain logic, persistence, authorization, integrations | Auth, users, catalogue, carts, checkout, orders, payments, sellers, suppliers, admin, returns, logistics, notifications, support, wallet, rewards, promotions, and related modules. |
| [Buyer frontend](https://github.com/Juadebfm/cadna-mart-fe) | Buyer-facing storefront | Home/catalogue, search, product detail, cart, checkout, orders, account, wishlist, support, rewards, wallet, seller storefront, and auth flows. |
| [Seller frontend](https://github.com/Juadebfm/cadna-mart-sellers-fe) | Seller marketing and onboarding | Landing page, multi-step seller signup, email verification, seller login, banking submission, and application-status screens in the current working files. |

The backend checkout reviewed for this document is on main and clean. The buyer frontend is on dev and clean. The seller frontend is on dev with significant uncommitted changes to signup, status, banking, login, and API helpers. Those seller changes are part of the current local product snapshot, but they are not established as merged or released work. Preserve them when assigning work in that repository.

## Main user journeys

### Buyer

1. Visit the storefront and browse categories, search, product rails, brands, and seller storefronts.
2. Inspect product details, variants, availability, reviews, and product policies.
3. Add products to a cart, manage saved items, and use account/profile/address features.
4. Start checkout, choose an address and delivery mode, review a price summary, create an order, and pay or select an available payment method.
5. View order history, tracking, support, returns, wallet, and rewards features.

The backend has route and domain code for many of these steps. The buyer frontend's checkout and payment service contracts do not currently match the backend checkout/payment routes, so the intended journey should not be considered verified end to end.

### Seller

1. Start an application with an email address.
2. Submit personal and business details, create a password, and verify the email address.
3. Sign in, submit bank details through an authenticated seller endpoint, and view the onboarding status.
4. Await approval; after approval, the backend supports seller product operations and seller order/return routes.

The local seller frontend changes implement the onboarding screens and call the corresponding profile, login, banking, and status APIs. The seller frontend does not yet contain a seller operations dashboard for catalogue, order, return, or payout management. Seller onboarding tokens are held in module memory in the current implementation, so a browser reload loses that in-memory session and requires a fresh login.

### Marketplace operations

Administrators have backend endpoints for product/category moderation, seller/user management, orders, returns, reports, pricing, compliance, and delivery configuration. Suppliers have backend product and order endpoints. The buyer app has an admin service module but no admin route in its current router; the seller site is an onboarding site rather than an operations dashboard. Several backend operations are placeholders or return simulated acknowledgements.

## What has been built

This section records source-level implementation. It does not imply that every capability is production-ready, deployed, or connected to a frontend.

### Platform and identity

- NestJS application composition with versioned /api/v1 routes, validated environment configuration, MongoDB/Mongoose persistence, global request validation, response envelopes, exception handling, logging/correlation IDs, throttling, CORS, and Swagger/OpenAPI.
- Buyer and seller registration flows, email OTP verification, password login, JWT access/refresh tokens, password reset, optional two-factor authentication, account profiles, addresses, and account-type guards.
- Clerk login/webhook paths and Resend email configuration/code are present. Provider configuration/code is not proof that production credentials, delivery, or operational behavior are verified.

### Catalogue and merchandising

- Categories, products and variants, brands, collections, home-page rails, search, reviews, product policies, banners, and media-upload endpoints.
- Seller and admin product-management APIs, including seller ownership checks in product-management paths and admin moderation endpoints.

### Buyer commerce

- Authenticated and guest cart APIs, guest-cart token handling, cart validation/totals, cart merging, wishlist, addresses, checkout sessions, order creation and retrieval, payment entry points, and return-request APIs.
- Paystack order initialization/verification/refund code, a Paystack webhook handler, Pay-on-Delivery response routes, and Stripe placeholder routes.
- Wallet records and local credit/debit operations; wallet top-up and transfer are explicitly deferred.

### Seller, supplier, and operations

- Seller profile/onboarding status, banking details, seller-owned product operations, seller order and return endpoints, and admin seller review routes.
- Supplier product/order endpoints, internal logistics booking records, delivery estimates, support tickets, notifications, newsletter subscriptions, deals, promo slots, partner/rewards modules, and admin reporting/configuration routes.

### Frontend surfaces

- The buyer app includes routes and services for browsing, cart, orders, account, support, reviews, wishlist, seller storefronts, wallet, rewards, and buyer/seller auth.
- The seller app has a marketing/landing experience and a current local onboarding implementation with profile capture, verification, authenticated banking submission, sign-in, and status refresh.

## Current gaps and risks

The list below is based on source review of the three current checkouts. It is not a runtime audit. Fixes that change business policy require owner decisions listed later in this document.

### Release-blocking integration and trust-boundary work

- **Buyer checkout contract mismatch:** the buyer frontend calls checkout routes without the backend's session creation and session-ID path. Reconcile the flow and response shapes across both repositories before treating checkout as usable.
- **Buyer payment contract mismatch:** frontend Paystack initialization and Pay-on-Delivery paths differ from the backend routes. Align them and confirm the callback, order status, and error-state behavior.
- **Guest cart integration:** the backend supports guest carts using x-guest-token, but the buyer service layer uses legacy authenticated cart routes. The backend CORS allowlist also omits x-guest-token.
- **Wallet input validation:** the authenticated debit path accepts a negative amount, and the repository subtracts the supplied amount, which increases the wallet balance when it is negative. Add positive-amount validation and safe balance/ledger updates before exposing wallet debit behavior.
- **Supplier order authorization:** supplier order actions load an order by ID but do not verify that the order is assigned to or contains that supplier's products before changing its status.
- **Checkout access and idempotency:** checkout session creation does not apply the cart ownership/guest-token check. Confirmation creates an order before marking the session confirmed, without an atomic claim; retries or concurrent confirmations can create duplicate orders.

### Commerce integrity

- Cart and checkout use placeholder or hard-coded tax/delivery pricing. The admin pricing-rule API exists, but checkout does not use it as a single authoritative price calculation. Checkout can also snapshot cart contents after the earlier price summary was calculated.
- The checkout/order path checks cart stock but has no stock reservation, decrement, or release lifecycle. Concurrent purchases can therefore oversell.
- Order and fulfilment state transitions need an explicit transition policy, actor authorization, idempotency, and audit history.
- Return creation records client-supplied order/item details without checking that the order exists, belongs to the requesting buyer, or contains the item. Return eligibility is currently a placeholder; refunds need truthful internal/provider states.
- Payment confirmation needs reconciliation checks for order reference, amount, currency, event repetition, and final status before it is treated as paid. External charge/refund behavior needs separate operational approval.

### Product completion and operational readiness

- Seller operations screens for products, orders, returns, and payouts are absent from the seller site; related APIs do not constitute a usable seller dashboard.
- The consumer app does not expose the backend's admin operations through an admin UI. Backend admin APIs include both real operations and placeholder responses.
- Several supplier, logistics, Pay-on-Delivery, Stripe, notification-preference, export, legal-page, and delivery-configuration paths are placeholders, simulated responses, or deferred provider work.
- In-app notification persistence/preferences, reliable audit history, role permissions, operational exports, and data-retention enforcement need completion or an explicit deferred product status.
- Automated coverage is small relative to the number of domains. This document records no test/build/browser/deployment results; none were run for this documentation task.

## Work remaining, grouped by ownership level

The level describes the expected risk and independence of the task, not a person's job title. A team lead can assign a task to someone with stronger experience. Junior tasks are deliberately bounded and should use reviewed API contracts and acceptance criteria.

### 1. Senior ownership

Senior work should settle policy, architecture, security boundaries, and high-risk state transitions before parallel feature work depends on them.

| Work item | Repositories | Deliverable / completion evidence |
| --- | --- | --- |
| Confirm commerce policies: tax basis/rates, delivery pricing, discount stacking, currency representation, price validity, and quote expiry. | Product + backend | Written decisions accepted by the product owner; no rates or rules inferred by implementers. |
| Define inventory and order lifecycle: reservation timing/expiry, valid transitions and actors, cancellation/release behavior, and whether partial fulfilment is in scope. | Product + backend | Reviewed state diagram and transition table used by mid-level implementation and QA. |
| Close critical authorization gaps: wallet amount/balance rules, supplier-to-order ownership, cart/session authorization, and public/session capability rules. | Backend | Code review confirms positive-value validation, scoped ownership, and security tests for rejected cross-user/cross-supplier requests. |
| Design atomic checkout/order/inventory behavior and idempotency. Include immutable item, address, and price snapshots and recovery from retries. | Backend | Approved data/state design and failure scenarios; implementation is safe to split into bounded tasks. |
| Define payment, refund, and fulfillment activation gates. Specify reference/amount/currency reconciliation and webhook idempotency before enabling money movement or provider callbacks. | Product + backend + operations | Written acceptance criteria, reconciliation plan, environment/secret ownership, monitoring, and rollback approach. |
| Set seller onboarding and marketplace operating policy: approval criteria, KYC/agreement requirements, storefront creation, supplier scope, and payout status semantics. | Product + backend + seller frontend | Approved roles and journey, including which steps are manual, deferred, or supported in the first release. |
| Decide admin permissions, audit event contents/access/retention, legal-data policies, and report/download scope with the appropriate business/legal owner. | Product + backend | Decision record; do not invent legal requirements or treat the current hard-coded retention claim as approved policy. |

### 2. Mid-level ownership

Mid-level work can deliver vertical slices after the relevant policy/API decisions are stable. It should include validation, authorization, tests, OpenAPI updates, and clear frontend behavior.

| Work item | Repositories | Depends on |
| --- | --- | --- |
| Align buyer checkout service/hooks/pages with backend session creation, session-ID routes, address/delivery selection, summary, and confirmation responses. | Buyer FE + backend | Senior-approved checkout contract and pricing/order behavior. |
| Align payment and Pay-on-Delivery UI with backend routes and actual response states; ensure callback returns the right order state and retry behavior. | Buyer FE + backend | Payment activation policy and reviewed payment contract. |
| Connect the buyer app to the guest-cart API, safely store/send the guest token, support cart merge, and update CORS allow headers. | Buyer FE + backend | Approved guest-cart lifecycle and security review. |
| Implement deterministic pricing calculation and persist its versioned snapshot on checkout/order creation. | Backend | Tax/delivery/discount decisions from senior/product owner. |
| Implement stock reservation, commit, release, expiry, and order status transition logic with atomic updates and idempotency. | Backend | Approved inventory/order state model. |
| Bind returns to verified buyer orders/items and add eligibility, actor checks, evidence, decision history, and truthful refund states. | Backend + buyer FE + seller FE | Return policy and seller/admin actor responsibilities. |
| Persist in-app notification preferences and notification records; make list/read operations user-scoped and idempotent. | Backend + buyer FE | Product decision on notification types/recipient rules. |
| Implement a seller operations dashboard for seller products, stock, assigned orders, returns, profile/banking status, and payout state. | Seller FE + backend | Seller workflow, access rules, and API contracts. |
| Replace admin placeholder success responses with persisted behavior or explicit deferred responses; prioritize product moderation, delivery configuration, legal content, reports, and audit records. | Backend + buyer/admin UI if approved | Admin permission, persistence, and audit decisions. |
| Add integration/contract tests for buyer checkout, seller onboarding, ownership, inventory, payment webhook reconciliation, and key admin transitions. | All repos | Stable contracts and isolated test data strategy. |

### 3. Junior / intern ownership

These tasks are good candidates for interns after a mid/senior reviewer has confirmed their acceptance criteria and API shapes. They should not require the intern to decide pricing, authorization, money movement, schema ownership, or legal policy.

| Bounded task | Repository | Guardrails / review evidence |
| --- | --- | --- |
| Add loading, empty, validation, success, and retry states to an already-approved buyer or seller form/page. | Buyer FE or seller FE | Use existing design/components; no endpoint or data-model changes. |
| Improve accessibility and responsive behavior on a named catalogue, account, seller onboarding, or status screen. | Buyer FE or seller FE | Keep behavior unchanged; reviewer checks keyboard, labels, focus, and mobile layout. |
| Add component tests for a single presentational component or pure validation helper. | Buyer FE or seller FE | Use supplied fixtures; no live secrets/services; reviewer verifies assertions match product requirements. |
| Add backend unit tests for an already-fixed pure helper such as formatting or a stable query mapper. | Backend | Do not author expected business rules; tests must be based on approved examples. |
| Create a route-contract comparison checklist for one named buyer/seller feature using current OpenAPI and service code. | Any repo | Report mismatches with file/route references; do not change endpoints without assignment. |
| Update an existing user-facing help/FAQ or developer setup section after an owner supplies final copy and configuration names. | Seller FE or buyer FE | No claims about provider delivery, approvals, fees, or compliance without approved wording. |
| Reproduce and document one assigned UI bug with steps, expected/actual result, browser/device, and screenshot when available. | Buyer FE or seller FE | No production data or credentials in artifacts; code fix only if separately scoped. |
| Add API examples or fixtures for an already stable endpoint and check them against the generated OpenAPI schema. | Backend | Do not create a second hand-maintained endpoint reference or include real customer data. |

### Work that should not be delegated as an unsupervised intern task

- Payment capture/refund, wallet balance mutation, payout, or webhook verification.
- Authorization changes, seller/supplier ownership, guest-token/session rules, or identity-provider configuration.
- Database migration, inventory concurrency, order state-machine design, or changes that alter API identifiers.
- Tax, pricing, legal-retention, KYC, or seller-approval policy.
- Enabling a third-party provider or handling production credentials.

## Recommended sequence

1. **Triage security and contract blockers.** Senior owner confirms wallet, supplier, checkout ownership, and payment trust-boundary fixes; establish buyer checkout/payment contracts.
2. **Resolve product policies.** Approve tax/delivery/discount, inventory/order, seller operations, return/refund, and admin/compliance rules that block implementation.
3. **Stabilize commerce core.** Implement authoritative pricing, atomic inventory/order transitions, checkout idempotency, and return ownership checks.
4. **Complete buyer integration.** Align buyer cart/checkout/payment services and error states with backend behavior; cover authenticated and guest paths if guest checkout is in scope.
5. **Complete seller operations.** Persist/recover seller sessions safely, then build the approved dashboard slices on the existing seller APIs.
6. **Complete operations and observability.** Implement notification records, audit history, admin persistence, and real report behavior or clearly defer it.
7. **Harden and release.** Run relevant unit/integration/e2e checks, regenerate OpenAPI, perform buyer/seller/admin smoke flows, and verify deployment configuration/rollback before enabling external money movement.

This plan is the single maintained delivery backlog. The OpenAPI contract remains the endpoint reference; implementation details and current behavior must be checked against the owning code under `src/`.

### Unapproved deals campaign proposal

The separate deals blueprint has been consolidated here as a proposal, not an approved requirement. It suggests replacing the deals-as-category approach with seller-paid campaigns containing 1–10 seller-owned products, payment status, scheduling, and admin approval. Live campaigns would feed the existing `best_deals` product rail. Before implementation, the product owner must decide the fee model, approval rules, campaign lifecycle, activation/expiry mechanism, and whether product tags or campaign joins drive the public listing. Current endpoint behavior is defined by the code and OpenAPI contract, not the proposed API sketch.

## Decisions that remain open

The codebase does not provide authoritative answers to these questions. The product owner or qualified business/legal owner must decide them before implementation relies on them.

- What are the tax rules, taxable items, display basis, and approved rates?
- How are delivery prices determined, and what zones, free-delivery thresholds, and currency rules apply?
- Which discounts can stack, and in what order?
- When is inventory reserved, how long does a reservation last, and how is it released or committed?
- Which order transitions are allowed, who may perform them, and is partial fulfilment supported?
- What are wallet balance, hold, adjustment, and transfer rules? Is wallet use in the first release?
- What seller agreement/KYC/approval evidence is required, and when can sellers publish or fulfil orders?
- Which admin roles and permissions are needed, and what audit/retention requirements apply?
- Which payment, logistics, messaging, identity, and media providers are approved for launch, if any?

## How to use this plan for delegation

For each assignment, the team lead should name one owning repository, link the relevant route/module, state the acceptance criteria, identify required product decisions, and name the reviewer. Give interns tasks from the Junior table only when the API and design are stable. Mid-level engineers can own vertical slices once policy decisions are closed. Senior owners retain decisions and changes that affect authorization, money, inventory concurrency, provider activation, or legal/compliance behavior.

Before calling a feature done, distinguish source implementation from verified behavior. Record which static checks, tests, browser flows, provider checks, and deployment checks were actually performed. Keep secrets and production customer data out of documents, fixtures, and screenshots.
