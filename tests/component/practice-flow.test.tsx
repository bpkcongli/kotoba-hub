import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import {
  LessonPostStudyScreen,
  PracticeHub,
  PracticeSessionScreen,
  PracticeSummaryScreen,
} from '@/frontend/practice/features';
import type { PracticeAnswerRequest } from '@/frontend/practice/interfaces/requests';
import { PracticeContainerProvider } from '@/frontend/practice/providers';
import { FrontendContainerProvider } from '@/frontend/shared/providers';
import { practiceQuestionFixture, practiceSessionFixture } from '@/mocks/fixtures/practice';
import { anonymousSessionFixture, appReadySessionFixture } from '@/mocks/fixtures/session';
import { lessonQuizFixture } from '@/mocks/fixtures/syllabus';
import { server } from '@/mocks/msw.node';
import { answerMockPracticeSession, setMockLessonUnderstanding } from '@/mocks/states/practice';
import { setMockSession } from '@/mocks/states/session';

const baseUrl = 'http://localhost:3000/api/v1';
const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: jest.fn() }),
}));

function envelope(data: unknown) {
  return {
    status: {
      traceId: '550e8400-e29b-41d4-a716-446655440000',
      code: 120006000,
      message: 'Success!',
      errorDetails: [],
    },
    data,
  };
}

function failure(code: number, message: string, httpStatus: number) {
  return HttpResponse.json(
    {
      status: { traceId: '550e8400-e29b-41d4-a716-446655440007', code, message, errorDetails: [] },
    },
    { status: httpStatus },
  );
}

function renderFeature(feature: ReactNode) {
  const workspace = (content: ReactNode) => (
    <FrontendContainerProvider bootstrap={{ session: appReadySessionFixture() }}>
      <PracticeContainerProvider>{content}</PracticeContainerProvider>
    </FrontendContainerProvider>
  );
  const result = render(workspace(feature));

  return { ...result, show: (content: ReactNode) => result.rerender(workspace(content)) };
}

async function startSession(questionCount = 4) {
  const user = userEvent.setup();
  const rendered = renderFeature(<PracticeHub />);
  const count = screen.getByRole('spinbutton', { name: 'Question count' });

  fireEvent.change(count, { target: { value: String(questionCount) } });
  await user.click(screen.getByRole('button', { name: 'Generate practice' }));
  await waitFor(() => expect(mockPush).toHaveBeenCalled());

  const path = mockPush.mock.lastCall![0] as string;
  const sessionId = path.split('/').at(-1)!;

  expect(path).toBe(`/practice/sessions/${sessionId}`);
  rendered.show(<PracticeSessionScreen sessionId={sessionId} />);

  return { user, sessionId, ...rendered };
}

beforeEach(() => {
  mockPush.mockReset();
  setMockSession(appReadySessionFixture());
});

