import { server } from '@/mocks/msw.node';
import { isApplicationApiRequest } from '@/mocks/msw.router';
import { resetMockState } from '@/mocks/states/reset';

const unhandledApplicationRequests: string[] = [];

beforeAll(() => {
  server.listen({
    onUnhandledRequest(request, print) {
      if (isApplicationApiRequest(request)) {
        unhandledApplicationRequests.push(`${request.method} ${request.url}`);
        print.error();
      }
    },
  });
});

afterEach(() => {
  server.resetHandlers();
  resetMockState();
  // Fail even if a component catches the rejected request and renders an error.
  const unexpectedRequests = unhandledApplicationRequests.splice(0);
  expect(unexpectedRequests).toEqual([]);
});

afterAll(() => {
  server.close();
});
