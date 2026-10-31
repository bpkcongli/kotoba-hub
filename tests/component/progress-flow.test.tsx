import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { ProgressDashboard } from '@/frontend/progress/features';
import { ProgressContainerProvider } from '@/frontend/progress/providers';
import { FrontendContainerProvider } from '@/frontend/shared/providers';
import { anonymousSessionFixture, appReadySessionFixture } from '@/mocks/fixtures/session';
import { syllabusUnitFixture } from '@/mocks/fixtures/syllabus';
import { server } from '@/mocks/msw.node';
import { setMockSession } from '@/mocks/states/session';

const baseUrl = 'http://localhost:3000/api/v1';

function status(code = 120007000, message = 'Success!') {
  return {
    traceId: '550e8400-e29b-41d4-a716-446655440000',
    code,
    message,
    errorDetails: [],
  };
}

function renderProgress() {
  return render(
    <FrontendContainerProvider bootstrap={{ session: appReadySessionFixture() }}>
      <ProgressContainerProvider>
        <ProgressDashboard />
      </ProgressContainerProvider>
    </FrontendContainerProvider>,
  );
}

beforeEach(() => setMockSession(appReadySessionFixture()));

test('keeps empty activity feeds explicit and disables pagination beyond the available data', async () => {
  renderProgress();

  await screen.findByRole('heading', { name: 'Learning progress' });
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Refresh progress' })).toBeEnabled(),
  );

  expect(screen.getByRole('heading', { name: 'Recent sessions' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Answer history' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Next sessions' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Next answers' })).toBeDisabled();
  expect(screen.queryByText('Completed', { exact: true })).not.toBeInTheDocument();
});

test('shows the required quiz at understanding zero without claiming lesson completion', async () => {
  const user = userEvent.setup();
  const unit = syllabusUnitFixture();

  renderProgress();

  await screen.findByRole('heading', { name: 'Learning progress' });
  await screen.findByRole('option', { name: unit.track.title });
  await user.selectOptions(screen.getByRole('combobox', { name: 'Track' }), unit.track.slug);
  await screen.findByRole('option', { name: unit.title });
  await user.selectOptions(screen.getByRole('combobox', { name: 'Unit' }), unit.slug);

  expect(await screen.findByText('Understanding 0 of 10')).toBeInTheDocument();
  expect(screen.getByText('Quiz required')).toBeInTheDocument();
  expect(screen.queryByText('Completed', { exact: true })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Start post-study quiz' })).toHaveAttribute(
    'href',
    `/syllabus/lessons/${unit.lessons[0].slug}/post-study`,
  );
  expect(screen.queryByText('Reading', { exact: true })).not.toBeInTheDocument();
});

test('refreshes session activity on window focus and preserves UNKNOWN session status', async () => {
  let title = 'First recorded activity';
  const requests = jest.fn();

  server.use(
    http.get(`${baseUrl}/progress/sessions`, () => {
      requests();

      return HttpResponse.json({
        status: status(),
        metadata: { pagination: { pageNumber: 1, pageSize: 10, totalRecords: 1 } },
        data: {
          progressSessions: [
            {
              sourceType: 'PRACTICE',
              sourceSessionId: '550e8400-e29b-41d4-a716-446655440005',
              sessionStatus: 'UNKNOWN',
              sessionTitle: title,
              trackSlug: null,
              unitSlug: null,
              startedAt: null,
              completedAt: null,
              lastActivityAt: '2026-04-04T10:20:00Z',
              totalInteractions: 1,
              correctCount: 1,
              incorrectCount: 0,
              averageScore: 100,
            },
          ],
        },
      });
    }),
  );

  const { unmount } = renderProgress();

  await screen.findByText(title);
  expect(screen.getByText('Practice · Status unavailable')).toBeInTheDocument();
  expect(screen.queryByText('Practice · Completed')).not.toBeInTheDocument();

  const countBeforeFocus = requests.mock.calls.length;

  title = 'Activity saved in another view';
  fireEvent.focus(window);

  expect(await screen.findByText(title)).toBeInTheDocument();
  expect(requests.mock.calls.length).toBeGreaterThan(countBeforeFocus);
  expect(screen.queryByText('First recorded activity')).not.toBeInTheDocument();

  const countBeforeUnmount = requests.mock.calls.length;

  unmount();
  fireEvent.focus(window);
  await Promise.resolve();

  expect(requests).toHaveBeenCalledTimes(countBeforeUnmount);
});

test('offers sign-in after an expired progress request and refreshes the session', async () => {
  const sessionRequested = jest.fn(() =>
    HttpResponse.json({ status: status(120001000), data: anonymousSessionFixture() }),
  );

  server.use(
    http.get(`${baseUrl}/progress/overview`, () =>
      HttpResponse.json(
        { status: status(140107001, 'Your session expired. Sign in again to continue.') },
        { status: 401 },
      ),
    ),
    http.get(`${baseUrl}/auth/session`, sessionRequested),
  );

  renderProgress();

  expect(await screen.findByRole('link', { name: 'Sign in again' })).toHaveAttribute(
    'href',
    '/login',
  );
  await waitFor(() => expect(sessionRequested).toHaveBeenCalled());
  expect(screen.queryByRole('combobox', { name: 'Unit' })).not.toBeInTheDocument();
});

test('retains a historical track selection on failure without offering unrelated published units', async () => {
  const user = userEvent.setup();
  const historySlug = 'archived-n5-track';
  const historyTitle = 'Archived N5 track';

  server.use(
    http.get(`${baseUrl}/progress/overview`, ({ request }) => {
      if (new URL(request.url).searchParams.get('trackSlug') === historySlug)
        return HttpResponse.json(
          { status: status(150007999, 'Archived progress could not load.') },
          { status: 500 },
        );

      return HttpResponse.json({
        status: status(),
        data: {
          trackedSkillsCount: 1,
          masteredSkillsCount: 0,
          developingSkillsCount: 1,
          weakSkillsCount: 0,
          averageMasteryScore: 70,
          recommendedDifficultyBand: 'STANDARD',
          lastActivityAt: '2026-04-04T10:20:00Z',
          lessonUnderstandingSummary: {
            trackedLessonsCount: 0,
            completedLessonsCount: 0,
            averageUnderstandingLevel: 0,
            maxUnderstandingLevel: 10,
          },
          trackSummaries: [
            {
              trackSlug: historySlug,
              trackTitle: historyTitle,
              trackedSkillsCount: 1,
              masteredSkillsCount: 0,
              averageMasteryScore: 70,
              lastActivityAt: '2026-04-04T10:20:00Z',
            },
          ],
        },
      });
    }),
  );

  renderProgress();

  await screen.findByRole('option', { name: `${historyTitle} (history)` });
  await user.selectOptions(screen.getByRole('combobox', { name: 'Track' }), historySlug);
  await screen.findByText('Archived progress could not load.');

  expect(screen.getByRole('combobox', { name: 'Track' })).toHaveValue(historySlug);
  expect(screen.getByRole('option', { name: 'Selected track (history)' })).toHaveValue(historySlug);
  expect(
    screen.queryByRole('option', { name: syllabusUnitFixture().title }),
  ).not.toBeInTheDocument();
});