test('answers all four question types with keyboard controls and keeps final feedback before summary', async () => {
  const { user, sessionId, show } = await startSession();
  const requests: unknown[] = [];
  const capture = async ({ request }: { request: Request }) => {
    if (/\/practice\/sessions\/[^/]+\/answer$/.test(new URL(request.url).pathname)) {
      requests.push(await request.clone().json());
    }
  };

  server.events.on('request:start', capture);

  try {
    const check = screen.getByRole('button', { name: 'Check answer' });

    expect(check).toBeDisabled();

    await user.type(screen.getByRole('textbox', { name: 'Romaji or Japanese answer' }), 'ha');

    expect(screen.getByRole('textbox', { name: 'Japanese answer to submit' })).toHaveValue('は');

    await user.click(check);

    let feedback = await screen.findByRole('region', { name: 'Answer feedback' });

    expect(feedback).toHaveFocus();
    expect(within(feedback).getByRole('heading', { name: 'Correct' })).toBeInTheDocument();
    expect(within(feedback).getByText('Score: 100/100')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next question' }));

    const options = screen.getAllByRole('radio');

    expect(options).toHaveLength(4);

    const particle = screen.getByRole('radio', { name: 'は' });

    particle.focus();
    await user.keyboard(' ');

    expect(particle).toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Check answer' }));
    await screen.findByRole('region', { name: 'Answer feedback' });
    await user.click(screen.getByRole('button', { name: 'Next question' }));

    const bank = screen.getByRole('group', { name: 'Available tokens' });

    for (const label of ['わたし', 'は', 'がくせい', 'です']) {
      const token = within(bank).getByRole('button', { name: label });

      token.focus();
      await user.keyboard(' ');
    }

    expect(screen.getByRole('list', { name: 'Answer order' })).toHaveTextContent('わたし');

    await user.click(screen.getByRole('button', { name: 'Check answer' }));
    await screen.findByRole('region', { name: 'Answer feedback' });
    await user.click(screen.getByRole('button', { name: 'Next question' }));

    expect(
      screen.getByText('AI checks your Japanese response and provides feedback.'),
    ).toBeInTheDocument();

    await user.type(
      screen.getByRole('textbox', { name: 'Romaji or Japanese answer' }),
      'watashihagakuseidesu.',
    );

    expect(screen.getByRole('textbox', { name: 'Japanese answer to submit' })).toHaveValue(
      'わたしはがくせいです。',
    );

    await user.click(screen.getByRole('button', { name: 'Check answer' }));
    feedback = await screen.findByRole('region', { name: 'Answer feedback' });

    expect(feedback).toHaveFocus();
    expect(screen.queryByRole('heading', { name: 'Practice complete' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'View summary' }));

    expect(mockPush).toHaveBeenLastCalledWith(`/practice/sessions/${sessionId}/summary`);

    show(<PracticeSummaryScreen sessionId={sessionId} />);

    expect(screen.getByRole('heading', { name: 'Practice complete' })).toBeInTheDocument();
    expect(screen.getByText('4 of 4 questions answered')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review syllabus' })).toHaveAttribute(
      'href',
      '/syllabus',
    );
    expect(requests).toHaveLength(4);
    expect(requests[0]).toEqual(
      expect.objectContaining({ userAnswer: { rawInputRomaji: 'ha', normalizedKana: 'は' } }),
    );
    expect(requests[1]).toEqual(expect.objectContaining({ userAnswer: { selectedOptionId: 'a' } }));
    expect(requests[2]).toEqual(
      expect.objectContaining({ userAnswer: { arrangedTokenIds: ['t1', 't2', 't3', 't4'] } }),
    );
    expect(requests[3]).toEqual(
      expect.objectContaining({
        userAnswer: {
          rawInputRomaji: 'watashihagakuseidesu.',
          normalizedKana: 'わたしはがくせいです。',
        },
      }),
    );
  } finally {
    server.events.removeListener('request:start', capture);
  }
});

test('retains and locks the submitted text after a failed answer, then retries it', async () => {
  const { user } = await startSession(1);

  server.use(
    http.post(
      `${baseUrl}/practice/sessions/:sessionId/answer`,
      () => failure(150006999, 'The answer could not be saved.', 500),
      { once: true },
    ),
  );
  await user.type(screen.getByRole('textbox', { name: 'Romaji or Japanese answer' }), 'ha');
  await user.click(screen.getByRole('button', { name: 'Check answer' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('The answer could not be saved.');
  expect(screen.getByRole('textbox', { name: 'Romaji or Japanese answer' })).toHaveValue('ha');
  expect(screen.getByRole('textbox', { name: 'Romaji or Japanese answer' })).toBeDisabled();

  await user.click(screen.getByRole('button', { name: 'Retry answer' }));

  expect(await screen.findByRole('region', { name: 'Answer feedback' })).toBeInTheDocument();
});

test('a direct quiz shows completion from the answer response and fetches the next authoritative review', async () => {
  const user = userEvent.setup();
  const generate = jest.fn();

  server.use(
    http.post(`${baseUrl}/practice/sessions/generate`, () => {
      generate();

      return HttpResponse.error();
    }),
  );
  renderFeature(<LessonPostStudyScreen lessonSlug="hiragana-row-a" />);

  await screen.findByText('Understanding 0/10');

  expect(screen.getByText('Difficulty 1/10')).toBeInTheDocument();

  await user.type(screen.getByRole('textbox', { name: 'Romaji or Japanese answer' }), 'a');
  await user.click(screen.getByRole('button', { name: 'Check answer' }));
  await screen.findByRole('region', { name: 'Answer feedback' });

  expect(screen.getByText(/0 → 1/)).toBeInTheDocument();
  expect(screen.getByText('Lesson completed')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Review lesson' })).toHaveAttribute(
    'href',
    '/syllabus/lessons/hiragana-row-a',
  );

  await user.click(screen.getByRole('button', { name: 'Review again' }));

  expect(await screen.findByText('Difficulty 2/10')).toBeInTheDocument();
  expect(screen.getByText('Understanding 1/10')).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Romaji or Japanese answer' })).toHaveValue('');
  expect(generate).not.toHaveBeenCalled();
});

test('incorrect direct answers retain quiz required and level ten review stays capped', async () => {
  const user = userEvent.setup();
  const view = renderFeature(<LessonPostStudyScreen lessonSlug="hiragana-row-a" />);

  await screen.findByText('Understanding 0/10');
  await user.type(screen.getByRole('textbox', { name: 'Romaji or Japanese answer' }), 'i');
  await user.click(screen.getByRole('button', { name: 'Check answer' }));
  await screen.findByRole('region', { name: 'Answer feedback' });

  expect(screen.getByText(/0 → 0/)).toBeInTheDocument();
  expect(screen.getByText('Quiz required')).toBeInTheDocument();
  expect(screen.queryByText('Lesson completed')).not.toBeInTheDocument();

  setMockLessonUnderstanding(appReadySessionFixture().user!.id, 'hiragana-row-a', 10);

  await user.click(screen.getByRole('button', { name: 'Try another question' }));

  expect(await screen.findByText('Difficulty 10/10')).toBeInTheDocument();
  expect(screen.getByText('Understanding 10/10')).toBeInTheDocument();

  await user.type(screen.getByRole('textbox', { name: 'Romaji or Japanese answer' }), 'a');
  await user.click(screen.getByRole('button', { name: 'Check answer' }));
  await screen.findByRole('region', { name: 'Answer feedback' });

  expect(screen.getByText(/10 → 10/)).toBeInTheDocument();
  expect(screen.queryByText(/11\/10/)).not.toBeInTheDocument();

  view.unmount();
});

test('loads the current lesson question when another tab advances understanding before submission', async () => {
  const user = userEvent.setup();

  renderFeature(<LessonPostStudyScreen lessonSlug="hiragana-row-a" />);
  await screen.findByText('Difficulty 1/10');

  setMockLessonUnderstanding(appReadySessionFixture().user!.id, 'hiragana-row-a', 1);

  await user.type(screen.getByRole('textbox', { name: 'Romaji or Japanese answer' }), 'a');
  await user.click(screen.getByRole('button', { name: 'Check answer' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Load the current lesson question before answering.',
  );
  expect(screen.getByRole('textbox', { name: 'Romaji or Japanese answer' })).toHaveValue('a');

  await user.click(screen.getByRole('button', { name: 'Load current question' }));

  expect(await screen.findByText('Difficulty 2/10')).toBeInTheDocument();
  expect(screen.getByText('Understanding 1/10')).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Romaji or Japanese answer' })).toHaveValue('');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Answer feedback' })).not.toBeInTheDocument();
});

test('supports Japanese IME output without submitting the composing Enter key', async () => {
  const user = userEvent.setup();

  server.use(
    http.post(`${baseUrl}/practice/sessions/generate`, () =>
      HttpResponse.json(
        envelope(practiceSessionFixture({ questions: [practiceQuestionFixture('FREE_RESPONSE')] })),
      ),
    ),
  );
  await startSession(1);

  const field = screen.getByRole('textbox', { name: 'Romaji or Japanese answer' });
  const requests = jest.fn();

  server.use(
    http.post(`${baseUrl}/practice/sessions/:sessionId/answer`, async ({ request }) => {
      requests(await request.json());

      return failure(150006999, 'Unexpected submit.', 500);
    }),
  );

  await user.type(field, 'xyz');

  expect(screen.getByRole('button', { name: 'Check answer' })).toBeDisabled();
  expect(
    screen.getByText('Finish converting the remaining romaji before submitting.'),
  ).toBeInTheDocument();

  await user.clear(field);
  await user.click(field);
  fireEvent.compositionStart(field);
  fireEvent.change(field, { target: { value: 'わたしはがくせいです。' } });
  fireEvent.keyDown(field, { key: 'Enter', code: 'Enter', isComposing: true });
  fireEvent.submit(field.closest('form')!);
  fireEvent.compositionEnd(field, { data: 'わたしはがくせいです。' });

  expect(requests).not.toHaveBeenCalled();

  const finalAnswer = screen.getByRole('textbox', { name: 'Japanese answer to submit' });

  expect(finalAnswer).toHaveValue('わたしはがくせいです。');

  fireEvent.change(finalAnswer, { target: { value: '私は学生です。' } });
  await user.click(screen.getByRole('button', { name: 'Check answer' }));
  await waitFor(() => expect(requests).toHaveBeenCalledTimes(1));

  expect(requests).toHaveBeenCalledWith(
    expect.objectContaining({
      userAnswer: {
        rawInputRomaji: 'わたしはがくせいです。',
        normalizedKana: '私は学生です。',
        normalizedKanji: '私は学生です。',
      },
    }),
  );
});

test('shows saved feedback without a mastery update and identifies skills from incorrect random answers in the summary', async () => {
  const { user, sessionId, show } = await startSession(2);

  await user.type(screen.getByRole('textbox', { name: 'Romaji or Japanese answer' }), 'ga');
  await user.click(screen.getByRole('button', { name: 'Check answer' }));

  let feedback = await screen.findByRole('region', { name: 'Answer feedback' });

  expect(within(feedback).getByRole('heading', { name: 'Not quite' })).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Next question' }));

  server.use(
    http.post(`${baseUrl}/practice/sessions/:sessionId/answer`, async ({ request, params }) => {
      const saved = answerMockPracticeSession(
        appReadySessionFixture().user!.id,
        String(params.sessionId),
        (await request.json()) as PracticeAnswerRequest,
      );

      if (!('result' in saved)) throw new Error('Expected the mock answer to save.');

      return HttpResponse.json(envelope({ ...saved.result, progressImpact: null }));
    }),
  );

  await user.click(screen.getByRole('radio', { name: 'が' }));
  await user.click(screen.getByRole('button', { name: 'Check answer' }));
  feedback = await screen.findByRole('region', { name: 'Answer feedback' });

  expect(
    within(feedback).getByText('Your answer is saved. No syllabus mastery update was returned.'),
  ).toBeInTheDocument();
  expect(within(feedback).queryByText(/Mastery/)).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'View summary' }));

  show(<PracticeSummaryScreen sessionId={sessionId} />);

  expect(screen.getByText('0 correct · 2 to review')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Skills to revisit' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Review syllabus' })).toHaveAttribute(
    'href',
    '/syllabus',
  );
});

