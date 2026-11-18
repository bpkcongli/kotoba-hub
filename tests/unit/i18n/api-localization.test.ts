import { presentResponse, requestUiLocale } from '@/app/api/present-response';
import { withLocalizedResponse } from '@/app/api/with-localized-response';
import { getSessionSnapshot } from '@/backend/auth/infrastructure/di';
import {
  ApplicationStatusCode,
  applicationStatus,
} from '@/backend/shared/interface/primary/rest/api-status';
import {
  localizeApiResponse,
  localizeValidationMessage,
} from '@/backend/shared/interface/primary/rest/localize-response';
import { apiResponse } from '@/backend/shared/interface/primary/rest/response';
import { userPreferencesService } from '@/backend/users/infrastructure/di';

jest.mock('@/backend/auth/infrastructure/di', () => ({ getSessionSnapshot: jest.fn() }));
jest.mock('@/backend/users/infrastructure/di', () => ({
  userPreferencesService: { get: jest.fn() },
}));

const session = jest.mocked(getSessionSnapshot);
const preferences = jest.mocked(userPreferencesService.get);

beforeEach(() => {
  jest.resetAllMocks();
});

test('all status codes have translations while HTTP status, code, trace and error fields remain stable', async () => {
  for (const code of Object.keys(applicationStatus).map(Number) as ApplicationStatusCode[]) {
    const original = apiResponse(
      code,
      undefined,
      [{ field: 'userAnswer', message: 'A text answer is required.' }],
      'fixed-trace',
    );

    const localized = await localizeApiResponse(original, 'id');

    expect(localized.status).toBe(original.status);
    expect(localized.headers.get('Cache-Control')).toBe('private, no-store');
    expect(localized.headers.get('Content-Language')).toBe('id');

    const body = await localized.json();

    expect(body.status).toMatchObject({
      code,
      traceId: 'fixed-trace',
      errorDetails: [{ field: 'userAnswer', message: 'Jawaban teks diperlukan.' }],
    });
    expect(body.status.message).not.toBe(applicationStatus[code].message);
  }
});

test('localizes parameterized validation without changing identifiers and preserves legacy English detail text', () => {
  expect(localizeValidationMessage('Too small: expected number to be >=1', 'id')).toBe(
    'Nilai minimal 1.',
  );
  expect(
    localizeValidationMessage('Too big: expected string to have <=2000 characters', 'id'),
  ).toBe('Gunakan maksimal 2.000 karakter.');
  expect(localizeValidationMessage('Too small: expected number to be >0', 'id')).toBe(
    'Nilai harus lebih dari 0.',
  );
  expect(localizeValidationMessage('Idempotency-Key must be a UUID.', 'id')).toBe(
    'Idempotency-Key harus berupa UUID.',
  );
  expect(localizeValidationMessage('Invalid option: expected one of "JA"|"ID"', 'id')).toBe(
    'Pilih salah satu: "JA"|"ID".',
  );
  expect(localizeValidationMessage('Unknown new schema issue', 'id')).toBe(
    'Nilai tidak valid. Periksa kembali data yang dikirim.',
  );
  expect(
    localizeValidationMessage('Too big: expected string to have <=2000 characters', 'en'),
  ).toBe('Too big: expected string to have <=2000 characters');
});

test('preserves metadata, cookie headers and stored content snapshots', async () => {
  const data = {
    sessionId: 'same-session',
    feedbackText: 'Frozen English feedback.',
    language: { instructionLocale: 'en' },
    numericScore: 100,
    currentBucket: 'MASTERED',
  };
  const metadata = { pagination: { pageNumber: 1, pageSize: 10, totalRecords: 1 } };
  const response = Response.json(
    {
      status: {
        code: ApplicationStatusCode.PRACTICE_SUCCESS,
        traceId: 'trace',
        message: 'Success!',
        errorDetails: [],
      },
      metadata,
      data,
    },
    { headers: { 'Set-Cookie': 'example=value; HttpOnly; Path=/' } },
  );

  const localized = await localizeApiResponse(response, 'id');

  expect(await localized.json()).toMatchObject({ data, metadata });
  expect(localized.headers.getSetCookie()).toEqual(response.headers.getSetCookie());

  const redirect = new Response(null, { status: 302, headers: { Location: '/login' } });

  expect(await localizeApiResponse(redirect, 'id')).toBe(redirect);
});

test('explicit UI locale wins; an unsupported header falls back to stored account preference', async () => {
  session.mockResolvedValue({ user: { id: 'user' } } as Awaited<
    ReturnType<typeof getSessionSnapshot>
  >);
  preferences.mockResolvedValue({ uiLocale: 'id', contentLocale: 'en' });

  expect(
    await requestUiLocale(
      new Request('https://app.test/api', {
        headers: {
          'X-UI-Locale': 'en',
          Cookie: 'authjs.session-token=test; kotobahub-ui-locale=id',
        },
      }),
    ),
  ).toBe('en');
  expect(session).not.toHaveBeenCalled();

  expect(
    await requestUiLocale(
      new Request('https://app.test/api', {
        headers: {
          'X-UI-Locale': 'fr',
          Cookie: 'authjs.session-token=test; kotobahub-ui-locale=en',
        },
      }),
    ),
  ).toBe('id');
  expect(preferences).toHaveBeenCalledWith('user');
});

