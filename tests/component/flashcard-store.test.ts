import { http, HttpResponse } from 'msw';
import type { FlashcardAnswerRequest } from '@/frontend/flashcards/interfaces/requests';
import { createFlashcardContainer, FLASHCARD_TYPES } from '@/frontend/flashcards/services';
import type { IFlashcardStore } from '@/frontend/flashcards/services/internal';
import { createFrontendContainer } from '@/frontend/shared/services';
import {
  FLASHCARD_DECK_IDS,
  flashcardDecksFixture,
  flashcardSessionFixture,
} from '@/mocks/fixtures/flashcards';
import { appReadySessionFixture } from '@/mocks/fixtures/session';
import { server } from '@/mocks/msw.node';
import { answerMockFlashcardSession } from '@/mocks/states/flashcards';
import { setMockSession } from '@/mocks/states/session';

const baseUrl = 'http://localhost:3000/api/v1';

function envelope(data: unknown) {
  return {
    status: {
      traceId: '550e8400-e29b-41d4-a716-446655440000',
      code: 120005000,
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

  return createFlashcardContainer({ parentContainer }).get<IFlashcardStore>(FLASHCARD_TYPES.Store);
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });

  return { promise, resolve };
}

beforeEach(() => setMockSession(appReadySessionFixture()));

test('reads all catalog pages through the actual service and isolates feature stores', async () => {
  const decks = flashcardDecksFixture();
  const offsets: number[] = [];
  server.use(
    http.get(`${baseUrl}/flashcards/decks`, ({ request }) => {
      const offset = Number(new URL(request.url).searchParams.get('offset'));
      offsets.push(offset);

      return HttpResponse.json({
        ...envelope({ flashcardDecks: decks.slice(offset, offset + 1) }),
        metadata: {
          pagination: { pageNumber: offset + 1, pageSize: 1, totalRecords: decks.length },
        },
      });
    }),
  );

  const first = createStore();
  const second = createStore();

  await first.loadDecks();
  await second.loadDecks();
  first.selectDeck(FLASHCARD_DECK_IDS.vocabulary);

  expect(offsets).toEqual([0, 1, 2, 0, 1, 2]);
  expect(first.decks).toEqual(decks);
  expect(first.selectedDeck?.contentType).toBe('VOCABULARY');
  expect(second.selectedDeck?.contentType).toBe('KANA');
});

test.each([
  ['kana', 'KANA', 'ROMAJI'],
  ['kana', 'ROMAJI', 'KANA'],
  ['kanji', 'KANJI', 'KANA'],
  ['kanji', 'KANJI', 'ENGLISH'],
  ['kanji', 'KANA', 'KANJI'],
  ['kanji', 'KANA', 'ENGLISH'],
  ['kanji', 'ENGLISH', 'KANJI'],
  ['kanji', 'ENGLISH', 'KANA'],
  ['vocabulary', 'JAPANESE', 'ENGLISH'],
  ['vocabulary', 'ENGLISH', 'JAPANESE'],
  ['vocabulary', 'ENGLISH', 'KANA'],
] as const)(
  'starts %s with %s to %s and locks configuration for that session',
  async (family, question, answer) => {
    const store = createStore();

    await store.loadDecks();
    store.selectDeck(FLASHCARD_DECK_IDS[family]);
    store.setQuestionScriptMode(question);
    store.setAnswerScriptMode(answer);
    await store.startSession();

    expect(store.error).toBeNull();
    expect(store.session?.sessionConfig).toEqual({
      questionScriptMode: question,
      answerScriptMode: answer,
      isLocked: true,
    });
    expect(store.currentItem?.prompt.scriptMode).toBe(question);
    expect(store.currentItem?.answerOptions.every((option) => option.scriptMode === answer)).toBe(
      true,
    );

    store.setQuestionScriptMode('ROMAJI');
    store.setAnswerScriptMode('JAPANESE');
    store.selectDeck(FLASHCARD_DECK_IDS.vocabulary);

    expect(store.questionScriptMode).toBe(question);
    expect(store.answerScriptMode).toBe(answer);
    expect(store.selectedDeckId).toBe(FLASHCARD_DECK_IDS[family]);
  },
);

