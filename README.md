# KotobaHub

A Japanese learning app built as a Next.js modular monolith. The repository now
contains the learning backend and the shared frontend shell, session store,
Axios adapter, and provider foundation. Feature UI follows the [task breakdown](docs/task-breakdown.md).

## Local development

Use Bun **1.3.9** (`.bun-version`) and Node **22** (`.nvmrc`). Node runs Jest and
development CLIs; Bun manages dependencies and runs Next.js. The framework is
pinned to the latest available patch in the documented Next.js **16.1.x** line
(16.1.7 at bootstrap), with React **19.2.8**. Commit `bun.lock` with dependency changes.

```sh
bun install --frozen-lockfile
cp .env.example .env
bun run dev
```

Start local MySQL with `docker compose up -d mysql` before running the app. Open
<http://localhost:3000>. Server startup validates `DATABASE_URL` and auth settings;
the public page does not query MySQL. AI keys are required only when invoking an AI operation. Fonts are installed
locally, so builds do not fetch Google Fonts.
`bun install` configures Husky for this checkout; the pre-commit hook formats/lints
staged code and runs lint, typecheck, and changed Jest tests.

## Quality checks

```sh
bun run check
bun run build
```

| Command                                   | Purpose                                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `bun run lint`                            | Next.js/TypeScript ESLint, import order, Prettier, dependency checks, and FE/BE import boundaries |
| `bun run typecheck`                       | Generate route types and check strict TypeScript                                                  |
| `bun run format` / `bun run format:check` | Format/check application and tooling files                                                        |
| `bun run test`                            | Jest (use this command, not Bun's separate `bun test` runner)                                     |
| `bun run test:changed`                    | Tests related to uncommitted changes                                                              |
| `bun run test:ci`                         | All Jest projects in CI mode                                                                      |
| `bun run build` / `bun run start`         | Production build / local production server                                                        |

The format gate intentionally excludes existing planning documents, generated
assets, and canonical content. See [test setup](tests/README.md) for Node/component
test environments. GitHub Actions runs quality checks, a production build, and
Docker build on pull requests and pushes to `main`.

## Mock API development

Set `NEXT_PUBLIC_API_MOCKING=true` in `.env` and restart `bun run dev`. MockProvider
waits for MSW before mounting children; production never starts browser mocking.
The generated worker is committed in `public/mockServiceWorker.js`. Regenerate it
with `bun run mocks:init` whenever MSW changes.

`src/mocks/msw.router.ts` includes session/sign-out handlers with resettable auth
fixtures. Add feature handlers only from the canonical `/api/v1` contracts as their features are implemented.
Unmatched application API requests fail visibly; other requests can pass through.
Services keep their real HTTP implementation in both modes. Node tests reset
handlers and registered scenario state after each test. Browser MSW does not
intercept Server Component queries or establish a real authenticated session.

See the [frontend documentation index](docs/frontend/README.md) for frontend guides and feature implementations.
See [frontend foundation implementation](docs/frontend/frontend-foundation-implementation.md)
for root/feature container setup, server session bootstrap, shell variants, and focused tests.

## Google authentication

Set the server-only `AUTH_URL` to the application's canonical origin:

```dotenv
# Development (.env or .env.development.local)
AUTH_URL=http://localhost:3000

# Production deployment environment
AUTH_URL=https://your-domain.example
```

Development defaults to `http://localhost:3000` when omitted; set it explicitly for
a different port or hostname. Production requires an explicit value at runtime.
Use the origin only, without credentials, a path, query, or fragment. The auth
base path remains `/api/v1/auth` in code. Startup rejects invalid configuration.
`AUTH_URL` is also read by Auth.js for OAuth URLs; register the matching Google
callback URI. Docker Compose forwards this variable with a localhost default for
the local container setup. Configure the deployed HTTPS origin before production
deployment. The variable stays server-only and can change between deployments
without rebuilding the browser bundle.

Set `AUTH_SECRET` to a private random value of at least 32 characters, then set
`AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` to a Google OAuth web client's credentials.
Register `http://localhost:3000/api/v1/auth/callback/google` as an authorized
redirect URI in Google Cloud for local development. Use the deployed origin with
the same path in production. Never commit the values to the repository.

`POST /api/v1/auth/google/start` starts Google OAuth, `GET
/api/v1/auth/callback/google` completes it, `GET /api/v1/auth/session` reads the
session snapshot, and `POST /api/v1/auth/sign-out` ends the current session. Both
POST routes require a same-origin `Origin` header. Use `redirectTo` on the start
route only with a local absolute path such as `/dashboard`. Auth.js stores an
HTTP-only, same-site database session cookie (`authjs.session-token`, Secure in
production). API responses expose the session record UUID, never the bearer
cookie token. A first Google login creates the user and linked account before
the session; later logins reuse the linkage.

The `(app)` server layout requires a session. Future onboarding pages belong under
that layout and allow `ONBOARDING_REQUIRED`. Future learning pages belong under
`(app)/(ready)` and redirect incomplete learners to `/onboarding`. No protected
page or onboarding form shipped in IMP-03. IMP-11 adds the guarded `/dashboard`
shell entry; login/onboarding and learning flows follow in later UI tasks. Backend
routes should call `requireApiAccess(request, 'AUTHENTICATED' | 'APP_READY')` for
their documented access level. The auth session endpoint stays public.
Anonymous page requests currently redirect to the public `/` starter page; the
`/login` entry and visible sign-in action belong to IMP-12.

For a disposable migrated MySQL database whose name ends in `_test`, run
`AUTH_TEST_DATABASE_URL=mysql://.../kotoba_auth_test bun run test:auth-adapter`.
This checks the adapter's user, account, session, and sign-out round trip and
removes its records afterward.

## OpenAI integration

IMP-08 supplies a server-only AI service for practice generation, free-response
grading, onboarding note normalization, and study recommendations. It uses the
Responses API, validates structured results against the supplied catalog context,
and records request/attempt metadata in MySQL. Application endpoints will consume
this service in IMP-09 and IMP-10.

Set `OPENAI_API_KEY` in your local `.env` or deployment secrets, select the two
models with `OPENAI_GENERATION_MODEL` and `OPENAI_NORMALIZATION_MODEL`, and apply
the AI observability migration before calling the service. ChatGPT Plus billing
is separate from this API-key integration. Tests use injected providers and need
no OpenAI account or credits.

See the [OpenAI setup and validation guide](docs/ai-integration.md) for prerequisites,
configuration limits, migration steps, isolated smoke testing, and rollout checks.

## Docker and MySQL

```sh
# Run only the local database alongside `bun run dev`:
docker compose up -d mysql

# Or build/run the production application and local MySQL together:
docker compose up --build -d
docker compose logs -f app

# Stop the containers; retain the database volume:
docker compose down
```

Compose publishes the app at `127.0.0.1:3000` and MySQL at `127.0.0.1:3306`. Default
credentials in `.env.example` are for local development. MySQL data persists in a
named volume. The app image uses a multi-stage Bun build, Next.js standalone output,
and an unprivileged runtime user. Source acquisitions and local secrets are outside
the Docker build context. The image excludes the development service worker.

Drizzle ORM, `mysql2`, Drizzle Kit, and a migration registry/config are installed.
**IMP-02** added the auth/user schema, versioned migration, and MySQL connection.
Startup validates the database URL and auth settings without opening a connection. Run
`bun run db:generate`, review SQL, then `bun run db:migrate` against the intended
database. See [migration notes](drizzle/README.md).

## Architecture and next tasks

- `src/app`: routes, layout, and provider composition.
- `src/frontend`: shared primitives and feature UI; MobX, `mobx-react-lite`, and
  Inversify are installed for the provider/store implementation in **IMP-11**.
- `src/backend`: backend context ownership; auth/user schemas, Google Auth.js
  adapter, and shared database bootstrap are available.
- `src/mocks`: shared browser/Node HTTP mock foundation.
- `content`: the existing canonical syllabus and flashcard data.

Read [AGENTS.md](AGENTS.md), [ARCHITECTURE.md](ARCHITECTURE.md), and the task's linked
documents before changing a feature. New module folders are created when needed.
**SYL-07 remains pending by the owner's instruction**; IMP-01 does not rely on its
personalization/mastery review or on the unfinished published lesson quiz banks.
Remaining feature API behavior belongs to IMP-04–IMP-10, and the complete app
shell/session store belongs to IMP-11. Minimal tokens and MockProvider are bootstrapped
here so styling and mock startup can be verified before those features exist.

Setup references: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation),
[Bun with Next.js](https://bun.sh/guides/ecosystem/nextjs),
[Drizzle configuration](https://orm.drizzle.team/docs/drizzle-config-file), and
[Bun Docker builds](https://bun.com/guides/ecosystem/docker).