test('anonymous locale uses only the validated cookie and defaults to English', async () => {
  session.mockResolvedValue({ user: null } as Awaited<ReturnType<typeof getSessionSnapshot>>);

  expect(
    await requestUiLocale(
      new Request('https://app.test/api', { headers: { Cookie: 'kotobahub-ui-locale=id' } }),
    ),
  ).toBe('id');

  expect(
    await requestUiLocale(
      new Request('https://app.test/api', {
        headers: { Cookie: 'kotobahub-ui-locale=fr', 'Accept-Language': 'id-ID' },
      }),
    ),
  ).toBe('en');
  expect(preferences).not.toHaveBeenCalled();
});

test('origin-denied presentation never reads a session or preferences', async () => {
  const request = new Request('https://app.test/api', {
    method: 'POST',
    headers: {
      Cookie: 'authjs.session-token=test',
      'X-UI-Locale': 'id',
      Origin: 'https://evil.test',
    },
  });

  const response = await presentResponse(
    request,
    apiResponse(ApplicationStatusCode.ORIGIN_NOT_ALLOWED),
  );

  expect(response.status).toBe(403);
  expect((await response.json()).status.message).toBe('Asal permintaan tidak diizinkan.');
  expect(session).not.toHaveBeenCalled();
  expect(preferences).not.toHaveBeenCalled();
});

test('wrapped async handlers receive the original request and promised route parameters', async () => {
  const request = new Request('https://app.test/api/sessions/session-id', {
    method: 'POST',
    headers: { 'X-UI-Locale': 'id' },
    body: JSON.stringify({ answer: '日本語' }),
  });
  const context = { params: Promise.resolve({ sessionId: 'session-id' }) };
  const handler = jest.fn(
    async (received: Request, route: { params: Promise<{ sessionId: string }> }) => {
      const { sessionId } = await route.params;
      return apiResponse(ApplicationStatusCode.PRACTICE_SUCCESS, {
        sessionId,
        answer: (await received.json()).answer,
      });
    },
  );

  const response = await withLocalizedResponse(handler)(request, context);

  expect(handler).toHaveBeenCalledTimes(1);
  expect(handler).toHaveBeenCalledWith(request, context);
  expect(response.headers.get('Content-Language')).toBe('id');
  expect(await response.json()).toMatchObject({
    status: { code: ApplicationStatusCode.PRACTICE_SUCCESS, message: 'Berhasil!' },
    data: { sessionId: 'session-id', answer: '日本語' },
  });
});

test.each([
  ApplicationStatusCode.ORIGIN_NOT_ALLOWED,
  ApplicationStatusCode.USER_PROFILE_ORIGIN_NOT_ALLOWED,
  ApplicationStatusCode.PROGRESS_UNAUTHORIZED,
])('wrapped early response %s skips locale account lookups', async (code) => {
  const request = new Request('https://app.test/api', {
    headers: { Cookie: 'authjs.session-token=test; kotobahub-ui-locale=id' },
  });

  const response = await withLocalizedResponse(() => apiResponse(code))(request);

  expect(response.status).toBe(applicationStatus[code].httpStatus);
  expect(response.headers.get('Content-Language')).toBe('id');
  expect((await response.json()).status.code).toBe(code);
  expect(session).not.toHaveBeenCalled();
  expect(preferences).not.toHaveBeenCalled();
});

test('wrapped redirects retain response identity and cookies without locale lookups', async () => {
  const redirect = new Response(null, { status: 302, headers: { Location: '/dashboard' } });
  redirect.headers.append('Set-Cookie', 'oauth-state=; Max-Age=0; HttpOnly; Path=/');
  redirect.headers.append('Set-Cookie', 'authjs.session-token=token; HttpOnly; Path=/');

  const response = await withLocalizedResponse(() => redirect)(
    new Request('https://app.test/api', { headers: { Cookie: 'authjs.session-token=token' } }),
  );

  expect(response).toBe(redirect);
  expect(response.headers.getSetCookie()).toHaveLength(2);
  expect(session).not.toHaveBeenCalled();
  expect(preferences).not.toHaveBeenCalled();
});

test.each([false, true])(
  'wrapped handler exceptions propagate unchanged (async: %s)',
  async (async) => {
    const failure = new Error('handler failed');
    const handler = withLocalizedResponse(() => {
      if (async) return Promise.reject(failure);
      throw failure;
    });

    await expect(handler(new Request('https://app.test/api'))).rejects.toBe(failure);
    expect(session).not.toHaveBeenCalled();
    expect(preferences).not.toHaveBeenCalled();
  },
);
