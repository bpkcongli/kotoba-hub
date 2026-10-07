import type { AppAccess, SessionSnapshot } from '@/backend/auth/application/services/session';

export interface SessionResponseDto {
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

export function toSessionResponseDto(snapshot: SessionSnapshot): SessionResponseDto {
  return {
    isAuthenticated: snapshot.isAuthenticated,
    sessionId: snapshot.sessionId,
    expiresAt: snapshot.expiresAt,
    user: snapshot.user
      ? {
          id: snapshot.user.id,
          email: snapshot.user.email,
          displayName: snapshot.user.displayName,
          avatarUrl: snapshot.user.avatarUrl,
          emailVerified: snapshot.user.emailVerified,
        }
      : null,
    authorization: {
      appAccess: snapshot.authorization.appAccess,
      onboardingCompleted: snapshot.authorization.onboardingCompleted,
    },
  };
}
