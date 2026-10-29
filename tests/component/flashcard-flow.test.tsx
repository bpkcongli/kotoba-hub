import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import {
  FlashcardsHub,
  FlashcardSessionScreen,
  FlashcardSummaryScreen,
} from '@/frontend/flashcards/features';
import { FlashcardContainerProvider } from '@/frontend/flashcards/providers';
import { FrontendContainerProvider } from '@/frontend/shared/providers';
import { FLASHCARD_DECK_IDS } from '@/mocks/fixtures/flashcards';
import { anonymousSessionFixture, appReadySessionFixture } from '@/mocks/fixtures/session';
import { server } from '@/mocks/msw.node';
import { setMockSession } from '@/mocks/states/session';

const baseUrl = 'http://localhost:3000/api/v1';
const mockPush = jest.fn();

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

function failure(code: number, message: string, httpStatus: number) {
  return HttpResponse.json(
    {
      status: { traceId: '550e8400-e29b-41d4-a716-446655440007', code, message, errorDetails: [] },
    },
    { status: httpStatus },
  );
}

function renderFeature(feature: ReactNode) {
  const workspace = (screen: ReactNode) => (
    <FrontendContainerProvider bootstrap={{ session: appReadySessionFixture() }}>
      <FlashcardContainerProvider>{screen}</FlashcardContainerProvider>
    </FrontendContainerProvider>
  );
  const result = render(workspace(feature));

  return { ...result, show: (screen: ReactNode) => result.rerender(workspace(screen)) };
}

async function startSession(family: keyof typeof FLASHCARD_DECK_IDS = 'kana') {
  const user = userEvent.setup();
  const rendered = renderFeature(<FlashcardsHub />);
  await screen.findByRole('combobox', { name: 'Deck' });
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Deck' }),
    FLASHCARD_DECK_IDS[family],
  );

  if (family === 'kanji')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Answer script' }), 'ENGLISH');

  await user.click(screen.getByRole('button', { name: 'Start session' }));
  await waitFor(() => expect(mockPush).toHaveBeenCalled());

  const path = mockPush.mock.lastCall![0] as string;
  const sessionId = path.split('/').at(-1)!;

  expect(path).toBe(`/flashcards/sessions/${sessionId}`);

  rendered.show(<FlashcardSessionScreen sessionId={sessionId} />);
  await screen.findByRole('region', { name: 'Current flashcard' });

  return { user, sessionId, ...rendered };
}

beforeEach(() => {
  mockPush.mockReset();
  setMockSession(appReadySessionFixture());
});

test('shows valid setup modes, then a locked kana session with keyboard-operable answer options', async () => {
  const { user } = await startSession();

  expect(screen.getByText('Scripts locked: Kana → Romaji')).toBeInTheDocument();
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'あ' })).toHaveAttribute('lang', 'ja');
  expect(screen.getByRole('heading', { name: 'あ' })).toHaveFocus();

  const check = screen.getByRole('button', { name: 'Check answer' });

  expect(check).toBeDisabled();

  const first = screen.getByRole('radio', { name: 'a' });

  first.focus();
  await user.keyboard(' ');

  expect(first).toBeChecked();
  expect(check).toBeEnabled();

  await user.click(check);

  const feedback = await screen.findByRole('region', { name: 'Correct' });

  expect(feedback).toHaveFocus();
  expect(within(feedback).getByText('Card bucket: New → Learning')).toBeInTheDocument();
  expect(within(feedback).getByText('Skill mastery score: 42.5/100')).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: 'a Correct answer' })).toBeDisabled();
  expect(screen.queryByText('Onyomi')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Next card' })).toBeInTheDocument();
});

test('kanji feedback renders meaning, readings, and examples next to the answered card', async () => {
  const { user } = await startSession('kanji');

  await user.click(screen.getByRole('radio', { name: 'fire' }));
  await user.click(screen.getByRole('button', { name: 'Check answer' }));

  const feedback = await screen.findByRole('region', { name: 'Incorrect' });

  expect(within(feedback).getByText('Onyomi')).toBeInTheDocument();
  expect(within(feedback).getByText('Kunyomi')).toBeInTheDocument();
  expect(within(feedback).getByText('ニチ、ジツ')).toHaveAttribute('lang', 'ja');
  expect(within(feedback).getByText('ひ、か')).toHaveAttribute('lang', 'ja');
  expect(within(feedback).getByText('日本 · にほん')).toHaveAttribute('lang', 'ja');
  expect(screen.getByRole('radio', { name: 'fire Your answer · incorrect' })).toBeChecked();
  expect(screen.getByRole('radio', { name: 'day / sun Correct answer' })).toBeDisabled();
});

