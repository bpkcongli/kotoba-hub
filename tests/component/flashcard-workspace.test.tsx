import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  FlashcardsHub,
  FlashcardSessionScreen,
  FlashcardSummaryScreen,
} from '@/frontend/flashcards/features';
import { FlashcardRouteScope } from '@/frontend/flashcards/providers';
import { AppWorkspace } from '@/frontend/shared/components/layouts';
import { FrontendContainerProvider } from '@/frontend/shared/providers';
import { appReadySessionFixture } from '@/mocks/fixtures/session';
import { setMockSession } from '@/mocks/states/session';

let pathname = '/flashcards';
const push = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push, replace: jest.fn(), refresh: jest.fn() }),
}));

function Workspace() {
  const sessionId = pathname.split('/')[3];
  const feature = pathname.endsWith('/summary') ? (
    <FlashcardSummaryScreen sessionId={sessionId} />
  ) : sessionId ? (
    <FlashcardSessionScreen sessionId={sessionId} />
  ) : pathname === '/flashcards' ? (
    <FlashcardsHub />
  ) : (
    <p>Dashboard content</p>
  );

  return (
    <FrontendContainerProvider bootstrap={{ session: appReadySessionFixture() }}>
      <FlashcardRouteScope>
        <AppWorkspace>{feature}</AppWorkspace>
      </FlashcardRouteScope>
    </FrontendContainerProvider>
  );
}

test('preserves session across shell navigation through summary and releases it on feature exit', async () => {
  pathname = '/flashcards';
  setMockSession(appReadySessionFixture());

  const user = userEvent.setup();
  const view = render(<Workspace />);
  await screen.findByRole('combobox', { name: 'Deck' });
  await user.click(screen.getByRole('button', { name: 'Start session' }));
  await waitFor(() => expect(push).toHaveBeenCalled());

  const sessionPath = push.mock.lastCall![0] as string;
  pathname = sessionPath;
  view.rerender(<Workspace />);

  expect(await screen.findByRole('region', { name: 'Current flashcard' })).toBeInTheDocument();
  expect(screen.getAllByRole('main')).toHaveLength(1);
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument();

  for (const action of ['Next card', 'View summary']) {
    await user.click(screen.getByRole('radio', { name: 'a' }));
    await user.click(screen.getByRole('button', { name: 'Check answer' }));
    await user.click(await screen.findByRole('button', { name: action }));
  }

  pathname = `${sessionPath}/summary`;
  view.rerender(<Workspace />);

  expect(screen.getByRole('heading', { name: 'Session complete' })).toBeInTheDocument();
  expect(screen.getByText('2/2')).toBeInTheDocument();

  pathname = '/dashboard';
  view.rerender(<Workspace />);

  expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument();

  pathname = sessionPath;
  view.rerender(<Workspace />);

  expect(
    screen.getByRole('heading', { name: 'This session is not open here' }),
  ).toBeInTheDocument();
});
