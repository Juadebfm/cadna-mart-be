# CADNA Mart backend documentation

This folder keeps the backend's current product and engineering handoff, plus the generated API contract.

## Maintained documents

- [Product overview and delivery plan](./product-overview-and-delivery-plan.md) — product surfaces, current implementation snapshot, verified gaps, open decisions, and delivery priorities.
- [Project architecture](./project-architecture.md) — runtime composition, module responsibilities, data and security boundaries, and local engineering workflow.
- [OpenAPI contract](./openapi.json) — generated request and response contract. Source behavior lives in `src/`; export a fresh contract with `npm run swagger:export` after public API changes.

## Local API

- Start the API with `npm run start:dev` after supplying the required environment values and a reachable MongoDB instance.
- The default API base is `http://localhost:3000/api/v1`.
- Swagger UI is available at `/api/docs` when enabled; production disables it unless `ENABLE_SWAGGER=true`.

For setup and verification commands, see the [root README](../README.md).