test('preserves vocabulary feedback for the final card before showing the authoritative summary', async () => {
  const { user, sessionId, show } = await startSession('vocabulary');

  await user.click(screen.getByRole('radio', { name: 'fire' }));
  await user.click(screen.getByRole('button', { name: 'Check answer' }));

  let feedback = await screen.findByRole('region', { name: 'Incorrect' });

  expect(within(feedback).getByText('にほん')).toHaveAttribute('lang', 'ja');
  expect(within(feedback).getByText('Japan', { selector: 'p' })).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Next card' }));

  expect(screen.getByRole('heading', { name: '学校' })).toHaveFocus();

  await user.click(screen.getByRole('radio', { name: 'school' }));
  await user.click(screen.getByRole('button', { name: 'Check answer' }));

  feedback = await screen.findByRole('region', { name: 'Correct' });

  expect(within(feedback).getByText('がっこう')).toHaveAttribute('lang', 'ja');
  expect(
    within(feedback).getByText('Card review saved. This card does not update skill mastery.'),
  ).toBeInTheDocument();
  expect(within(feedback).queryByText(/Skill mastery score/)).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Session complete' })).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'View summary' }));

  expect(mockPush).toHaveBeenLastCalledWith(`/flashcards/sessions/${sessionId}/summary`);

  show(<FlashcardSummaryScreen sessionId={sessionId} />);

  expect(screen.getByRole('heading', { name: 'Session complete' })).toBeInTheDocument();
  expect(screen.getByText('Cards answered').nextElementSibling).toHaveTextContent('2/2');
  expect(screen.getByText('Correct').nextElementSibling).toHaveTextContent('1');
  expect(screen.getByText('Incorrect').nextElementSibling).toHaveTextContent('1');
  expect(screen.getByRole('link', { name: 'Review a lesson' })).toHaveAttribute(
    'href',
    '/syllabus',
  );
});

test('a failed answer retains and locks the choice, then recovers via Retry answer', async () => {
  const { user } = await startSession();
  server.use(
    http.post(
      `${baseUrl}/flashcards/sessions/:sessionId/answer`,
      () => failure(150005999, 'Progress could not be saved.', 500),
      { once: true },
    ),
  );

  await user.click(screen.getByRole('radio', { name: 'a' }));
  await user.click(screen.getByRole('button', { name: 'Check answer' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Progress could not be saved.');
  expect(screen.getByRole('radio', { name: 'a' })).toBeChecked();
  expect(screen.getByRole('radio', { name: 'i' })).toBeDisabled();

  await user.click(screen.getByRole('radio', { name: 'i' }));

  expect(screen.getByRole('radio', { name: 'a' })).toBeChecked();

  await user.click(screen.getByRole('button', { name: 'Retry answer' }));

  expect(await screen.findByRole('region', { name: 'Correct' })).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('handles an empty catalog, reload failure, and recovery without a dead start action', async () => {
  const user = userEvent.setup();
  server.use(
    http.get(
      `${baseUrl}/flashcards/decks`,
      () =>
        HttpResponse.json({
          status: {
            traceId: '550e8400-e29b-41d4-a716-446655440000',
            code: 120005000,
            message: 'Success!',
            errorDetails: [],
          },
          metadata: { pagination: { pageNumber: 1, pageSize: 100, totalRecords: 0 } },
          data: { flashcardDecks: [] },
        }),
      { once: true },
    ),
  );
  renderFeature(<FlashcardsHub />);

  await screen.findByRole('heading', { name: 'No flashcard decks available' });

  expect(screen.queryByRole('button', { name: 'Start session' })).not.toBeInTheDocument();

  server.use(
    http.get(
      `${baseUrl}/flashcards/decks`,
      () => failure(150005999, 'Decks could not load.', 500),
      { once: true },
    ),
  );
  await user.click(screen.getByRole('button', { name: 'Reload decks' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Decks could not load.');

  await user.click(screen.getByRole('button', { name: 'Try again' }));

  expect(await screen.findByRole('button', { name: 'Start session' })).toBeEnabled();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('offers sign-in when the catalog session expires and revalidates identity', async () => {
  setMockSession(anonymousSessionFixture());
  renderFeature(<FlashcardsHub />);

  expect(await screen.findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  expect(screen.queryByRole('button', { name: 'Start session' })).not.toBeInTheDocument();
});

test('retains the chosen valid script pair when session creation fails and retries that setup', async () => {
  const user = userEvent.setup();
  const { show } = renderFeature(<FlashcardsHub />);
  await screen.findByRole('combobox', { name: 'Deck' });
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Deck' }),
    FLASHCARD_DECK_IDS.kanji,
  );
  await user.selectOptions(screen.getByRole('combobox', { name: 'Question script' }), 'ENGLISH');
  await user.selectOptions(screen.getByRole('combobox', { name: 'Answer script' }), 'KANA');

  expect(
    within(screen.getByRole('combobox', { name: 'Answer script' })).queryByRole('option', {
      name: 'English',
    }),
  ).not.toBeInTheDocument();

  server.use(
    http.post(
      `${baseUrl}/flashcards/sessions`,
      () => failure(150005999, 'Session could not start.', 500),
      { once: true },
    ),
  );
  await user.click(screen.getByRole('button', { name: 'Start session' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Session could not start.');
  expect(mockPush).not.toHaveBeenCalled();
  expect(screen.getByRole('combobox', { name: 'Question script' })).toHaveValue('ENGLISH');
  expect(screen.getByRole('combobox', { name: 'Answer script' })).toHaveValue('KANA');

  await user.click(screen.getByRole('button', { name: 'Try again' }));
  await waitFor(() => expect(mockPush).toHaveBeenCalled());

  const sessionId = (mockPush.mock.lastCall![0] as string).split('/').at(-1)!;
  show(<FlashcardSessionScreen sessionId={sessionId} />);

  expect(screen.getByText('Scripts locked: English → Kana')).toBeInTheDocument();
});

test('direct session and summary visits show a recovery path when no session is held in memory', () => {
  const { show } = renderFeature(<FlashcardSessionScreen sessionId="unknown" />);

  expect(
    screen.getByRole('heading', { name: 'This session is not open here' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Choose a deck' })).toHaveAttribute(
    'href',
    '/flashcards',
  );

  show(<FlashcardSummaryScreen sessionId="unknown" />);

  expect(
    screen.getByRole('heading', { name: 'No completed session is open here' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Choose a deck' })).toHaveAttribute(
    'href',
    '/flashcards',
  );
});
