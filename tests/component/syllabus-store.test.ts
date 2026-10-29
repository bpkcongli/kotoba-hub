import { http, HttpResponse } from 'msw';
import { createFrontendContainer } from '@/frontend/shared/services/container';
import { createSyllabusContainer, SYLLABUS_TYPES } from '@/frontend/syllabus/services';
import type { ISyllabusStore } from '@/frontend/syllabus/services/internal';
import { appReadySessionFixture } from '@/mocks/fixtures/session';
import {
  lessonQuizFixture,
  syllabusLessonFixture,
  syllabusTracksFixture,
} from '@/mocks/fixtures/syllabus';
import { server } from '@/mocks/msw.node';

const baseUrl = 'http://localhost:3000/api/v1';

function envelope(data: unknown, code = 120004000) {
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

function createStore() {
  const parentContainer = createFrontendContainer({
    bootstrap: { session: appReadySessionFixture() },
  });

  return createSyllabusContainer({ parentContainer }).get<ISyllabusStore>(SYLLABUS_TYPES.Store);
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });

  return { promise, resolve };
}

beforeEach(() => {
  server.use(
    http.get(`${baseUrl}/syllabus`, () =>
      HttpResponse.json({
        ...envelope({ tracks: syllabusTracksFixture() }),
        metadata: {
          pagination: {
            pageNumber: 1,
            pageSize: 100,
            totalRecords: syllabusTracksFixture().length,
          },
        },
      }),
    ),
    http.get(`${baseUrl}/syllabus/lessons/:slug`, () =>
      HttpResponse.json(envelope(syllabusLessonFixture())),
    ),
    http.post(`${baseUrl}/practice/lesson-post-study/next`, () =>
      HttpResponse.json(envelope(lessonQuizFixture(), 120006000)),
    ),
  );
});

test('reads every catalog page with unit summaries and keeps feature containers isolated', async () => {
  const firstTrack = syllabusTracksFixture()[0];
  const secondTrack = {
    ...firstTrack,
    id: '550e8400-e29b-41d4-a716-446655440019',
    slug: 'jlpt-n4-extension',
    curriculumLevel: 'N4',
    sortOrder: firstTrack.sortOrder + 1,
  };
  const requests: number[] = [];

  server.use(
    http.get(`${baseUrl}/syllabus`, ({ request }) => {
      const query = new URL(request.url).searchParams;
      const offset = Number(query.get('offset'));

      expect(query.get('includeUnits')).toBe('true');
      requests.push(offset);

      return HttpResponse.json({
        ...envelope({ tracks: offset === 0 ? [firstTrack] : [secondTrack] }),
        metadata: { pagination: { pageNumber: offset + 1, pageSize: 1, totalRecords: 2 } },
      });
    }),
  );

  const first = createStore();
  const second = createStore();

  await first.loadMap();
  await second.loadMap();
  first.selectTrack(secondTrack.slug);

  expect(requests).toEqual([0, 1, 0, 1]);
  expect(first.tracks.map((track) => track.slug)).toEqual([firstTrack.slug, secondTrack.slug]);
  expect(first.selectedTrack?.slug).toBe(secondTrack.slug);
  expect(second.selectedTrack?.slug).toBe(firstTrack.slug);
  expect(first.selectedTrack?.units).toEqual(secondTrack.units);
});

test('reading changes local state without completing the lesson or writing a quiz answer', async () => {
  const answerRequested = jest.fn();

  server.use(
    http.post(`${baseUrl}/practice/lesson-post-study/answer`, () => {
      answerRequested();

      return HttpResponse.error();
    }),
  );

  const store = createStore();
  await store.loadLesson(syllabusLessonFixture().slug);
  store.finishReading();

  expect(store.readingFinished).toBe(true);
  expect(store.quiz?.currentUnderstandingLevel).toBe(0);
  expect(store.quiz?.targetDifficultyLevel).toBe(1);
  expect(answerRequested).not.toHaveBeenCalled();
});

