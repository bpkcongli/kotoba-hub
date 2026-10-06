# Database migrations

Drizzle writes generated SQL and migration metadata here. The registry at
`src/backend/shared/infrastructure/database/schema.ts` will re-export schemas from
their owning backend contexts. It is intentionally empty in IMP-01.

IMP-02 introduces the MySQL connection, environment validation, auth/user schemas,
and the first migration. After that task, use `bun run db:generate`, review the SQL,
and run `bun run db:migrate` against the intended `DATABASE_URL`. Application startup
does not run migrations automatically.