test('retries the exact submitted choice and response time after an ambiguous failure', async () => {
  const bodies: FlashcardAnswerRequest[] = [];
  let now = 10000;
  jest.spyOn(Date, 'now').mockImplementation(() => now);

  const capture = async ({ request }: { request: Request }) => {
    if (request.method === 'POST' && new URL(request.url).pathname.endsWith('/answer')) {
      bodies.push((await request.clone().json()) as FlashcardAnswerRequest);
    }
  };
  server.events.on('request:start', capture);
  server.use(
    http.post(
      `${baseUrl}/flashcards/sessions/:sessionId/answer`,
      async ({ request, params }) => {
        const committed = answerMockFlashcardSession(
          appReadySessionFixture().user!.id,
          String(params.sessionId),
          (await request.json()) as FlashcardAnswerRequest,
        );

        expect('result' in committed).toBe(true);

        return HttpResponse.json(
          {
            status: {
              traceId: '550e8400-e29b-41d4-a716-446655440009',
              code: 150005999,
              message: 'Progress could not be saved.',
              errorDetails: [],
            },
          },
          { status: 500 },
        );
      },
      { once: true },
    ),
  );

  const store = createStore();

  try {
    await store.loadDecks();
    await store.startSession();
    now = 11700;
    store.selectOption('opt_1');
    await store.submitAnswer();

    expect(store.stage).toBe('question');
    expect(store.error?.traceId).toBe('550e8400-e29b-41d4-a716-446655440009');
    expect(store.answerLocked).toBe(true);

    store.selectOption('opt_2');

    expect(store.selectedOptionId).toBe('opt_1');

    now = 25000;
    await store.submitAnswer();

    expect(store.stage).toBe('feedback');
    expect(store.error).toBeNull();
    expect(bodies).toHaveLength(2);
    expect(bodies[0]).toEqual({
      itemId: store.currentItem!.id,
      selectedOptionId: 'opt_1',
      responseTimeMs: 1700,
    });
    expect(bodies[1]).toEqual(bodies[0]);
    expect(store.session?.sessionProgress.totalAnswered).toBe(1);
  } finally {
    server.events.removeListener('request:start', capture);
  }
});

test('keeps the last answer feedback until continuation and uses authoritative completion counts', async () => {
  const store = createStore();

  await store.loadDecks();
  store.selectDeck(FLASHCARD_DECK_IDS.vocabulary);
  await store.startSession();
  store.selectOption('opt_1');
  await store.submitAnswer();

  expect(store.answerResult?.isCorrect).toBe(true);
  expect(store.answerResult?.progressImpact).not.toBeNull();

  store.continueSession();

  expect(store.stage).toBe('question');
  expect(store.selectedOptionId).toBeNull();
  expect(store.answerResult).toBeNull();

  store.selectOption('opt_2');
  await store.submitAnswer();

  expect(store.stage).toBe('feedback');
  expect(store.answerResult?.isCorrect).toBe(false);
  expect(store.answerResult?.progressImpact).toBeNull();
  expect(store.answerResult?.sessionProgress).toEqual({
    totalItems: 2,
    totalAnswered: 2,
    correctCount: 1,
    incorrectCount: 1,
    isCompleted: true,
  });
  expect(store.currentItem).not.toBeNull();

  store.continueSession();

  expect(store.stage).toBe('completed');
  expect(store.answerResult?.correctAnswer.value).toBe('school');
});

test('rejects another session snapshot without exposing its prompt', async () => {
  const store = createStore();

  await store.loadDecks();
  server.use(
    http.post(`${baseUrl}/flashcards/sessions`, () =>
      HttpResponse.json(envelope(flashcardSessionFixture({ deckId: FLASHCARD_DECK_IDS.kanji }))),
    ),
  );
  await store.startSession();

  expect(store.error?.code).toBe('contract');
  expect(store.currentItem).toBeNull();
  expect(store.session).toBeNull();
  expect(store.stage).toBe('setup');
});

test('disposal suppresses an in-flight session response', async () => {
  const started = deferred();
  const released = deferred();
  const finished = deferred();
  server.use(
    http.post(`${baseUrl}/flashcards/sessions`, async () => {
      started.resolve();
      await released.promise;
      finished.resolve();

      return HttpResponse.json(envelope(flashcardSessionFixture()));
    }),
  );

  const store = createStore();

  await store.loadDecks();
  const pending = store.startSession();
  await started.promise;
  store.dispose();
  released.resolve();
  await pending;
  await finished.promise;

  expect(store.session).toBeNull();
  expect(store.currentItem).toBeNull();
  expect(store.error).toBeNull();
  expect(store.isStarting).toBe(false);
});
