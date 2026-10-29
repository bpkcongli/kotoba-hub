import { AxiosError } from 'axios';
import { delay, http, HttpResponse } from 'msw';
import { anonymousSessionResponse } from '@tests/fixtures/anonymous-session';
import { AxiosHttpClient } from '@/frontend/shared/adapters/http-client';
import { normalizeHttpError } from '@/frontend/shared/adapters/http-client/helpers';
import { ApiException, ServerException } from '@/frontend/shared/exceptions';
import { presentError } from '@/frontend/shared/helpers';
import { AppSessionService } from '@/frontend/shared/services/external';
import { server } from '@/mocks/msw.node';

const origin = 'http://localhost:3000/api/v1';

function createClient(requestTimeoutMs = 1000) {
  return new AxiosHttpClient({ apiBasePath: '/api/v1', requestTimeoutMs });
}

function apiError(code: number, traceId: string, field?: string) {
  return {
    status: {
      code,
      traceId,
      message: 'Review your input.',
      errorDetails: field ? [{ field, message: 'Choose a published level.' }] : [],
    },
  };
}

test('uses the real HTTP adapter and validates the session success envelope', async () => {
  const expected = anonymousSessionResponse();

  server.use(http.get(`${origin}/auth/session`, () => HttpResponse.json(expected)));

  const service = new AppSessionService(createClient());

  await expect(service.getSession()).resolves.toEqual(expected.data);

  server.use(http.get(`${origin}/auth/session`, () => HttpResponse.json({ data: expected.data })));

  await expect(service.getSession()).rejects.toMatchObject({ kind: 'contract' });
});

test('retains validation details and trace IDs for actionable inline errors', async () => {
  const traceId = '550e8400-e29b-41d4-a716-446655440001';

  server.use(
    http.post(`${origin}/personalization/assessment`, () =>
      HttpResponse.json(apiError(142203001, traceId, 'targetLevel'), { status: 422 }),
    ),
  );

  const error = await createClient()
    .request({ method: 'POST', path: '/personalization/assessment', body: {} })
    .catch((failure: unknown) => failure);

  expect(error).toBeInstanceOf(ApiException);
  expect(presentError(error)).toEqual({
    message: 'Review your input.',
    code: 142203001,
    traceId,
    fieldErrors: [{ field: 'targetLevel', message: 'Choose a published level.' }],
  });
});

test('keeps metadata isolated for concurrent unauthorized and forbidden responses', async () => {
  const unauthorizedTrace = '550e8400-e29b-41d4-a716-446655440002';
  const forbiddenTrace = '550e8400-e29b-41d4-a716-446655440003';

  server.use(
    http.get(`${origin}/progress/overview`, async () => {
      await delay(20);

      return HttpResponse.json(apiError(140101001, unauthorizedTrace), { status: 401 });
    }),
    http.get(`${origin}/syllabus`, () =>
      HttpResponse.json(apiError(140301001, forbiddenTrace), { status: 403 }),
    ),
  );

  const client = createClient();

  const [unauthorized, forbidden] = await Promise.all([
    client.request({ method: 'GET', path: '/progress/overview' }).catch((error: unknown) => error),
    client.request({ method: 'GET', path: '/syllabus' }).catch((error: unknown) => error),
  ]);

  expect(unauthorized).toMatchObject({
    failure: { httpStatus: 401, code: 140101001, traceId: unauthorizedTrace },
  });
  expect(forbidden).toMatchObject({
    failure: { httpStatus: 403, code: 140301001, traceId: forbiddenTrace },
  });
});

test('uses a safe fallback for a non-JSON server failure', async () => {
  server.use(
    http.get(
      `${origin}/auth/session`,
      () => new HttpResponse('<html>private gateway detail</html>', { status: 502 }),
    ),
  );

  const error = await createClient()
    .request({ method: 'GET', path: '/auth/session' })
    .catch((failure: unknown) => failure);

  expect(error).toBeInstanceOf(ServerException);
  expect(presentError(error)).toMatchObject({ code: null, traceId: null, fieldErrors: [] });
  expect(presentError(error).message).not.toContain('private gateway detail');
});

test('normalizes Axios timeouts and distinguishes intentional cancellation', async () => {
  server.use(
    http.get(`${origin}/auth/session`, async () => {
      await delay(50);

      return HttpResponse.json(anonymousSessionResponse());
    }),
  );

  expect(normalizeHttpError(new AxiosError('request timed out', 'ECONNABORTED'))).toMatchObject({
    kind: 'timeout',
  });

  const controller = new AbortController();
  const pending = createClient().request({
    method: 'GET',
    path: '/auth/session',
    signal: controller.signal,
  });

  controller.abort();

  await expect(pending).rejects.toMatchObject({ kind: 'cancelled' });
});

test('accepts the sign-out envelope without inventing response data', async () => {
  const service = new AppSessionService(createClient());

  server.use(
    http.post(`${origin}/auth/sign-out`, () =>
      HttpResponse.json({ status: anonymousSessionResponse().status }),
    ),
  );

  await expect(service.signOut()).resolves.toBeUndefined();
});

test('normalizes a failed connection without exposing an Axios error to the UI', async () => {
  server.use(http.get(`${origin}/auth/session`, () => HttpResponse.error()));
  jest.spyOn(console, 'error').mockImplementation(() => undefined);

  await expect(
    createClient().request({ method: 'GET', path: '/auth/session' }),
  ).rejects.toMatchObject({ kind: 'network' });
});
