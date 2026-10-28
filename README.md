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
