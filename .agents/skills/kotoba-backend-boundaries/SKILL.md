---
name: kotoba-backend-boundaries
description: Implement or refactor KotobaHub backend use cases and API handlers while preserving documented bounded-context ownership and OpenAPI contracts.
---

# Backend boundaries

Use this for `IMP-02`–`IMP-10`, backend work in `IMP-17`, or a backend review.

1. Find the task ID in [task breakdown](../../../docs/task-breakdown.md), then read its linked sequence, ERD, and API documents. Resolve mismatches before changing the affected flow.
2. Keep `src/app/api/v1/**/route.ts` as transport delegation. Put business decisions in `src/backend/<context>/domain` or `application`; adapters live in `interface`/`infrastructure` as specified in [ARCHITECTURE.md](../../../ARCHITECTURE.md). Consolidate each context's dependency composition in one `infrastructure/di/index.ts` file; consumers import from `infrastructure/di`. Module ownership and business flow follow [architecture foundation](../../../docs/architecture-foundation.md).
3. Use application ports/facades for context crossings. `syllabus` owns catalog and skill identity, `progress` owns events and snapshots, `users` owns learner profiles, `personalization` owns recommendation policy, `flashcards` and `practice` own activity flow.
4. Follow `/api/v1` paths, session guards, response envelope, pagination, and error-code conventions from [API base](../../../docs/api-contract/README.md) and the feature OpenAPI file. Treat request payloads as untrusted and validate them at the boundary.
5. Keep database ownership consistent with the ERD; avoid cross-context repository reads/writes. When a requirement needs a new field or flow, update the relevant docs/contracts with the implementation.
6. Model DDD concepts explicitly: use classes for value objects (validate invariants when creating them), entities (stable identity), aggregates (enforce consistency boundaries), domain/application services, and repository implementations. Keep repository contracts and application ports as interfaces; keep transport DTOs, Drizzle schemas, and serializable snapshots as plain data. Place each context's custom exceptions and their detail types in `domain/exceptions`; use cases and transport adapters import those domain definitions. Follow the placement rules in [ARCHITECTURE.md](../../../ARCHITECTURE.md). The [crud-products-nextjs example](https://github.com/Developer-Marcelo/crud-products-nextjs) illustrates class-based domain models and repository implementations; project docs remain authoritative for KotobaHub behavior and layout.
7. Name persistence interfaces `<Entity>Repository` and place them in `domain/repositories/<entity>.repository.ts`; do not use the `Port` suffix or `application/ports` for persistence contracts. Name Drizzle implementations `Drizzle<Entity>Repository` in `interface/secondary/persistence/drizzle-<entity>.repository.ts`. Reserve application ports for service/facade contracts, context crossings, and non-persistence dependencies. A context crossing must use the owning context's application service/facade, which delegates persistence to its domain repository interface.
8. Define explicit request DTOs for endpoint inputs that need parsing or validation (body, path, query, or relevant headers) and response DTOs for returned data. Keep HTTP DTOs and their mappers in `interface/primary/rest`; keep use-case request/response models in `application` when they differ. Validate untrusted input before invoking the use case, and map output field by field to the OpenAPI schema so internal fields cannot leak. Redirect-only and empty-data responses need no artificial payload DTO.

The [PRD](../../../PRD.md) records known prerequisite gaps, including missing published lesson quiz banks.
