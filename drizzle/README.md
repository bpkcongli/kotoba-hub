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
