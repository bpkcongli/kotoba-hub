---
name: kotoba-backend-boundaries
description: Implement or refactor KotobaHub backend use cases and API handlers while preserving documented bounded-context ownership and OpenAPI contracts.
---

# Backend boundaries

Use this for `IMP-02`–`IMP-10`, backend work in `IMP-17`, or a backend review.

1. Find the task ID in [task breakdown](../../../docs/task-breakdown.md), then read its linked sequence, ERD, and API documents. Resolve mismatches before changing the affected flow.
2. Keep `src/app/api/v1/**/route.ts` as transport delegation. Put business decisions in `src/backend/<context>/domain` or `application`; adapters live in `interface`/`infrastructure` as specified in [ARCHITECTURE.md](../../../ARCHITECTURE.md). Module ownership and business flow follow [architecture foundation](../../../docs/architecture-foundation.md).
3. Use application ports/facades for context crossings. `syllabus` owns catalog and skill identity, `progress` owns events and snapshots, `users` owns learner profiles, `personalization` owns recommendation policy, `flashcards` and `practice` own activity flow.
4. Follow `/api/v1` paths, session guards, response envelope, pagination, and error-code conventions from [API base](../../../docs/api-contract/README.md) and the feature OpenAPI file. Treat request payloads as untrusted and validate them at the boundary.
5. Keep database ownership consistent with the ERD; avoid cross-context repository reads/writes. When a requirement needs a new field or flow, update the relevant docs/contracts with the implementation.

The [PRD](../../../PRD.md) records known prerequisite gaps, including missing published lesson quiz banks.
