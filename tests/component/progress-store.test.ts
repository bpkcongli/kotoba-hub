import { http, HttpResponse } from 'msw';
import type { LessonAnswerRequest } from '@/frontend/practice/interfaces/requests';
import { createPracticeContainer, PRACTICE_TYPES } from '@/frontend/practice/services';
import type { IPracticeService } from '@/frontend/practice/services/external';
import { createProgressContainer, PROGRESS_TYPES } from '@/frontend/progress/services';
import type { IProgressStore } from '@/frontend/progress/services/internal';
import { createFrontendContainer } from '@/frontend/shared/services';
import { appReadySessionFixture } from '@/mocks/fixtures/session';
import { syllabusTracksFixture, syllabusUnitFixture } from '@/mocks/fixtures/syllabus';
import { server } from '@/mocks/msw.node';
import { setMockSession } from '@/mocks/states/session';

const baseUrl = 'http://localhost:3000/api/v1';

function envelope(data: unknown) {
  return {
    status: {
      traceId: '550e8400-e29b-41d4-a716-446655440000',
      code: 120007000,
      message: 'Success!',
      errorDetails: [],
    },
    data,
  };
}

function overview(averageMasteryScore: number) {
  return {
    trackedSkillsCount: 1,
    masteredSkillsCount: averageMasteryScore >= 90 ? 1 : 0,
    developingSkillsCount: 0,
    weakSkillsCount: averageMasteryScore < 90 ? 1 : 0,
    averageMasteryScore,
    recommendedDifficultyBand: 'STANDARD',
    lastActivityAt: '2026-04-04T10:20:00Z',
    lessonUnderstandingSummary: {
      trackedLessonsCount: 1,
      completedLessonsCount: 0,
      averageUnderstandingLevel: 0,
      maxUnderstandingLevel: 10,
    },
    trackSummaries: [],
  };
}

function createStore() {
  return createProgressContainer({
    parentContainer: createFrontendContainer({
      bootstrap: { session: appReadySessionFixture() },
    }),
  }).get<IProgressStore>(PROGRESS_TYPES.Store);
}

