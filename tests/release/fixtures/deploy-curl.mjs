#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const config = JSON.parse(
  readFileSync(join(process.env.KOTOBA_DEPLOY_DIR, 'fixture.json'), 'utf8'),
);

if (config.failure === 'public-health' && process.argv.at(-1).startsWith('https:')) process.exit(1);
if (!process.argv.at(-1).endsWith('/api/v1/auth/session')) process.exit(0);

writeFileSync(
  1,
  JSON.stringify({
    status: { code: 120001000, traceId: 'health-trace', errorDetails: [] },
    data: {
      isAuthenticated: false,
      sessionId: null,
      expiresAt: null,
      user: null,
      authorization: { appAccess: 'ANONYMOUS', onboardingCompleted: null },
      ...(config.failure === 'session-envelope' ? { user: { email: 'wrong@example.com' } } : {}),
    },
  }),
);
