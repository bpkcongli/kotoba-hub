import { http, HttpResponse } from 'msw';
import type {
  LessonAnswerRequest,
  PracticeAnswerRequest,
} from '@/frontend/practice/interfaces/requests';
import { createPracticeContainer, PRACTICE_TYPES } from '@/frontend/practice/services';
import type { IPracticeStore } from '@/frontend/practice/services/internal';
import { createFrontendContainer } from '@/frontend/shared/services';
import { practiceSessionFixture } from '@/mocks/fixtures/practice';
import { appReadySessionFixture } from '@/mocks/fixtures/session';
import { server } from '@/mocks/msw.node';
import { answerMockLessonQuiz, answerMockPracticeSession } from '@/mocks/states/practice';
import { setMockSession } from '@/mocks/states/session';

const baseUrl = 'http://localhost:3000/api/v1';
const ownerId = appReadySessionFixture().user!.id;

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

function failure() {
  return HttpResponse.json(
    {
      status: {
        traceId: '550e8400-e29b-41d4-a716-446655440099',
        code: 150006999,
        message: 'The answer response was lost.',
        errorDetails: [],
      },
    },
    { status: 500 },
  );
}

function createStore() {
  return createPracticeContainer({
    parentContainer: createFrontendContainer({
      bootstrap: { session: appReadySessionFixture() },
    }),
  }).get<IPracticeStore>(PRACTICE_TYPES.Store);
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });

  return { promise, resolve };
}

beforeEach(() => setMockSession(appReadySessionFixture()));

test('isolates practice stores and generates with the selected question count', async () => {
  const first = createStore();
  const second = createStore();

  first.setQuestionCount(4);
  await first.generateSession();

  expect(first.error).toBeNull();
  expect(first.session?.totalQuestions).toBe(4);
  expect(first.currentQuestion?.questionType).toBe('SHORT_FREE_RESPONSE');
  expect(second.session).toBeNull();
  expect(second.questionCount).toBe(5);
});

test('replays an answer committed before response loss with identical text and response time', async () => {
  let now = 10000;

  jest.spyOn(Date, 'now').mockImplementation(() => now);

  const bodies: unknown[] = [];
  const capture = async ({ request }: { request: Request }) => {
    if (/\/practice\/sessions\/[^/]+\/answer$/.test(new URL(request.url).pathname)) {
      bodies.push(await request.clone().json());
    }
  };

  server.events.on('request:start', capture);
  server.use(
    http.post(
      `${baseUrl}/practice/sessions/:sessionId/answer`,
      async ({ request, params }) => {
        const result = answerMockPracticeSession(
          ownerId,
          String(params.sessionId),
          (await request.json()) as PracticeAnswerRequest,
        );

        expect('result' in result).toBe(true);

        return failure();
      },
      { once: true },
    ),
  );

  const store = createStore();

  try {
    store.setQuestionCount(1);
    await store.generateSession();
    now = 11700;
    store.setTextInput('ha');
    await store.submitAnswer();

    expect(store.error?.traceId).toBe('550e8400-e29b-41d4-a716-446655440099');
    expect(store.answerLocked).toBe(true);

    store.setTextInput('ga');

    expect(store.textInput).toBe('ha');

    now = 25000;
    await store.submitAnswer();

    expect(store.stage).toBe('feedback');
    expect(store.error).toBeNull();
    expect(store.answerResult?.sessionProgress.answeredQuestionsCount).toBe(1);
    expect(bodies).toHaveLength(2);
    expect(bodies[0]).toEqual({
      questionId: store.currentQuestion!.id,
      userAnswer: { rawInputRomaji: 'ha', normalizedKana: 'は' },
      responseTimeMs: 1700,
    });
    expect(bodies[1]).toEqual(bodies[0]);
  } finally {
    server.events.removeListener('request:start', capture);
    store.dispose();
  }
});

test.each([
  ['incorrect', 'i', 0],
  ['correct', 'a', 1],
] as const)(
  'reuses the receipt after a %s lesson answer response is lost and starts a fresh attempt explicitly',
  async (_outcome, input, levelAfter) => {
    const requests: { key: string | null; body: unknown }[] = [];
    const capture = async ({ request }: { request: Request }) => {
      if (new URL(request.url).pathname.endsWith('/lesson-post-study/answer')) {
        requests.push({
          key: request.headers.get('Idempotency-Key'),
          body: await request.clone().json(),
        });
      }
    };

    server.events.on('request:start', capture);
    server.use(
      http.post(
        `${baseUrl}/practice/lesson-post-study/answer`,
        async ({ request }) => {
          const result = answerMockLessonQuiz(
            ownerId,
            (await request.json()) as LessonAnswerRequest,
            request.headers.get('Idempotency-Key')!,
          );

          expect('result' in result).toBe(true);

          return failure();
        },
        { once: true },
      ),
    );

    const store = createStore();

    try {
      await store.loadLessonQuiz('hiragana-row-a');
      store.setTextInput(input);
      await store.submitAnswer();

      expect(store.answerLocked).toBe(true);

      await store.submitAnswer();

      expect(store.lessonResult?.isCorrect).toBe(levelAfter === 1);
      expect(store.lessonResult?.understandingProgress.currentUnderstandingLevelAfter).toBe(
        levelAfter,
      );
      expect(store.lessonResult?.understandingProgress.postStudyQuizCompleted).toBe(
        levelAfter === 1,
      );
      expect(requests).toHaveLength(2);
      expect(requests[0].key).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(requests[1]).toEqual(requests[0]);

      await store.loadLessonQuiz('hiragana-row-a');
      store.setTextInput('a');
      await store.submitAnswer();

      expect(requests).toHaveLength(3);
      expect(requests[2].key).not.toBe(requests[0].key);
      expect(store.lessonResult?.understandingProgress.currentUnderstandingLevelAfter).toBe(
        levelAfter + 1,
      );
      expect(store.lessonResult?.understandingProgress.postStudyQuizCompleted).toBe(true);
    } finally {
      server.events.removeListener('request:start', capture);
      store.dispose();
    }
  },
);

test('disposal suppresses a late generated session response', async () => {
  const started = deferred();
  const released = deferred();
  const finished = deferred();

  server.use(
    http.post(`${baseUrl}/practice/sessions/generate`, async () => {
      started.resolve();
      await released.promise;
      finished.resolve();

      return HttpResponse.json(envelope(practiceSessionFixture()));
    }),
  );

  const store = createStore();
  const pending = store.generateSession();

  await started.promise;
  store.dispose();
  released.resolve();
  await pending;
  await finished.promise;

  expect(store.session).toBeNull();
  expect(store.currentQuestion).toBeNull();
  expect(store.error).toBeNull();
  expect(store.isGenerating).toBe(false);
});
