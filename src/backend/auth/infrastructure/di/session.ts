import { SessionService } from '@/backend/auth/application/services/session';
import { authSessionRepository } from '@/backend/auth/interface/secondary/persistence/auth-session.repository';
import { authUserRepository } from '@/backend/users/interface/secondary/persistence/auth-user.repository';

const sessionService = new SessionService(authSessionRepository, authUserRepository);

export const getSessionSnapshot = (cookieHeader: string | null) =>
  sessionService.getSnapshot(cookieHeader);

export const revokeSession = (token: string) => sessionService.revoke(token);
