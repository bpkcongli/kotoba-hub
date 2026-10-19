export type AppAccess = 'ANONYMOUS' | 'ONBOARDING_REQUIRED' | 'APP_READY';

export interface SessionSnapshot {
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
  authorization: { appAccess: AppAccess; onboardingCompleted: boolean | null };
}

export const anonymousSession: SessionSnapshot = {
  isAuthenticated: false,
  sessionId: null,
  expiresAt: null,
  user: null,
  authorization: { appAccess: 'ANONYMOUS', onboardingCompleted: null },
};

export interface SessionService {
  getSnapshot(cookieHeader: string | null): Promise<SessionSnapshot>;

  revoke(token: string): Promise<void>;
}
