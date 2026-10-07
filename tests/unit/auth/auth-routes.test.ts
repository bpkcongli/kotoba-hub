import { cookies } from 'next/headers';
import { POST as startGoogle } from '@/app/api/v1/auth/google/start/route';
import { GET as getSession } from '@/app/api/v1/auth/session/route';
import { POST as signOutRoute } from '@/app/api/v1/auth/sign-out/route';
import { anonymousSession } from '@/backend/auth/application/services/session';
import { signIn, signOut } from '@/backend/auth/infrastructure/config/auth';
import { getSessionSnapshot, revokeSession } from '@/backend/auth/infrastructure/di/session';
import { requireApiAccess } from '@/backend/auth/interface/primary/rest/guard';

jest.mock('@/backend/auth/infrastructure/config/auth', () => ({
  signIn: jest.fn(),
  signOut: jest.fn(),
}));
jest.mock('@/backend/auth/infrastructure/di/session', () => ({
  getSessionSnapshot: jest.fn(async () => ({
    isAuthenticated: false,
    sessionId: null,
    expiresAt: null,
    user: null,
    authorization: { appAccess: 'ANONYMOUS', onboardingCompleted: null },
  })),
  revokeSession: jest.fn(),
}));
jest.mock('@/backend/auth/infrastructure/config/auth-env', () => ({ readAuthEnv: jest.fn() }));
jest.mock('next/headers', () => ({ cookies: jest.fn() }));

const sameOrigin = { Origin: 'http://localhost:3000' };

describe('canonical auth routes', () => {
  it('returns the anonymous session envelope without a DB token', async () => {
    const response = await getSession(new Request('http://localhost:3000/api/v1/auth/session'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: {
        traceId: expect.any(String),
        code: 120001000,
        message: 'Success!',
        errorDetails: [],
      },
      data: anonymousSession,
    });
    expect(getSessionSnapshot).toHaveBeenCalledWith(null);
  });

  it('maps missing session to 401 and incomplete onboarding to 403', async () => {
    const request = new Request('http://localhost:3000/api/v1/progress/overview');
    const anonymous = await requireApiAccess(request, 'APP_READY');

    expect(anonymous.response?.status).toBe(401);
    expect((await anonymous.response?.json()).status.code).toBe(140101001);

    jest.mocked(getSessionSnapshot).mockResolvedValueOnce({
      isAuthenticated: true,
      sessionId: 'session-id',
      expiresAt: '2027-01-01T00:00:00Z',
      user: {
        id: 'user-id',
        email: 'learner@example.com',
        displayName: 'Learner',
        avatarUrl: null,
        emailVerified: true,
      },
      authorization: { appAccess: 'ONBOARDING_REQUIRED', onboardingCompleted: false },
    });
    const onboarding = await requireApiAccess(request, 'APP_READY');

    expect(onboarding.response?.status).toBe(403);
    expect((await onboarding.response?.json()).status.code).toBe(140301002);
  });

  it('rejects cross-origin sign-in before starting OAuth', async () => {
    const response = await startGoogle(
      new Request('http://localhost:3000/api/v1/auth/google/start', {
        method: 'POST',
        headers: { Origin: 'https://evil.test' },
      }),
    );

    expect(response.status).toBe(403);
    expect(signIn).not.toHaveBeenCalled();
  });

  it('accepts the request Host origin when Next canonicalizes the URL hostname', async () => {
    jest.mocked(signIn).mockResolvedValueOnce('https://accounts.google.com/authorize');
    const response = await startGoogle(
      new Request('http://localhost:3000/api/v1/auth/google/start', {
        method: 'POST',
        headers: { Origin: 'http://127.0.0.1:3000', Host: '127.0.0.1:3000' },
      }),
    );

    expect(response.status).toBe(302);
  });

  it('rejects unsafe redirectTo before starting OAuth', async () => {
    const response = await startGoogle(
      new Request('http://localhost:3000/api/v1/auth/google/start?redirectTo=%2F%2Fevil.test', {
        method: 'POST',
        headers: sameOrigin,
      }),
    );

    expect(response.status).toBe(422);
    expect(signIn).not.toHaveBeenCalled();
  });

  it('starts Google OAuth with a safe local return path', async () => {
    jest.mocked(signIn).mockResolvedValueOnce('https://accounts.google.com/authorize');
    const response = await startGoogle(
      new Request('http://localhost:3000/api/v1/auth/google/start?redirectTo=%2Fdashboard', {
        method: 'POST',
        headers: sameOrigin,
      }),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://accounts.google.com/authorize');
    expect(signIn).toHaveBeenCalledWith('google', { redirect: false, redirectTo: '/dashboard' });
  });

  it('makes same-origin sign-out idempotent', async () => {
    const setCookie = jest.fn();
    jest.mocked(cookies).mockResolvedValue({ set: setCookie } as never);
    jest.mocked(signOut).mockResolvedValue(undefined);
    const request = () =>
      new Request('http://localhost:3000/api/v1/auth/sign-out', {
        method: 'POST',
        headers: sameOrigin,
      });

    expect((await signOutRoute(request())).status).toBe(200);
    expect((await signOutRoute(request())).status).toBe(200);
    expect(signOut).toHaveBeenCalledTimes(2);
    expect(revokeSession).not.toHaveBeenCalled();
    expect(setCookie).toHaveBeenCalledWith(
      'authjs.session-token',
      '',
      expect.objectContaining({ maxAge: 0, httpOnly: true }),
    );
  });

  it('revokes an authenticated session before returning sign-out success', async () => {
    const setCookie = jest.fn();
    jest.mocked(cookies).mockResolvedValue({ set: setCookie } as never);
    jest.mocked(revokeSession).mockResolvedValueOnce(undefined);
    jest.mocked(signOut).mockResolvedValueOnce(undefined);

    const response = await signOutRoute(
      new Request('http://localhost:3000/api/v1/auth/sign-out', {
        method: 'POST',
        headers: { ...sameOrigin, Cookie: 'authjs.session-token=existing-token' },
      }),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).status.code).toBe(120001000);
    expect(revokeSession).toHaveBeenCalledWith('existing-token');
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(setCookie).toHaveBeenCalledWith(
      'authjs.session-token',
      '',
      expect.objectContaining({ maxAge: 0, httpOnly: true }),
    );
    expect(jest.mocked(revokeSession).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(signOut).mock.invocationCallOrder[0],
    );
  });

  it('keeps sign-out unsuccessful when DB revocation fails', async () => {
    jest.mocked(revokeSession).mockRejectedValueOnce(new Error('database unavailable'));
    const response = await signOutRoute(
      new Request('http://localhost:3000/api/v1/auth/sign-out', {
        method: 'POST',
        headers: { ...sameOrigin, Cookie: 'authjs.session-token=existing-token' },
      }),
    );

    expect(response.status).toBe(500);
    expect((await response.json()).status).toEqual({
      traceId: expect.any(String),
      code: 150001999,
      message: 'Unhandled auth exception.',
      errorDetails: [],
    });
    expect(signOut).not.toHaveBeenCalled();
  });

  it('maps an unexpected Auth.js sign-out failure to the generic auth exception', async () => {
    jest.mocked(signOut).mockRejectedValueOnce(new Error('Auth.js unavailable'));
    const response = await signOutRoute(
      new Request('http://localhost:3000/api/v1/auth/sign-out', {
        method: 'POST',
        headers: sameOrigin,
      }),
    );

    expect(response.status).toBe(500);
    expect((await response.json()).status).toEqual({
      traceId: expect.any(String),
      code: 150001999,
      message: 'Unhandled auth exception.',
      errorDetails: [],
    });
  });
});
