import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { OnboardingWorkspace } from '@/frontend/auth/components/organisms';
import { Onboarding } from '@/frontend/onboarding/features';
import type {
  AssessmentRequest,
  ConfirmAssessmentRequest,
} from '@/frontend/onboarding/interfaces/requests';
import { FrontendContainerProvider } from '@/frontend/shared/providers';
import {
  assessmentDraftFixture,
  onboardingConfirmationFixture,
  onboardingProfileFixture,
  onboardingTracksFixture,
} from '@/mocks/fixtures/onboarding';
import {
  anonymousSessionFixture,
  appReadySessionFixture,
  onboardingSessionFixture,
} from '@/mocks/fixtures/session';
import { server } from '@/mocks/msw.node';

const router = { replace: jest.fn(), refresh: jest.fn() };
jest.mock('next/navigation', () => ({ useRouter: () => router }));

const baseUrl = 'http://localhost:3000/api/v1';
function envelope(data: unknown, code = 120003000) {
  return {
    status: {
      traceId: '550e8400-e29b-41d4-a716-446655440000',
      code,
      message: 'Success!',
      errorDetails: [],
    },
    data,
  };
}

function renderWizard() {
  return render(
    <FrontendContainerProvider bootstrap={{ session: onboardingSessionFixture() }}>
      <OnboardingWorkspace>
        <Onboarding />
      </OnboardingWorkspace>
    </FrontendContainerProvider>,
  );
}

beforeEach(() => {
  server.use(
    http.get(`${baseUrl}/user-profile/me`, () =>
      HttpResponse.json(envelope(onboardingProfileFixture(), 120002000)),
    ),
    http.get(`${baseUrl}/syllabus`, () =>
      HttpResponse.json({
        ...envelope({ tracks: onboardingTracksFixture() }, 120004000),
        metadata: {
          pagination: {
            pageNumber: 1,
            pageSize: 100,
            totalRecords: onboardingTracksFixture().length,
          },
        },
      }),
    ),
    http.post(`${baseUrl}/personalization/assessment`, async ({ request }) =>
      HttpResponse.json(
        envelope(assessmentDraftFixture((await request.json()) as AssessmentRequest)),
      ),
    ),
    http.post(`${baseUrl}/personalization/assessment/confirm`, async ({ request }) =>
      HttpResponse.json(
        envelope(onboardingConfirmationFixture((await request.json()) as ConfirmAssessmentRequest)),
      ),
    ),
    http.get(`${baseUrl}/auth/session`, () =>
      HttpResponse.json(envelope(appReadySessionFixture(), 120001000)),
    ),
  );
});

test('reviews a draft, removes a suggestion, then saves only after explicit confirmation and refreshes the session', async () => {
  const user = userEvent.setup();
  let savedInput: ConfirmAssessmentRequest | undefined;
  const confirmRequested = jest.fn();
  const refreshSession = jest.fn(() =>
    HttpResponse.json(envelope(appReadySessionFixture(), 120001000)),
  );

  server.use(
    http.post(`${baseUrl}/personalization/assessment/confirm`, async ({ request }) => {
      confirmRequested();
      savedInput = (await request.json()) as ConfirmAssessmentRequest;

      return HttpResponse.json(envelope(onboardingConfirmationFixture(savedInput)));
    }),
    http.get(`${baseUrl}/auth/session`, refreshSession),
  );
  renderWizard();

  expect(
    await screen.findByRole('heading', { name: 'Set up your study plan' }),
  ).toBeInTheDocument();

  const target = screen.getByRole('combobox', { name: 'Target level' });

  expect(within(target).getByRole('option', { name: 'JLPT N5' })).toBeInTheDocument();
  expect(within(target).queryByRole('option', { name: 'JLPT N4' })).not.toBeInTheDocument();

  const currentLevel = screen.getByRole('combobox', { name: 'Current level' });

  expect(within(currentLevel).getByRole('option', { name: 'New to Japanese' })).toBeInTheDocument();
  expect(within(currentLevel).getByRole('option', { name: 'JLPT N5' })).toBeInTheDocument();
  expect(within(currentLevel).queryByRole('option', { name: 'JLPT N4' })).not.toBeInTheDocument();
  await user.selectOptions(currentLevel, 'JLPT_N5');
  await user.type(
    screen.getByRole('textbox', { name: 'What have you studied? (optional)' }),
    'I can read hiragana.',
  );
  await user.click(screen.getByRole('button', { name: 'Review study plan' }));

  const reviewHeading = await screen.findByRole('heading', { name: 'Review your study plan' });

  expect(reviewHeading).toHaveFocus();
  expect(confirmRequested).not.toHaveBeenCalled();
  expect(refreshSession).not.toHaveBeenCalled();

  const suggestion = assessmentDraftFixture({
    currentLevel: 'BEGINNER',
    targetLevel: 'JLPT_N5',
    dailyGoalMinutes: 20,
    preferredScript: 'MIXED',
    weakSkillFocuses: [],
    note: 'I can read hiragana.',
  }).suggestedKnownSkillClaims[0];
  const checkbox = screen.getByRole('checkbox', { name: new RegExp(suggestion.title) });

  expect(checkbox).toBeChecked();
  await user.click(checkbox);
  await user.click(screen.getByRole('button', { name: 'Confirm study plan' }));

  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/dashboard'));
  expect(savedInput?.knownSkillClaims).toEqual([]);
  expect(savedInput?.currentLevel).toBe('JLPT_N5');
  expect(savedInput).not.toHaveProperty('note');
  expect(confirmRequested).toHaveBeenCalledTimes(1);
  expect(refreshSession).toHaveBeenCalledTimes(1);
  expect(router.refresh).toHaveBeenCalled();
});

