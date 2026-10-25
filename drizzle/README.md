# Database migrations

Drizzle writes generated SQL and migration metadata here. The registry at
`src/backend/shared/infrastructure/database/schema.ts` re-exports schemas from
their owning backend contexts. Migration `0000_auth_user_foundation.sql` creates the
IMP-02 auth/user tables.

Set `DATABASE_URL` to a MySQL connection string with host, user, password, and
database. `bun run db:generate` can run offline, but validates `DATABASE_URL` if
one is set. `bun run db:migrate` requires and validates it before connecting.
Next.js validates it during Node.js server startup; an invalid value prevents
successful requests. The backend connection validates it again when database
access is first requested.
Errors do not include the URL or credentials.

For each schema change, run `bun run db:generate`, review the generated SQL and
snapshot against the ERD, then run `bun run db:migrate` against the intended
database. Application startup does not run migrations automatically.

IMP-03 uses a Drizzle-backed Auth.js adapter that maps this ERD explicitly. The
adapter generates internal UUIDs for users, accounts, and sessions and maps
Google's verified email to `users.email_verified` after a successful sign-in.
OAuth access, refresh, and ID tokens are not persisted because IMP-03 only needs
the verified identity and provider account link. No schema migration is needed.

Migration `0001_syllabus_catalog.sql` adds the seven syllabus tables. After
`bun run db:migrate`, run `bun run db:seed:syllabus:dry-run` to inspect the
validated catalog and rejected lessons, then `bun run db:seed:syllabus` to
import it. The importer is transactional and can be rerun after curating
`content/syllabus` without duplicating rows. It deactivates rows that no longer
belong to a complete published lesson subtree, preserving IDs for future
progress references. API and onboarding reads use MySQL; repository JSON is
the canonical import input.

Verify migrations and syllabus reseeding against real MySQL with
`bun run test:syllabus-importer --allow-test-db-write`. Set `DATABASE_URL` to
the regular database and `SYLLABUS_TEST_DATABASE_URL` to a separately provisioned,
empty database whose name ends in `_test` and differs from `DATABASE_URL`.
The explicit flag authorizes migrations and fixture writes in that test database.
The script rejects a test database that already contains syllabus rows, checks
stable IDs and duplicate-free reseeding, ordering changes, skill moves, newly
curated lessons, unpublished/empty catalogs, and transaction rollback. It restores
the published canonical catalog in `finally`; unpublished fixture rows remain
in the isolated test database. Drop and recreate that database before another run.

IMP-06 adds migration `0002_progress_engine.sql` for `progress_events`, `skill_mastery_snapshots`,
and `lesson_understanding_snapshots`, including attribution foreign keys,
unique user/skill and user/lesson snapshots, and score/level/window constraints.
The progress use case commits the event and its snapshots in one transaction.

Run `bun run test:progress --allow-test-db-write` against an empty, isolated
MySQL database. Set `PROGRESS_TEST_DATABASE_URL` to a separately provisioned
database ending in `_test`; its name must differ from `DATABASE_URL`. The script
applies migrations and writes fixtures only to that test database. It verifies
retry idempotency, canonical question validation, rollback, concurrent writes,
lesson completion, mastery windows, user isolation, and progress reads. Provision
a fresh empty test database before another run. It does not migrate the regular
application database.

IMP-07 adds migration `0003_flashcard_engine.sql` for the flashcard deck/item,
membership, session, answer log, and per-user Leitner state tables. Session JSON
snapshots lock prompts/options/feedback; stable event IDs in the answer log allow
progress handoff recovery after a failed request.

After migrating and seeding syllabus, run `bun run db:seed:flashcards:dry-run`
against that database to inspect eligible counts, then `bun run db:seed:flashcards`.
The dry run reads the published MySQL syllabus catalog and writes nothing. The
importer preserves canonical artifact IDs, derives stable KANJI IDs, and reconciles
system memberships transactionally without deleting historical answers or custom
decks. Rerun flashcard seeding after syllabus publication changes. Mapped items
from unpublished lesson subtrees are excluded; pending N5 vocabulary remains
unmapped and produces no official progress events.

Run `bun run test:flashcards --allow-test-db-write` with `DATABASE_URL` set and
`FLASHCARDS_TEST_DATABASE_URL` pointing to a separate, empty MySQL database whose
name ends in `_test` and differs from the regular database. The smoke test applies
migrations and creates isolated fixtures, then verifies persistence, atomic
concurrent submissions, ownership, replay and progress recovery. Use a fresh test
database for each run. It never migrates the regular application database.
