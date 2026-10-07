import { AuthorizationService } from '@/backend/auth/application/services/guard';
import {
  anonymousSession,
  readSessionToken,
  type SessionSnapshot,
} from '@/backend/auth/application/services/session';
import { RedirectPath } from '@/backend/auth/domain/value-objects/redirect-path';
import { readAuthEnv } from '@/backend/auth/infrastructure/config/auth-env';

const onboardingSession: SessionSnapshot = {
  isAuthenticated: true,
  sessionId: 'a7d83db0-1217-4c76-843b-52f5d8eed748',
  expiresAt: '2027-01-01T00:00:00.000Z',
  user: {
    id: 'b7d83db0-1217-4c76-843b-52f5d8eed748',
    email: 'learner@example.com',
    displayName: 'Learner',
    avatarUrl: null,
    emailVerified: true,
  },
  authorization: { appAccess: 'ONBOARDING_REQUIRED', onboardingCompleted: false },
};

const authorizationService = new AuthorizationService();

describe('auth access rules', () => {
  it('denies an anonymous protected request', () => {
    expect(authorizationService.authorize(anonymousSession, 'AUTHENTICATED')).toBe(
      'UNAUTHENTICATED',
    );
  });

  it('permits onboarding with a session and denies app-only resources', () => {
    expect(authorizationService.authorize(onboardingSession, 'AUTHENTICATED')).toBeNull();
    expect(authorizationService.authorize(onboardingSession, 'APP_READY')).toBe(
      'ONBOARDING_REQUIRED',
    );
  });

  it('allows app access after onboarding is complete', () => {
    expect(
      authorizationService.authorize(
        {
          ...onboardingSession,
          authorization: { appAccess: 'APP_READY', onboardingCompleted: true },
        },
        'APP_READY',
      ),
    ).toBeNull();
  });
});

describe('auth input boundaries', () => {
  it.each(['/dashboard', '/onboarding?step=2'])('accepts local redirect %s', (path) => {
    expect(RedirectPath.create(path)?.value).toBe(path);
  });

  it.each(['https://evil.test', '//evil.test', '/\\evil.test', '/dashboard\nHeader: injected'])(
    'rejects unsafe redirect %s',
    (path) => {
      expect(RedirectPath.create(path)).toBeNull();
    },
  );

  it('parses only the configured session cookie', () => {
    expect(readSessionToken('other=x; authjs.session-token=random-token; more=y')).toBe(
      'random-token',
    );
    expect(readSessionToken('other=random-token')).toBeNull();
  });

  it('rejects incomplete OAuth configuration without leaking values', () => {
    expect(() =>
      readAuthEnv({ AUTH_SECRET: 'short', AUTH_GOOGLE_ID: 'id', AUTH_GOOGLE_SECRET: 'secret' }),
    ).toThrow('AUTH_SECRET');
    expect(() => readAuthEnv({ AUTH_SECRET: 'a'.repeat(32), AUTH_GOOGLE_ID: 'id' })).toThrow(
      'AUTH_GOOGLE_SECRET',
    );
  });
});
