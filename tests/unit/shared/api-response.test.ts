import {
  ApplicationStatusCode,
  HttpStatusCode,
} from '@/backend/shared/interface/primary/rest/api-status';
import { apiResponse } from '@/backend/shared/interface/primary/rest/response';

describe('shared API response', () => {
  it.each([
    [ApplicationStatusCode.AUTH_SUCCESS, HttpStatusCode.OK, 'Success!'],
    [ApplicationStatusCode.AUTH_REQUIRED, HttpStatusCode.UNAUTHORIZED, 'Authentication required.'],
    [
      ApplicationStatusCode.GOOGLE_AUTH_FAILED,
      HttpStatusCode.UNAUTHORIZED,
      'Google authentication failed.',
    ],
    [
      ApplicationStatusCode.ORIGIN_NOT_ALLOWED,
      HttpStatusCode.FORBIDDEN,
      'Request origin is not allowed.',
    ],
    [
      ApplicationStatusCode.ONBOARDING_REQUIRED,
      HttpStatusCode.FORBIDDEN,
      'Complete onboarding to access this resource.',
    ],
    [
      ApplicationStatusCode.INVALID_REDIRECT_TO,
      HttpStatusCode.UNPROCESSABLE_ENTITY,
      'Invalid redirectTo.',
    ],
    [
      ApplicationStatusCode.INVALID_OAUTH_CALLBACK,
      HttpStatusCode.UNPROCESSABLE_ENTITY,
      'Invalid OAuth callback payload.',
    ],
    [
      ApplicationStatusCode.UNHANDLED_AUTH_EXCEPTION,
      HttpStatusCode.INTERNAL_SERVER_ERROR,
      'Unhandled auth exception.',
    ],
  ] as const)(
    'maps application code %s to HTTP %s and its contracted message',
    async (code, httpStatus, message) => {
      const response = apiResponse(code);
      const body = await response.json();

      expect(response.status).toBe(httpStatus);
      expect(body.status).toEqual({
        traceId: expect.any(String),
        code,
        message,
        errorDetails: [],
      });
    },
  );

  it('keeps validation details and optional data in the shared envelope', async () => {
    const response = apiResponse(ApplicationStatusCode.INVALID_REDIRECT_TO, { value: null }, [
      { field: 'redirectTo', message: 'Invalid relative path.' },
    ]);

    expect(response.status).toBe(HttpStatusCode.UNPROCESSABLE_ENTITY);
    expect(await response.json()).toEqual({
      status: {
        traceId: expect.any(String),
        code: ApplicationStatusCode.INVALID_REDIRECT_TO,
        message: 'Invalid redirectTo.',
        errorDetails: [{ field: 'redirectTo', message: 'Invalid relative path.' }],
      },
      data: { value: null },
    });
  });
});
