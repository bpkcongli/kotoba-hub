export type AppAccess = 'ANONYMOUS' | 'ONBOARDING_REQUIRED' | 'APP_READY';

export interface AppSession {
  isAuthenticated: boolean;
  sessionId: string | null;
  expiresAt: string | null;
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    emailVerified: boolean;
  } | null;
  authorization: {
    appAccess: AppAccess;
    onboardingCompleted: boolean | null;
  };
}

export function anonymousAppSession(): AppSession {
  return {
    isAuthenticated: false,
    sessionId: null,
    expiresAt: null,
    user: null,
    authorization: { appAccess: 'ANONYMOUS', onboardingCompleted: null },
  };
}