test('generation failures preserve count, reject malformed empty sessions, and allow retry', async () => {
  const user = userEvent.setup();

  server.use(
    http.post(
      `${baseUrl}/practice/sessions/generate`,
      () => failure(150006999, 'Questions could not be generated.', 500),
      { once: true },
    ),
  );

  renderFeature(<PracticeHub />);
  await user.click(screen.getByRole('button', { name: 'Generate practice' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Questions could not be generated.');
  expect(screen.getByRole('spinbutton', { name: 'Question count' })).toHaveValue(5);
  expect(mockPush).not.toHaveBeenCalled();

  server.use(
    http.post(
      `${baseUrl}/practice/sessions/generate`,
      () => HttpResponse.json(envelope({ ...practiceSessionFixture(), questions: [] })),
      { once: true },
    ),
  );

  await user.click(screen.getByRole('button', { name: 'Generate practice' }));
  await waitFor(() =>
    expect(screen.getByRole('alert')).not.toHaveTextContent('Questions could not be generated.'),
  );

  expect(mockPush).not.toHaveBeenCalled();

  await user.click(screen.getByRole('button', { name: 'Generate practice' }));
  await waitFor(() => expect(mockPush).toHaveBeenCalled());
});

test('expired practice access offers sign-in and a deep link without a snapshot offers recovery', async () => {
  const user = userEvent.setup();

  setMockSession(anonymousSessionFixture());

  const { show } = renderFeature(<PracticeHub />);

  await user.click(screen.getByRole('button', { name: 'Generate practice' }));

  expect(await screen.findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  expect(mockPush).not.toHaveBeenCalled();

  show(<PracticeSessionScreen sessionId="unknown" />);

  expect(screen.getByRole('link', { name: 'Start practice' })).toHaveAttribute('href', '/practice');

  show(<PracticeSummaryScreen sessionId="unknown" />);

  expect(screen.getByRole('link', { name: 'Start practice' })).toHaveAttribute('href', '/practice');
});

test('uses the selected lesson difficulty and displays a missing-lesson recovery without a question', async () => {
  const user = userEvent.setup();
  const quiz = lessonQuizFixture();

  server.use(
    http.post(
      `${baseUrl}/practice/lesson-post-study/next`,
      () => failure(140406002, 'This lesson is unavailable.', 404),
      { once: true },
    ),
  );

  renderFeature(<LessonPostStudyScreen lessonSlug={quiz.lessonSlug} />);

  expect(await screen.findByRole('alert')).toHaveTextContent('This lesson is unavailable.');
  expect(screen.queryByRole('button', { name: 'Check answer' })).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Try again' }));

  expect(await screen.findByText('Difficulty 1/10')).toBeInTheDocument();
});
