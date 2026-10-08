import { SessionService } from '@/backend/auth/application/services/session';
import { AuthSession } from '@/backend/auth/domain/entities/auth-session';
import type { AuthSessionRepository } from '@/backend/auth/domain/repositories/auth-session.repository';
import type { AuthUserPort } from '@/backend/users/application/ports/auth-user.port';
import { AuthUser } from '@/backend/users/domain/entities/auth-user';

const sessionRepository: AuthSessionRepository = {
  findByToken: jest.fn(),
  deleteByToken: jest.fn(),
};
const userPort: AuthUserPort = {
  create: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  update: jest.fn(),
  recordLogin: jest.fn(),
  isOnboardingComplete: jest.fn(),
};
const sessionService = new SessionService(sessionRepository, userPort);

describe('auth session entity', () => {
  it('expires at the exact boundary and keeps its expiration immutable', () => {
    const expiresAt = new Date('2026-01-01T00:00:00Z');
    const session = new AuthSession({ id: 'session-uuid', userId: 'user-uuid', expiresAt });

    expiresAt.setFullYear(2099);
    session.expiresAt.setFullYear(2099);

    expect(session.isExpired(new Date('2025-12-31T23:59:59Z'))).toBe(false);
    expect(session.isExpired(new Date('2026-01-01T00:00:00Z'))).toBe(true);
    expect(session.expiresAt.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });
});

beforeEach(() => {
  jest.mocked(sessionRepository.findByToken).mockResolvedValue(
    new AuthSession({
      id: 'session-uuid',
      userId: 'user-uuid',
      expiresAt: new Date('2099-01-01T00:00:00Z'),
    }),
  );
  jest.mocked(userPort.findById).mockResolvedValue(
    new AuthUser({
      id: 'user-uuid',
      email: 'learner@example.com',
      displayName: 'Learner',
      avatarUrl: null,
      emailVerified: true,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    }),
  );
  jest.mocked(userPort.isOnboardingComplete).mockResolvedValue(false);
});

describe('database session snapshot', () => {
  it('returns anonymous without querying storage when no session cookie exists', async () => {
    const snapshot = await sessionService.getSnapshot('other=value');

    expect(snapshot.authorization.appAccess).toBe('ANONYMOUS');
    expect(sessionRepository.findByToken).not.toHaveBeenCalled();
  });

  it('returns the record UUID and users-owned onboarding state without exposing bearer token', async () => {
    const snapshot = await sessionService.getSnapshot('authjs.session-token=private-bearer-token');

    expect(sessionRepository.findByToken).toHaveBeenCalledWith('private-bearer-token');
    expect(snapshot.sessionId).toBe('session-uuid');
    expect(snapshot.authorization).toEqual({
      appAccess: 'ONBOARDING_REQUIRED',
      onboardingCompleted: false,
    });
    expect(JSON.stringify(snapshot)).not.toContain('private-bearer-token');
  });

  it('returns APP_READY after users reports completed onboarding', async () => {
    jest.mocked(userPort.isOnboardingComplete).mockResolvedValueOnce(true);
    const snapshot = await sessionService.getSnapshot('authjs.session-token=token');

    expect(snapshot.authorization.appAccess).toBe('APP_READY');
  });

  it('treats an expired database session as anonymous', async () => {
    jest.mocked(sessionRepository.findByToken).mockResolvedValueOnce(
      new AuthSession({
        id: 'session-uuid',
        userId: 'user-uuid',
        expiresAt: new Date('2020-01-01T00:00:00Z'),
      }),
    );
    const snapshot = await sessionService.getSnapshot('authjs.session-token=token');

    expect(snapshot.isAuthenticated).toBe(false);
    expect(userPort.findById).not.toHaveBeenCalled();
  });
});
