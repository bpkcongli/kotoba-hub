import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import {
  PracticeHub,
  PracticeSessionScreen,
  PracticeSummaryScreen,
} from '@/frontend/practice/features';
import { PracticeRouteScope } from '@/frontend/practice/providers';
import { AppWorkspace } from '@/frontend/shared/components/layouts';
import { FrontendContainerProvider } from '@/frontend/shared/providers';
import { practiceSessionFixture } from '@/mocks/fixtures/practice';
import { appReadySessionFixture } from '@/mocks/fixtures/session';
import { server } from '@/mocks/msw.node';
import { setMockSession } from '@/mocks/states/session';

let pathname = '/practice';
const push = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push, replace: jest.fn(), refresh: jest.fn() }),
}));

function Workspace() {
  const sessionId = pathname.split('/')[3];
  const feature = pathname.endsWith('/summary') ? (
    <PracticeSummaryScreen sessionId={sessionId} />
  ) : sessionId ? (
    <PracticeSessionScreen sessionId={sessionId} />
  ) : pathname === '/practice' ? (
    <PracticeHub />
  ) : (
    <p>Dashboard content</p>
  );
  const session = appReadySessionFixture();

  return (
    <FrontendContainerProvider bootstrap={{ session }}>
      <PracticeRouteScope>
        <AppWorkspace>{feature}</AppWorkspace>
      </PracticeRouteScope>
    </FrontendContainerProvider>
  );
}

test('leaving practice during regeneration does not navigate back to an earlier held session', async () => {
  pathname = '/practice';
  setMockSession(appReadySessionFixture());

  const user = userEvent.setup();
  const view = render(<Workspace />);

  await user.click(screen.getByRole('button', { name: 'Generate practice' }));
  await waitFor(() => expect(push).toHaveBeenCalledTimes(1));

  const originalPath = push.mock.lastCall![0] as string;

  pathname = originalPath;
  view.rerender(<Workspace />);
  pathname = '/practice';
  view.rerender(<Workspace />);

  expect(screen.getByRole('link', { name: 'Return to session' })).toHaveAttribute(
    'href',
    originalPath,
  );

  let started!: () => void;
  let release!: () => void;
  let finished!: () => void;
  const startedPromise = new Promise<void>((resolve) => {
    started = resolve;
  });
  const releasePromise = new Promise<void>((resolve) => {
    release = resolve;
  });
  const finishedPromise = new Promise<void>((resolve) => {
    finished = resolve;
  });

  server.use(
    http.post('http://localhost:3000/api/v1/practice/sessions/generate', async () => {
      started();
      await releasePromise;
      finished();

      return HttpResponse.json({
        status: {
          traceId: '550e8400-e29b-41d4-a716-446655440000',
          code: 120006000,
          message: 'Success!',
          errorDetails: [],
        },
        data: practiceSessionFixture(),
      });
    }),
  );

  await user.click(screen.getByRole('button', { name: 'Generate practice' }));
  await startedPromise;
  pathname = '/dashboard';
  view.rerender(<Workspace />);
  release();
  await finishedPromise;

  await waitFor(() => expect(screen.getByText('Dashboard content')).toBeInTheDocument());
  expect(push).toHaveBeenCalledTimes(1);
});

test('keeps the session while changing shells through summary and releases it after leaving practice', async () => {
  pathname = '/practice';
  setMockSession(appReadySessionFixture());

  const user = userEvent.setup();
  const view = render(<Workspace />);

  fireEvent.change(screen.getByRole('spinbutton', { name: 'Question count' }), {
    target: { value: '1' },
  });
  await user.click(screen.getByRole('button', { name: 'Generate practice' }));
  await waitFor(() => expect(push).toHaveBeenCalled());

  const sessionPath = push.mock.lastCall![0] as string;
  pathname = sessionPath;
  view.rerender(<Workspace />);

  expect(screen.getByRole('region', { name: 'Practice question' })).toBeInTheDocument();
  expect(screen.getAllByRole('main')).toHaveLength(1);
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument();

  await user.type(screen.getByRole('textbox', { name: 'Romaji or Japanese answer' }), 'ha');
  await user.click(screen.getByRole('button', { name: 'Check answer' }));
  await user.click(await screen.findByRole('button', { name: 'View summary' }));

  pathname = `${sessionPath}/summary`;
  view.rerender(<Workspace />);

  expect(screen.getByRole('heading', { name: 'Practice complete' })).toBeInTheDocument();
  expect(screen.getByText('1 of 1 questions answered')).toBeInTheDocument();

  pathname = '/dashboard';
  view.rerender(<Workspace />);

  expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument();

  pathname = sessionPath;
  view.rerender(<Workspace />);

  expect(screen.getByRole('link', { name: 'Start practice' })).toHaveAttribute('href', '/practice');
});
