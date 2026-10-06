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

Auth.js adapter mapping belongs to IMP-03. This ERD requires UUID `id` columns
on `accounts` and `sessions`, `users.display_name`, and boolean
`users.email_verified`; these differ from Auth.js adapter defaults and need an
explicit adapter strategy before login routes are implemented.
