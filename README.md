# CADNA Mart Backend

NestJS backend for the CADNA Mart marketplace.

## Start here

- [Project architecture](./docs/project-architecture.md) — system design, API conventions, security, module ownership, and engineering workflow.
- [SaaS-free delivery roadmap](./docs/saas-free-delivery-roadmap.md) — work that can proceed without adding external provider integrations.
- [Neon/PostgreSQL migration blueprint](./docs/neon-postgres-migration-blueprint.md) — future migration plan; do not begin it without an explicit decision.
- [OpenAPI contract](./docs/openapi.json) — generated public API contract.

## Local development

Prerequisites: a supported Node.js/npm installation and a MongoDB instance. Configuration is validated when the application starts; provide required values through ignored environment files or your deployment environment. Never commit environment files or secrets.

```bash
npm install
npm run start:dev
```

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