test('keeps the reading surface after a quiz request failure and retries the authoritative target', async () => {
  server.use(
    http.post(`${baseUrl}/practice/lesson-post-study/next`, () =>
      HttpResponse.json(
        {
          status: {
            traceId: '550e8400-e29b-41d4-a716-446655440005',
            code: 150006999,
            message: 'Your lesson quiz could not load.',
            errorDetails: [],
          },
        },
        { status: 500 },
      ),
    ),
  );

  const store = createStore();
  const lesson = syllabusLessonFixture();

  await store.loadLesson(lesson.slug);
  store.finishReading();

  expect(store.lesson?.slug).toBe(lesson.slug);
  expect(store.error).toBeNull();
  expect(store.quiz).toBeNull();
  expect(store.quizError?.traceId).toBe('550e8400-e29b-41d4-a716-446655440005');

  const next = {
    ...lessonQuizFixture(),
    currentUnderstandingLevel: 6,
    targetUnderstandingLevel: 7,
    targetDifficultyLevel: 7,
    isReview: true,
    question: { ...lessonQuizFixture().question, difficultyLevel: 7 },
  };

  server.use(
    http.post(`${baseUrl}/practice/lesson-post-study/next`, () =>
      HttpResponse.json(envelope(next, 120006000)),
    ),
  );
  await store.loadQuiz(lesson.slug);

  expect(store.readingFinished).toBe(true);
  expect(store.quizError).toBeNull();
  expect(store.quiz?.currentUnderstandingLevel).toBe(6);
  expect(store.quiz?.targetDifficultyLevel).toBe(7);
});

test('rejects a quiz belonging to another lesson without displaying its question', async () => {
  server.use(
    http.post(`${baseUrl}/practice/lesson-post-study/next`, () =>
      HttpResponse.json(
        envelope({ ...lessonQuizFixture(), lessonSlug: 'another-lesson' }, 120006000),
      ),
    ),
  );

  const store = createStore();
  await store.loadQuiz(syllabusLessonFixture().slug);

  expect(store.quiz).toBeNull();
  expect(store.quizError?.code).toBe('contract');
});

test.each([undefined, null])(
  'accepts a compatible question schema version with placeholder %s',
  async (placeholder) => {
    const quiz = lessonQuizFixture();
    const promptPayload = { ...quiz.question.promptPayload };

    delete promptPayload.placeholder;

    server.use(
      http.post(`${baseUrl}/practice/lesson-post-study/next`, () =>
        HttpResponse.json(
          envelope(
            {
              ...quiz,
              question: {
                ...quiz.question,
                promptPayload: {
                  ...promptPayload,
                  ...(placeholder === null ? { placeholder: null } : {}),
                  schemaVersion: 2,
                },
              },
            },
            120006000,
          ),
        ),
      ),
    );

    const store = createStore();
    await store.loadQuiz(quiz.lessonSlug);

    expect(store.quiz?.question.promptPayload.schemaVersion).toBe(2);
    expect(store.quiz?.question.promptPayload.placeholder).toBe(placeholder);
    expect(store.quizError).toBeNull();
  },
);

test('suppresses a disposed read and starts a fresh lifecycle without stale data', async () => {
  const started = deferred();
  const released = deferred();
  const finished = deferred();

  server.use(
    http.get(`${baseUrl}/syllabus/lessons/:slug`, async () => {
      started.resolve();
      await released.promise;
      finished.resolve();

      return HttpResponse.json(envelope(syllabusLessonFixture()));
    }),
  );

  const store = createStore();
  const pending = store.loadLesson(syllabusLessonFixture().slug);

  await started.promise;
  store.dispose();
  released.resolve();
  await pending;
  await finished.promise;

  expect(store.lesson).toBeNull();
  expect(store.quiz).toBeNull();
  expect(store.error).toBeNull();
  expect(store.isLoading).toBe(false);

  server.use(
    http.get(`${baseUrl}/syllabus/lessons/:slug`, () =>
      HttpResponse.json(envelope(syllabusLessonFixture())),
    ),
  );
  await store.loadLesson(syllabusLessonFixture().slug);

  expect(store.lesson?.slug).toBe(syllabusLessonFixture().slug);
  expect(store.quiz?.targetDifficultyLevel).toBe(1);
});

test('clears the previous quiz and ignores an older request when the lesson changes', async () => {
  const store = createStore();
  await store.loadQuiz(syllabusLessonFixture().slug);
  expect(store.quiz).not.toBeNull();

  const started = deferred();
  const released = deferred();
  const finished = deferred();

  server.use(
    http.post(`${baseUrl}/practice/lesson-post-study/next`, async ({ request }) => {
      const { lessonSlug } = (await request.json()) as { lessonSlug: string };

      if (lessonSlug === 'older-lesson') {
        started.resolve();
        await released.promise;
        finished.resolve();
      }

      return HttpResponse.json(envelope(lessonQuizFixture({ lessonSlug }), 120006000));
    }),
  );

  const olderRequest = store.loadQuiz('older-lesson');

  await started.promise;
  expect(store.quiz).toBeNull();
  await store.loadQuiz('current-lesson');
  expect(store.quiz?.lessonSlug).toBe('current-lesson');

  released.resolve();
  await olderRequest;
  await finished.promise;

  expect(store.quiz?.lessonSlug).toBe('current-lesson');
  expect(store.quizError).toBeNull();
});
