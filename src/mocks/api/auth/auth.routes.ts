import { http, HttpResponse } from 'msw';
import { anonymousSessionFixture } from '@/mocks/fixtures/session';
import { getMockSession, setMockSession } from '@/mocks/states/session';

function status() {
  return {
    traceId: crypto.randomUUID(),
    code: 120001000,
    message: 'Success!',
    errorDetails: [],
  };
}

export const authHandlers = [
  http.get('*/api/v1/auth/session', () =>
    HttpResponse.json({ status: status(), data: getMockSession() }),
  ),
  http.post('*/api/v1/auth/sign-out', () => {
    setMockSession(anonymousSessionFixture());

    return HttpResponse.json({ status: status() });
  }),
];
