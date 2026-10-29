import { anonymousAppSession, type AppSession } from '@/frontend/shared/interfaces/entities';

export function anonymousSessionFixture(): AppSession {
  return anonymousAppSession();
}

export function appReadySessionFixture(): AppSession {
  return {
    isAuthenticated: true,
    sessionId: '4c65b584-3361-4d9c-b8ea-f014a2b57727',
    expiresAt: '2099-01-01T00:00:00Z',
    user: {
      id: 'b9dcf359-8f44-4654-a78d-08af28318abc',
      email: 'learner@example.com',
      displayName: 'Demo learner',
      avatarUrl: null,
      emailVerified: true,
    },
    authorization: { appAccess: 'APP_READY', onboardingCompleted: true },
  };
}

export function onboardingSessionFixture(): AppSession {
  return {
    ...appReadySessionFixture(),
    authorization: { appAccess: 'ONBOARDING_REQUIRED', onboardingCompleted: false },
  };
}
