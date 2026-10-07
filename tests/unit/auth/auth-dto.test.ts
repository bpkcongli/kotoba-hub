import { readGoogleCallbackRequest } from '@/backend/auth/interface/primary/rest/dto/google-callback.request.dto';
import { toSessionResponseDto } from '@/backend/auth/interface/primary/rest/dto/session.response.dto';

describe('auth REST DTOs', () => {
  it('keeps an empty provider error distinct from an absent error', () => {
    expect(readGoogleCallbackRequest(new URLSearchParams('error=&code=oauth-code'))).toEqual({
      code: 'oauth-code',
      state: null,
      error: '',
    });
    expect(readGoogleCallbackRequest(new URLSearchParams('code=oauth-code'))).toEqual({
      code: 'oauth-code',
      state: null,
      error: null,
    });
  });

  it('includes only contracted session fields in the API response', () => {
    const snapshot = Object.assign(
      {
        isAuthenticated: true,
        sessionId: 'session-id',
        expiresAt: '2026-10-08T00:00:00.000Z',
        user: Object.assign(
          {
            id: 'user-id',
            email: 'learner@example.com',
            displayName: 'Learner',
            avatarUrl: null,
            emailVerified: true,
          },
          { accessToken: 'private-token' },
        ),
        authorization: { appAccess: 'APP_READY' as const, onboardingCompleted: true },
      },
      { sessionToken: 'private-token' },
    );

    const response = toSessionResponseDto(snapshot);

    expect(response).toEqual({
      isAuthenticated: true,
      sessionId: 'session-id',
      expiresAt: '2026-10-08T00:00:00.000Z',
      user: {
        id: 'user-id',
        email: 'learner@example.com',
        displayName: 'Learner',
        avatarUrl: null,
        emailVerified: true,
      },
      authorization: { appAccess: 'APP_READY', onboardingCompleted: true },
    });
    expect(JSON.stringify(response)).not.toContain('private-token');
  });
});
