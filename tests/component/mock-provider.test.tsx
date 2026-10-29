import { act, render, screen, waitFor } from '@testing-library/react';
import { observer } from 'mobx-react-lite';
import { http, HttpResponse } from 'msw';
import { anonymousSessionResponse } from '@tests/fixtures/anonymous-session';
import { useAppSessionStore } from '@/frontend/shared/hooks';
import { FrontendContainerProvider } from '@/frontend/shared/providers/FrontendContainerProvider';
import { startMocking } from '@/mocks/main';
import { server } from '@/mocks/msw.node';

jest.mock('@/mocks/main', () => ({ startMocking: jest.fn() }));

let MockProvider: typeof import('@/frontend/shared/providers/MockProvider').MockProvider;

beforeAll(async () => {
  jest.replaceProperty(process, 'env', {
    ...process.env,
    NODE_ENV: 'development',
    NEXT_PUBLIC_API_MOCKING: 'true',
  });

  ({ MockProvider } = await import('@/frontend/shared/providers/MockProvider'));
});

const SessionStatus = observer(function SessionStatus() {
  const session = useAppSessionStore();

  return <p>Feature ready: {session.snapshot?.authorization.appAccess ?? 'UNKNOWN'}</p>;
});

test('holds feature requests until the development worker is ready', async () => {
  let ready!: () => void;

  jest.mocked(startMocking).mockReturnValue(
    new Promise<void>((resolve) => {
      ready = resolve;
    }),
  );

  const requested = jest.fn(() => HttpResponse.json(anonymousSessionResponse()));
  server.use(http.get('http://localhost:3000/api/v1/auth/session', requested));

  render(
    <MockProvider>
      <FrontendContainerProvider>
        <SessionStatus />
      </FrontendContainerProvider>
    </MockProvider>,
  );

  await waitFor(() => expect(startMocking).toHaveBeenCalledTimes(1));
  expect(screen.queryByText(/Feature ready/)).not.toBeInTheDocument();
  expect(requested).not.toHaveBeenCalled();

  await act(async () => {
    ready();
  });

  expect(await screen.findByText('Feature ready: ANONYMOUS')).toBeInTheDocument();
  await waitFor(() => expect(requested).toHaveBeenCalledTimes(1));
});

test('keeps features unmounted when worker startup fails', async () => {
  jest.mocked(startMocking).mockRejectedValue(new Error('Worker unavailable'));
  jest.spyOn(console, 'error').mockImplementation(() => undefined);

  render(
    <MockProvider>
      <FrontendContainerProvider>
        <SessionStatus />
      </FrontendContainerProvider>
    </MockProvider>,
  );

  expect(await screen.findByRole('alert')).toHaveTextContent('could not start');
  expect(screen.queryByText(/Feature ready/)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();
});
