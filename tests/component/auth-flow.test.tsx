import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { OnboardingWorkspace } from '@/frontend/auth/components/organisms';
import { Login } from '@/frontend/auth/features';
import { FrontendContainerProvider } from '@/frontend/shared/providers';
import {
  anonymousSessionFixture,
  appReadySessionFixture,
  onboardingSessionFixture,
} from '@/mocks/fixtures/session';
import { server } from '@/mocks/msw.node';

const replace = jest.fn();
const refresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh }),
  usePathname: () => '/onboarding',
}));

test('starts Google login through a browser POST that can follow the OAuth redirect', () => {
  render(
    <FrontendContainerProvider bootstrap={{ session: anonymousSessionFixture() }}>
      <Login redirectTo="/dashboard" />
    </FrontendContainerProvider>,
  );

  const button = screen.getByRole('button', { name: 'Continue with Google' });
  const form = button.closest('form');

  expect(form).toHaveAttribute('method', 'post');
  expect(form).toHaveAttribute('action', '/api/v1/auth/google/start?redirectTo=%2Fdashboard');
  expect(button).toHaveAttribute('type', 'submit');
});

test.each([
  [onboardingSessionFixture(), '/onboarding'],
  [appReadySessionFixture(), '/dashboard'],
])(
  'redirects an existing login according to its authoritative access state',
  async (session, destination) => {
    render(
      <FrontendContainerProvider bootstrap={{ session }}>
        <Login />
      </FrontendContainerProvider>,
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith(destination));
  },
);

test('keeps onboarding visible after failed sign-out and leaves only after success', async () => {
  const user = userEvent.setup();
  const session = onboardingSessionFixture();

  server.use(
    http.post('http://localhost:3000/api/v1/auth/sign-out', () =>
      HttpResponse.json(
        {
          status: {
            traceId: '550e8400-e29b-41d4-a716-446655440009',
            code: 150001999,
            message: 'Could not end the session. Please try again.',
            errorDetails: [],
          },
        },
        { status: 500 },
      ),
    ),
  );

  render(
    <FrontendContainerProvider bootstrap={{ session }}>
      <OnboardingWorkspace>
        <p>Assessment input</p>
      </OnboardingWorkspace>
    </FrontendContainerProvider>,
  );

  await user.click(screen.getByRole('button', { name: 'Sign out' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Could not end the session. Please try again.',
  );
  expect(screen.getByText('Assessment input')).toBeInTheDocument();
  expect(replace).not.toHaveBeenCalled();

  server.use(
    http.post('http://localhost:3000/api/v1/auth/sign-out', () =>
      HttpResponse.json({
        status: {
          traceId: '550e8400-e29b-41d4-a716-446655440009',
          code: 120001000,
          message: 'Success!',
          errorDetails: [],
        },
      }),
    ),
  );

  await user.click(screen.getByRole('button', { name: 'Sign out' }));

  await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
});
