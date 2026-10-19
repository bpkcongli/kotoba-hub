import { readSessionToken } from '@/backend/auth/application/helpers/read-session-token';
import type { AuthUserPort } from '@/backend/auth/application/ports/auth-user.port';
import {
  anonymousSession,
  type SessionService,
  type SessionSnapshot,
} from '@/backend/auth/application/services/session.service';
import type { AuthSessionRepository } from '@/backend/auth/domain/repositories/auth-session.repository';

export class SessionServiceImpl implements SessionService {
  constructor(
    private readonly sessionRepository: AuthSessionRepository,
    private readonly userPort: AuthUserPort,
  ) {}

  async getSnapshot(cookieHeader: string | null): Promise<SessionSnapshot> {
    const token = readSessionToken(cookieHeader);
    if (!token) return anonymousSession;

    const session = await this.sessionRepository.findByToken(token);
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
    await this.sessionRepository.deleteByToken(token);
  }
}
