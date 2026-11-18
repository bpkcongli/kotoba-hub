import { waitFor } from '@testing-library/react';
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

test('localized session and exact pending answer survive a preference change, then the next session uses the new locale', async () => {
  const store = createStore();

  store.setContentLocale('id');
  await store.loadDecks();
  store.selectDeck(FLASHCARD_DECK_IDS.vocabulary);

  await store.startSession();

  expect(store.session?.sessionConfig).toMatchObject({
    contentFormat: 'localized',
    contentLocale: 'id',
    answerScriptMode: 'MEANING',
  });
  expect(store.currentItem?.answerOptions.map((value) => value.value)).toContain('Jepang');

  const payloads: FlashcardAnswerRequest[] = [];
  let fail = true;

  server.use(
    http.post(`${baseUrl}/flashcards/sessions/:sessionId/answer`, async ({ request, params }) => {
      const payload = (await request.json()) as FlashcardAnswerRequest;
      payloads.push(payload);

      const result = answerMockFlashcardSession(
        appReadySessionFixture().user!.id,
        String(params.sessionId),
        payload,
      );

      if (fail) {
        fail = false;

        return HttpResponse.error();
      }

      if (!('result' in result)) throw new Error('Missing stored answer');

      return HttpResponse.json(envelope(result.result));
    }),
  );

  store.selectOption('opt_1');
  await store.submitAnswer();

  expect(store.answerLocked).toBe(true);

  store.setContentLocale('en');
  await store.submitAnswer();

  expect(payloads).toHaveLength(2);
  expect(payloads[1]).toEqual(payloads[0]);
  expect(store.answerResult?.feedback.vocabularyDetails).toMatchObject({ meaning: 'Jepang' });
  expect(store.session?.sessionConfig.contentLocale).toBe('id');

  store.resetSession();
  await store.loadDecks();
  store.selectDeck(FLASHCARD_DECK_IDS.vocabulary);

  await store.startSession();

  expect(store.session?.sessionConfig.contentLocale).toBe('en');
  expect(store.currentItem?.answerOptions.map((value) => value.value)).toContain('Japan');
});

test('discards an obsolete locale catalog response and starts pending creation in its captured language', async () => {
  const store = createStore();
  const old = deferred();

  server.use(
    http.get(`${baseUrl}/flashcards/decks`, async ({ request }) => {
      const locale = new URL(request.url).searchParams.get('contentLocale') === 'id' ? 'id' : 'en';

      if (locale === 'id') await old.promise;

      return HttpResponse.json({
        ...envelope({ flashcardDecks: flashcardDecksFixture(locale) }),
        metadata: { pagination: { pageNumber: 1, pageSize: 100, totalRecords: 3 } },
      });
    }),
  );

  store.setContentLocale('id');

  const pending = store.loadDecks();

  store.setContentLocale('en');
  await store.loadDecks();

  old.resolve();
  await pending;

  expect(store.decks[0].title).toBe('Kana foundations');

  const gate = deferred();
  let body: unknown;

  server.use(
    http.post(`${baseUrl}/flashcards/sessions`, async ({ request }) => {
      body = await request.json();
      await gate.promise;

      return HttpResponse.json(
        envelope(flashcardSessionFixture(body as Parameters<typeof flashcardSessionFixture>[0])),
      );
    }),
  );

  const starting = store.startSession();

  store.setContentLocale('id');
  gate.resolve();
  await starting;

  expect(body).toMatchObject({ contentLocale: 'en' });
  expect(store.session?.sessionConfig.contentLocale).toBe('en');
  expect(store.contentLocale).toBe('id');
});

test('refreshes setup in the latest locale when a pending create fails after preferences change', async () => {
  const store = createStore();

  store.setContentLocale('en');
  await store.loadDecks();

  const gate = deferred();

  server.use(
    http.post(`${baseUrl}/flashcards/sessions`, async () => {
      await gate.promise;

      return HttpResponse.error();
    }),
  );

  const starting = store.startSession();

  store.setContentLocale('id');
  gate.resolve();
  await starting;

  await waitFor(() => {
    expect(store.isLoading).toBe(false);
    expect(store.decks[0]?.title).toBe('Dasar Kana');
  });

  expect(store.stage).toBe('setup');
  expect(store.errorOperation).toBe('start');
  expect(store.error).not.toBeNull();
  expect(store.selectedDeck?.id).toBe(FLASHCARD_DECK_IDS.kana);
});