test('preserves form input across draft failure, lets the learner edit the reviewed assessment, and retries confirmation', async () => {
  const user = userEvent.setup();

  server.use(
    http.post(`${baseUrl}/personalization/assessment`, () =>
      HttpResponse.json(
        {
          status: {
            traceId: '550e8400-e29b-41d4-a716-446655440004',
            code: 150003999,
            message: 'Could not prepare your draft.',
            errorDetails: [],
          },
        },
        { status: 500 },
      ),
    ),
  );
  renderWizard();

  const note = await screen.findByRole('textbox', { name: 'What have you studied? (optional)' });

  await user.type(note, 'Keep my learning note.');
  await user.clear(screen.getByRole('spinbutton', { name: 'Daily study goal (minutes)' }));
  await user.type(screen.getByRole('spinbutton', { name: 'Daily study goal (minutes)' }), '30');
  await user.click(screen.getByRole('button', { name: 'Review study plan' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Could not prepare your draft.');
  expect(note).toHaveValue('Keep my learning note.');
  expect(screen.getByRole('spinbutton', { name: 'Daily study goal (minutes)' })).toHaveValue(30);
  expect(router.replace).not.toHaveBeenCalled();

  server.use(
    http.post(`${baseUrl}/personalization/assessment`, async ({ request }) =>
      HttpResponse.json(
        envelope(assessmentDraftFixture((await request.json()) as AssessmentRequest)),
      ),
    ),
  );
  await user.click(screen.getByRole('button', { name: 'Review study plan' }));
  await screen.findByRole('heading', { name: 'Review your study plan' });
  await user.click(screen.getByRole('button', { name: 'Edit assessment' }));
  expect(screen.getByRole('textbox', { name: 'What have you studied? (optional)' })).toHaveValue(
    'Keep my learning note.',
  );
  expect(screen.queryByRole('button', { name: 'Confirm study plan' })).not.toBeInTheDocument();
  await user.clear(screen.getByRole('textbox', { name: 'What have you studied? (optional)' }));
  await user.click(screen.getByRole('button', { name: 'Review study plan' }));
  await screen.findByRole('heading', { name: 'Review your study plan' });
  expect(
    screen.getByText(
      'No known skills were suggested. You can confirm your preferences as they are.',
    ),
  ).toBeInTheDocument();

  server.use(
    http.post(`${baseUrl}/personalization/assessment/confirm`, () =>
      HttpResponse.json(
        {
          status: {
            traceId: '550e8400-e29b-41d4-a716-446655440005',
            code: 150003999,
            message: 'Your profile could not be saved.',
            errorDetails: [],
          },
        },
        { status: 500 },
      ),
    ),
  );
  await user.click(screen.getByRole('button', { name: 'Confirm study plan' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Your profile could not be saved.');
  expect(screen.getByRole('heading', { name: 'Review your study plan' })).toBeInTheDocument();
  expect(router.replace).not.toHaveBeenCalled();

  server.use(
    http.post(`${baseUrl}/personalization/assessment/confirm`, async ({ request }) =>
      HttpResponse.json(
        envelope(onboardingConfirmationFixture((await request.json()) as ConfirmAssessmentRequest)),
      ),
    ),
  );
  await user.click(screen.getByRole('button', { name: 'Confirm study plan' }));
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/dashboard'));
});

test('shows catalog reload failure after an empty result and recovers through retry', async () => {
  const user = userEvent.setup();

  server.use(
    http.get(`${baseUrl}/syllabus`, () =>
      HttpResponse.json({
        ...envelope({ tracks: [] }, 120004000),
        metadata: { pagination: { pageNumber: 1, pageSize: 100, totalRecords: 0 } },
      }),
    ),
  );
  renderWizard();

  expect(
    await screen.findByRole('heading', { name: 'No study levels are available yet' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Reload available levels' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Review study plan' })).not.toBeInTheDocument();

  server.use(
    http.get(`${baseUrl}/syllabus`, () =>
      HttpResponse.json(
        {
          status: {
            traceId: '550e8400-e29b-41d4-a716-446655440007',
            code: 150004999,
            message: 'Available study levels could not be loaded. Please try again.',
            errorDetails: [],
          },
        },
        { status: 500 },
      ),
    ),
  );
  await user.click(screen.getByRole('button', { name: 'Reload available levels' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Available study levels could not be loaded. Please try again.',
  );
  expect(screen.queryByRole('button', { name: 'Review study plan' })).not.toBeInTheDocument();

  server.use(
    http.get(`${baseUrl}/syllabus`, () =>
      HttpResponse.json({
        ...envelope({ tracks: onboardingTracksFixture() }, 120004000),
        metadata: {
          pagination: {
            pageNumber: 1,
            pageSize: 100,
            totalRecords: onboardingTracksFixture().length,
          },
        },
      }),
    ),
  );
  await user.click(screen.getByRole('button', { name: 'Try again' }));

  expect(
    await screen.findByRole('heading', { name: 'Set up your study plan' }),
  ).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('revalidates an expired session and routes to login after an authenticated request fails', async () => {
  const refreshSession = jest.fn(() =>
    HttpResponse.json(envelope(anonymousSessionFixture(), 120001000)),
  );

  server.use(
    http.get(`${baseUrl}/user-profile/me`, () =>
      HttpResponse.json(
        {
          status: {
            traceId: '550e8400-e29b-41d4-a716-446655440006',
            code: 140102001,
            message: 'Unauthorized.',
            errorDetails: [],
          },
        },
        { status: 401 },
      ),
    ),
    http.get(`${baseUrl}/auth/session`, refreshSession),
  );
  renderWizard();

  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'));
  expect(refreshSession).toHaveBeenCalledTimes(1);
  expect(router.replace).not.toHaveBeenCalledWith('/dashboard');
});
