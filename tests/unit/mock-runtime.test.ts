import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/msw.node';
import { registerMockStateReset, resetMockState } from '@/mocks/states/reset';
import { anonymousSessionResponse } from '../fixtures/anonymous-session';

const sessionUrl = 'http://localhost:3000/api/v1/auth/session';

test('intercepts native fetch using a contract-backed per-test handler', async () => {
  const responseBody = anonymousSessionResponse();
  server.use(http.get(sessionUrl, () => HttpResponse.json(responseBody)));

  const response = await fetch(sessionUrl);

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual(responseBody);
});

test('restores handlers and mutable scenario state independently', async () => {
  let visits = 0;
  const unregister = registerMockStateReset(() => {
    visits = 0;
  });

  try {
    const baselineHandler = http.get(sessionUrl, () => {
      visits += 1;
      return HttpResponse.json(anonymousSessionResponse());
    });
    server.resetHandlers(baselineHandler);
    server.use(http.get(sessionUrl, () => new HttpResponse(null, { status: 503 })));

    expect((await fetch(sessionUrl)).status).toBe(503);
    server.resetHandlers(baselineHandler);
    expect((await fetch(sessionUrl)).status).toBe(200);
    expect(visits).toBe(1);

    resetMockState();
    expect(visits).toBe(0);
  } finally {
    unregister();
  }
});
