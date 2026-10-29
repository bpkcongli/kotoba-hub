import { render, screen, within } from '@testing-library/react';
import {
  APP_NAVIGATION,
  AppBottomNav,
  AppHeader,
  AppShell,
  AppSidebar,
  AppWorkspace,
  FocusModeShell,
} from '@/frontend/shared/components/layouts';
import { FrontendContainerProvider } from '@/frontend/shared/providers';
import { appReadySessionFixture, onboardingSessionFixture } from '@/mocks/fixtures/session';

let pathname = '/dashboard';
const replace = jest.fn();
const refresh = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ replace, refresh }),
}));

test('provides one main landmark and a working keyboard skip destination', () => {
  render(
    <AppShell
      variant="app"
      header={<AppHeader title="Dashboard" />}
      sidebar={<AppSidebar pathname="/dashboard" />}
      bottomNav={<AppBottomNav pathname="/dashboard" />}>
      <p>今日の学習</p>
    </AppShell>,
  );

  const main = screen.getByRole('main');

  expect(main).toHaveTextContent('今日の学習');
  expect(main).toHaveAttribute('id', 'main-content');
  expect(screen.getByRole('link', { name: /skip/i })).toHaveAttribute('href', '#main-content');

  const desktopNavigation = screen.getByRole('navigation', { name: 'Primary navigation' });
  const mobileNavigation = screen.getByRole('navigation', { name: 'Mobile navigation' });

  for (const navigation of [desktopNavigation, mobileNavigation]) {
    expect(within(navigation).getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    expect(within(navigation).getByRole('link', { name: 'Syllabus' })).toHaveAttribute(
      'href',
      '/syllabus',
    );

    expect(within(navigation).getByRole('link', { name: 'Flashcards' })).toHaveAttribute(
      'href',
      '/flashcards',
    );

    for (const label of ['Practice', 'Progress']) {
      expect(within(navigation).getByText(label).closest('a')).toBeNull();
    }
  }

  expect(within(mobileNavigation).queryByText('Settings')).not.toBeInTheDocument();
  expect(screen.getByText('Settings').closest('a')).toBeNull();
});

test('matches a nested learning route without matching unrelated path prefixes', () => {
  const items = APP_NAVIGATION.map((item) => ({ ...item, available: true }));

  const { rerender } = render(
    <AppBottomNav pathname="/practice/sessions/session-123" items={items} />,
  );

  expect(screen.getByRole('link', { name: 'Practice' })).toHaveAttribute('aria-current', 'page');

  rerender(<AppBottomNav pathname="/practice-notes" items={items} />);

  expect(screen.getByRole('link', { name: 'Practice' })).not.toHaveAttribute('aria-current');
});

test('focus and onboarding shells retain their content without primary navigation', () => {
  const { rerender } = render(
    <FocusModeShell title="Practice" exitAction={<button>Exit practice</button>}>
      <p>Answer the current question.</p>
    </FocusModeShell>,
  );

  expect(screen.getByRole('main')).toHaveTextContent('Answer the current question.');
  expect(screen.getByRole('button', { name: 'Exit practice' })).toBeInTheDocument();
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument();

  rerender(
    <AppShell variant="onboarding" header={<AppHeader title="Your learning profile" />}>
      <p>Assessment form</p>
    </AppShell>,
  );

  expect(screen.getByRole('main')).toHaveTextContent('Assessment form');
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
});

test('flashcard session routes retain one focus shell inside the protected workspace', () => {
  pathname = '/flashcards/sessions/session-123';
  render(
    <FrontendContainerProvider bootstrap={{ session: appReadySessionFixture() }}>
      <AppWorkspace>
        <FocusModeShell title="Flashcards" exitAction={<button>Exit session</button>}>
          <p>Current card</p>
        </FocusModeShell>
      </AppWorkspace>
    </FrontendContainerProvider>,
  );

  expect(screen.getAllByRole('main')).toHaveLength(1);
  expect(screen.getByRole('main')).toHaveTextContent('Current card');
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
});

test('focus routes still redirect learners who need onboarding', () => {
  pathname = '/flashcards/sessions/session-123';
  render(
    <FrontendContainerProvider bootstrap={{ session: onboardingSessionFixture() }}>
      <AppWorkspace>
        <p>Protected flashcard</p>
      </AppWorkspace>
    </FrontendContainerProvider>,
  );

  expect(replace).toHaveBeenCalledWith('/onboarding');
  expect(screen.queryByText('Protected flashcard')).not.toBeInTheDocument();
});
