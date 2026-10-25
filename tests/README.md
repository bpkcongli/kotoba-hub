# Test foundation

Run `bun run test` for the Jest unit (Node) and component (jsdom) projects. The
Next.js transformer handles TypeScript, JSX, path aliases, styles, and assets.
Node supplies native fetch APIs to jsdom before MSW loads.

Place unit tests under `tests/unit/<domain>/`. Use `shared` for API response,
database bootstrap, and test infrastructure that crosses domain boundaries.

`tests/setup/msw.ts` starts and closes the Node interceptor, resets runtime
handlers and registered scenario state after each test, and fails unhandled
`/api/v1` requests even when application code catches the request error. Assets
and other requests outside that API prefix explicitly bypass the interceptor.

Add domain handlers to `src/mocks/api/<domain>/` and aggregate them in
`src/mocks/msw.router.ts` when their real API services are implemented. Use the
same service implementation in live and mocked flows. Register each mutable
collection's reset with `registerMockStateReset`; `resetHandlers()` alone does
not reset data. Use fixture factories and fresh containers/stores per test.

The bootstrap smoke tests verify framework and mock infrastructure only. They
do not complete `TEST-01`–`TEST-11` or implement authentication. The anonymous
session fixture is a test-only example from the auth OpenAPI contract.

Persistence integration tests and E2E belong in `tests/integration/` and
`tests/e2e/` when those implementation tasks land. They must run against the
real isolated test backend with FE API mocking disabled, without this global
MSW setup. External OAuth and AI providers still need isolated test doubles.

IMP-06 progress unit tests cover mastery windows, recency/confidence weighting,
two-session difficulty evidence, lesson understanding, filtered aggregation,
and protected REST contracts. Run real MySQL write-through verification with
`bun run test:progress --allow-test-db-write`, using the isolated database setup
in [drizzle/README.md](../drizzle/README.md). The smoke covers migrations,
rollback, concurrency, idempotency after catalog changes, and user isolation;
it keeps frontend API mocking disabled.

IMP-07 flashcard unit tests cover the script-pair matrix, immutable multiple-choice
snapshots, alias-safe distractors, Leitner transitions, published syllabus mapping,
private custom decks, and idempotent progress handoff recovery. REST tests cover
APP_READY, origin protection, validation, and response field filtering. Run real
MySQL persistence verification with `bun run test:flashcards --allow-test-db-write`
using the isolated setup in [drizzle/README.md](../drizzle/README.md).
