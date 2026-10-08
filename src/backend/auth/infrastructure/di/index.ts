import { SessionService } from '@/backend/auth/application/services/session';
import { authSessionRepository } from '@/backend/auth/interface/secondary/persistence/drizzle-auth-session.repository';
import { authUserService } from '@/backend/users/infrastructure/di';

const sessionService = new SessionService(authSessionRepository, authUserService);

export const getSessionSnapshot = (cookieHeader: string | null) =>
  sessionService.getSnapshot(cookieHeader);

export const revokeSession = (token: string) => sessionService.revoke(token);
