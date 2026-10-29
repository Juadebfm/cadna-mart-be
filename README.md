# CADNA Mart Backend

NestJS backend for the CADNA Mart marketplace.

## Local development

Prerequisites: Node.js/npm and a PostgreSQL database. The production database is Neon. Copy `.env.example` to `.env` and configure:

- `DATABASE_URL`: Neon direct connection URL, used by Prisma migrations.
- `DATABASE_URL_POOLED`: Neon pooled connection URL, used by the running API and PostgreSQL-backed sessions.

Both URLs must point to the same Neon project, branch, and database. Keep `.env` and all real credentials out of Git.

```bash
cp -n .env.example .env
npm ci
npm run db:migrate:deploy
npm run start:dev
```

Use the Neon direct URL for `DATABASE_URL` and the Neon pooler URL for `DATABASE_URL_POOLED`. The API can fall back to `DATABASE_URL` if a pooled URL is not configured.

The normal API base is `http://localhost:<configured-port>/api/v1`. Health is available at `/api/v1/health`. Swagger is mounted at `/api/docs` when enabled by the runtime configuration.

## Buyer authentication and account deletion

- Clerk buyers sign in through `/api/v1/auth/clerk/login`. Existing Cadna accounts are linked only after the buyer authenticates to Cadna and uses `/api/v1/auth/clerk/link`; matching email addresses do not automatically link accounts. Clerk webhook signatures are checked against Nest's raw request bytes.
- Buyers submit deletion requests at `POST /api/v1/users/data/delete-request`. The request is reviewed by an admin; approval performs erasure and is not just a status update.
- `DELETE /api/v1/admin/users/:id` creates the same pending erasure request for buyer accounts; admins can still use the separate suspend endpoint when they need to disable access. Non-buyer admin deletion remains a soft delete. A verified Clerk `user.deleted` webhook queues the same review request and immediately disables local buyer access.
- When no records need a retention hold, approval removes the buyer identity and related nonessential data and marks the request `completed`. If records must be retained, the buyer profile is anonymized, access is disabled, and the request remains `in_progress` while the listed records are held.
- Open orders/returns, open support cases, and wallets with funds or active holds require an administrator to provide an approved retention category, lawful basis, purpose, and future deadline before erasure can proceed. Supported categories are `orders_and_returns`, `support_tickets`, `wallet_records`, `rewards_records`, and `auth_events`. No retention period is hard-coded.
- Admins review requests at `GET /api/v1/admin/compliance/data-requests`, decide at `POST /api/v1/admin/compliance/data-requests/:id/process`, and manually purge expired categories at `POST /api/v1/admin/compliance/data-requests/:id/purge-expired`. There is no scheduled purge job. Failed requester notices can be retried at `POST /api/v1/admin/compliance/data-requests/:id/retry-notification`.
- The API records a 30-day operational response target; this setting is not a legal determination. The business must supply the lawful basis and retention deadlines.

Example approval that retains an order category (replace the policy text and deadline with approved values):

```json
{
  "decision": "approve",
  "retentionItems": [
    {
      "category": "orders_and_returns",
      "lawfulBasis": "<owner-approved lawful basis>",
      "purpose": "<specific operational or legal purpose>",
      "retainUntil": "2030-01-01T00:00:00.000Z"
    }
  ]
}
```

The data-request schema changes are versioned in `prisma/migrations/20261029000000_data_request_erasure_workflow` and `prisma/migrations/20261029000001_data_request_source`. Apply pending schema migrations with `npm run db:migrate:deploy` against the intended database.

## Verify a change

```bash
npm run typecheck
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

For public API changes, regenerate the contract and inspect its diff:

```bash
npm run swagger:export
```

`npm run lint` applies automatic fixes, so inspect the working tree afterward.

## Repository hygiene

- Do not commit `.env*`, `env.*`, credentials, tokens, connection strings, or personal/agent setup folders.
- Do not activate payment, identity, messaging, storage, logistics, KYC, or analytics providers without an approved implementation plan.
- Keep generated API documentation, tests, and the architecture document aligned with code changes.