function historyItem(feed: string, index: number) {
  const id = `20000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
  const shared = {
    sourceType: 'LESSON_POST_STUDY',
    sourceSessionId: null,
    trackSlug: 'jlpt-n5-foundation',
    unitSlug: 'n5-kana-basics',
  };

  return feed === 'sessions'
    ? {
        ...shared,
        sessionStatus: 'COMPLETED',
        sessionTitle: 'Hiragana lesson quiz',
        startedAt: null,
        completedAt: '2026-04-04T10:20:00Z',
        lastActivityAt: '2026-04-04T10:20:00Z',
        totalInteractions: 1,
        correctCount: 1,
        incorrectCount: 0,
        averageScore: 100,
      }
    : {
        ...shared,
        id,
        sourceEntityId: id,
        questionType: 'SHORT_FREE_RESPONSE',
        skillCode: 'hiragana_a_row',
        skillTitle: 'Hiragana A Row',
        lessonSlug: 'hiragana-row-a',
        isCorrect: true,
        numericScore: 100,
        confidenceWeight: 0.8,
        responseTimeMs: 1200,
        answeredAt: '2026-04-04T10:20:00Z',
      };
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });

  return { promise, resolve };
}

beforeEach(() => setMockSession(appReadySessionFixture()));

test('keeps skill mastery separate from authoritative lesson completion and isolates containers', async () => {
  server.use(
    http.get(`${baseUrl}/progress/overview`, () => HttpResponse.json(envelope(overview(95)))),
  );

  const first = createStore();
  const second = createStore();

  try {
    await first.load();

    expect(first.overview?.masteredSkillsCount).toBe(1);
    expect(first.overview?.lessonUnderstandingSummary.completedLessonsCount).toBe(0);
    expect(first.error).toBeNull();
    expect(second.overview).toBeNull();
    expect(second.tracks).toEqual([]);
  } finally {
    first.dispose();
    second.dispose();
  }
});

test('reads committed lesson answers again on refresh without counting an idempotent retry twice', async () => {
  const progress = createStore();
  const practice = createPracticeContainer({
    parentContainer: createFrontendContainer({
      bootstrap: { session: appReadySessionFixture() },
    }),
  }).get<IPracticeService>(PRACTICE_TYPES.Service);
  const unit = syllabusUnitFixture();

  try {
    await progress.load();
    await progress.selectUnit(unit.slug);

    expect(progress.overview?.lessonUnderstandingSummary.completedLessonsCount).toBe(0);
    expect(progress.lessonStatuses[0].currentUnderstandingLevel).toBe(0);

    const quiz = await practice.getLessonQuestion(unit.lessons[0].slug);
    const request: LessonAnswerRequest = {
      lessonSlug: quiz.lessonSlug,
      questionId: quiz.question.id,
      userAnswer: { rawInputRomaji: 'a', normalizedKana: 'あ' },
      responseTimeMs: 1200,
    };
    const key = '550e8400-e29b-41d4-a716-446655440033';
    const result = await practice.submitLessonAnswer(request, key);

    expect(result.understandingProgress.currentUnderstandingLevelAfter).toBe(1);

    await progress.refresh();

    expect(progress.overview?.lessonUnderstandingSummary.completedLessonsCount).toBe(1);
    expect(progress.lessonStatuses[0].currentUnderstandingLevel).toBe(1);
    expect(progress.lessonStatuses[0].targetDifficultyLevel).toBe(2);
    expect(progress.lessonStatuses[0].isReview).toBe(true);
    expect(progress.timeline).toHaveLength(1);

    expect(await practice.submitLessonAnswer(request, key)).toEqual(result);
    await progress.refresh();

    expect(progress.timeline).toHaveLength(1);
    expect(progress.overview?.lessonUnderstandingSummary.averageUnderstandingLevel).toBe(1);
  } finally {
    progress.dispose();
  }
});

test('sends source and track filters with paginated session and answer reads', async () => {
  const requests: { path: string; query: URLSearchParams }[] = [];

  server.use(
    ...['sessions', 'timeline'].map((feed) =>
      http.get(`${baseUrl}/progress/${feed}`, ({ request }) => {
        const url = new URL(request.url);
        const offset = Number(url.searchParams.get('offset'));
        const limit = Number(url.searchParams.get('limit'));

        requests.push({ path: url.pathname, query: url.searchParams });

        return HttpResponse.json({
          ...envelope({
            [feed === 'sessions' ? 'progressSessions' : 'progressEvents']: Array.from(
              { length: 30 },
              (_, index) => historyItem(feed, index),
            ).slice(offset, offset + limit),
          }),
          metadata: {
            pagination: {
              pageNumber: Math.floor(offset / limit) + 1,
              pageSize: limit,
              totalRecords: 30,
            },
          },
        });
      }),
    ),
  );

  const store = createStore();
  const slug = syllabusTracksFixture()[0].slug;

  try {
    await store.load();
    await store.selectTrack(slug);
    await store.setSourceType('LESSON_POST_STUDY');
    await store.loadSessions(10);
    await store.loadTimeline(10);

    const paged = requests.filter(({ query }) => query.get('offset') === '10');

    expect(paged.map(({ path }) => path)).toEqual([
      '/api/v1/progress/sessions',
      '/api/v1/progress/timeline',
    ]);

    for (const { query } of paged) {
      expect(query.get('trackSlug')).toBe(slug);
      expect(query.get('sourceTypes')).toBe('LESSON_POST_STUDY');
      expect(Number(query.get('limit'))).toBeGreaterThan(0);
    }

    expect(store.sessionsOffset).toBe(10);
    expect(store.timelineOffset).toBe(10);

    await store.setSourceType('PRACTICE');

    expect(store.sessionsOffset).toBe(0);
    expect(store.timelineOffset).toBe(0);
  } finally {
    store.dispose();
  }
});

test('preserves the last successful overview after a refresh failure and recovers on retry', async () => {
  const store = createStore();

  try {
    await store.load();
    const saved = store.overview;

    server.use(
      http.get(`${baseUrl}/progress/overview`, () =>
        HttpResponse.json(
          {
            status: {
              traceId: '550e8400-e29b-41d4-a716-446655440099',
              code: 150007999,
              message: 'Progress is temporarily unavailable.',
              errorDetails: [],
            },
          },
          { status: 500 },
        ),
      ),
    );

    await store.refresh();

    expect(store.overview).toEqual(saved);
    expect(store.error?.traceId).toBe('550e8400-e29b-41d4-a716-446655440099');

    server.use(
      http.get(`${baseUrl}/progress/overview`, () => HttpResponse.json(envelope(overview(37)))),
    );

    await store.refresh();

    expect(store.overview?.averageMasteryScore).toBe(37);
    expect(store.error).toBeNull();
  } finally {
    store.dispose();
  }
});

test('rejects an invalid understanding level instead of displaying it as saved progress', async () => {
  server.use(
    http.get(`${baseUrl}/progress/overview`, () =>
      HttpResponse.json(
        envelope({
          ...overview(50),
          lessonUnderstandingSummary: {
            ...overview(50).lessonUnderstandingSummary,
            averageUnderstandingLevel: 11,
          },
        }),
      ),
    ),
  );

  const store = createStore();

  try {
    await store.load();

    expect(store.overview).toBeNull();
    expect(store.error?.code).toBe('contract');
  } finally {
    store.dispose();
  }
});

test('ignores a slower overview after the selected track changes', async () => {
  const started = deferred();
  const released = deferred();
  const store = createStore();

  try {
    await store.load();

    server.use(
      http.get(`${baseUrl}/progress/overview`, async ({ request }) => {
        const slug = new URL(request.url).searchParams.get('trackSlug');

        if (slug) {
          started.resolve();
          await released.promise;
        }

        return HttpResponse.json(envelope(overview(slug ? 20 : 80)));
      }),
    );

    const older = store.selectTrack(syllabusTracksFixture()[0].slug);

    await started.promise;
    await store.selectTrack('');

    expect(store.overview?.averageMasteryScore).toBe(80);

    released.resolve();
    await older;

    expect(store.overview?.averageMasteryScore).toBe(80);
    expect(store.error).toBeNull();
  } finally {
    released.resolve();
    store.dispose();
  }
});

test('disposal prevents a late read from restoring progress', async () => {
  const started = deferred();
  const released = deferred();

  server.use(
    http.get(`${baseUrl}/progress/overview`, async () => {
      started.resolve();
      await released.promise;

      return HttpResponse.json(envelope(overview(63)));
    }),
  );

  const store = createStore();
  const pending = store.load();

  try {
    await started.promise;
    store.dispose();
    released.resolve();
    await pending;

    expect(store.overview).toBeNull();
    expect(store.error).toBeNull();
    expect(store.isLoading).toBe(false);
  } finally {
    released.resolve();
    store.dispose();
  }
});
