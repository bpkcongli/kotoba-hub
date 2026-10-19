import type { AuthUserPort } from '@/backend/auth/application/ports/auth-user.port';
import type { AuthorizationService } from '@/backend/auth/application/services/authorization.service';
import { AuthorizationServiceImpl } from '@/backend/auth/application/services/impl/authorization.service.impl';
import { SessionServiceImpl } from '@/backend/auth/application/services/impl/session.service.impl';
import type { SessionService } from '@/backend/auth/application/services/session.service';
import { authSessionRepository } from '@/backend/auth/interface/secondary/persistence/drizzle-auth-session.repository';
import { AuthUserAdapter } from '@/backend/auth/interface/secondary/users/auth-user.adapter';
import { authUserService } from '@/backend/users/infrastructure/di';

export const authUserAdapter: AuthUserPort = new AuthUserAdapter(authUserService);

export const authorizationService: AuthorizationService = new AuthorizationServiceImpl();

export const sessionService: SessionService = new SessionServiceImpl(
  authSessionRepository,
  authUserAdapter,
);

export const getSessionSnapshot = (cookieHeader: string | null) =>
  sessionService.getSnapshot(cookieHeader);

export const revokeSession = (token: string) => sessionService.revoke(token);
