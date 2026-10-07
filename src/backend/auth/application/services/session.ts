import type { AuthSessionPort } from '@/backend/auth/application/ports/auth-session.port';
import { SESSION_COOKIE_NAME } from '@/backend/auth/infrastructure/config/auth-cookie';
import type { AuthUserPort } from '@/backend/users/application/ports/auth-user.port';

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

export function readSessionToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  for (const item of cookieHeader.split(';')) {
    const separator = item.indexOf('=');
    if (separator < 0 || item.slice(0, separator).trim() !== SESSION_COOKIE_NAME) continue;

    try {
      return decodeURIComponent(item.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }

  return null;
}

export class SessionService {
  constructor(
    private readonly sessionPort: AuthSessionPort,
    private readonly userPort: AuthUserPort,
  ) {}

  async getSnapshot(cookieHeader: string | null): Promise<SessionSnapshot> {
    const token = readSessionToken(cookieHeader);
    if (!token) return anonymousSession;

    const session = await this.sessionPort.findByToken(token);
    if (!session || session.isExpired()) return anonymousSession;

    const user = await this.userPort.findById(session.userId);
    if (!user) return anonymousSession;

    const onboardingCompleted = await this.userPort.isOnboardingComplete(user.id);

    return {
      isAuthenticated: true,
      sessionId: session.id,
      expiresAt: session.expiresAt.toISOString(),
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
      },
      authorization: {
        appAccess: onboardingCompleted ? 'APP_READY' : 'ONBOARDING_REQUIRED',
        onboardingCompleted,
      },
    };
  }

  async revoke(token: string): Promise<void> {
    await this.sessionPort.deleteByToken(token);
  }
}
