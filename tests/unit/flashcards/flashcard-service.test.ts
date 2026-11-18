import { FlashcardServiceImpl } from '@/backend/flashcards/application/services/impl/flashcard.service.impl';
import { FlashcardError } from '@/backend/flashcards/domain/exceptions/flashcard-error';
import type {
  FlashcardRepository,
  ItemState,
  SessionSnapshot,
  StoredAnswer,
} from '@/backend/flashcards/domain/repositories/flashcard.repository';
import { OptionSnapshotBuilder } from '@/backend/flashcards/domain/services/option-snapshot-builder';
import { deck, ids, item } from './fixtures';
import { translation } from './localized-fixtures';

function setup() {
  const items = [item(), item({ id: ids.nextItem, surfaceFormText: '月' })];
  const sessions = new Map<string, SessionSnapshot>();
  const answers = new Map<string, StoredAnswer>();
  const states: Record<string, ItemState> = {};
  const currentDeck = deck({ itemCount: items.length });

  const repository: FlashcardRepository = {
    listDecks: jest.fn(async () => ({ items: [currentDeck], totalRecords: 1 })),
    findDeck: jest.fn(async () => currentDeck),
    findItems: jest.fn(async (references) =>
      items.filter((value) => references.includes(value.id)),
    ),
    getDeckItems: jest.fn(async () => items),
    getItemStates: jest.fn(async () => states),
    createDeck: jest.fn(async () => {}),
    createSession: jest.fn(async (session) => {
      sessions.set(session.id, structuredClone(session));
    }),

    withSessionLock: async (userId, sessionId, work) => {
      const saved = sessions.get(sessionId);

      if (!saved || saved.userId !== userId) {
        throw new FlashcardError(140405002, 'Flashcard session not found.');
      }

      const session = structuredClone(saved);

      return work({
        session,
        findAnswer: async (itemId) => answers.get(`${sessionId}:${itemId}`) ?? null,
        lockItemState: async (itemId) =>
          states[`${userId}:${itemId}`] ?? {
            currentBucket: 'NEW',
            consecutiveCorrectCount: 0,
            nextDueAt: null,
          },
        saveAnswer: async (answer, turn, bucket) => {
          answers.set(`${sessionId}:${answer.itemId}`, structuredClone(answer));
          states[`${userId}:${turn.id}`] = { ...bucket };
          sessions.set(sessionId, structuredClone(session));
        },
      });
    },

    saveProgressResult: jest.fn(async (answerId, result) => {
      const answer = [...answers.values()].find((value) => value.id === answerId)!;
      answer.result = structuredClone(result);
      answer.progressRecorded = true;

      return result;
    }),
  };

  const progress = {
    recordAnswer: jest.fn(async (_userId: string, answer: StoredAnswer, skillCode: string) => ({
      progressEventId: answer.eventId,
      skillCode,
      masteryScore: 100,
      masteryState: 'STABLE',
      recommendedDifficultyBand: 'STANDARD',
    })),
  };

  const catalog = {
    getPublishedCatalog: jest.fn(async () => ({
      units: [],
      skills: [{ id: ids.skill, code: 'n5_kanji_day' }],
    })),
  };

  const service = new FlashcardServiceImpl(
    repository,
    catalog,
    progress,
    undefined,
    new OptionSnapshotBuilder(() => 0),
    () => new Date('2026-10-19T00:00:00.000Z'),
  );

  const start = () =>
    service.createSession(ids.user, {
      deckId: ids.deck,
      questionScriptMode: 'KANJI',
      answerScriptMode: 'ENGLISH',
    });

  return {
    service,
    repository,
    progress,
    items,
    states,
    sessions,
    answers,
    start,
    currentDeck,
    catalog,
  };
}

describe('flashcard session and answer use cases', () => {
  it('puts due and new items before scheduled items, preserving deck order within each group', async () => {
    const { start, states, items } = setup();
    items.push(item({ id: '30000000-0000-4000-8000-000000000003' }));
    states[ids.item] = {
      currentBucket: 'MASTERED',
      consecutiveCorrectCount: 2,
      nextDueAt: '2026-10-20T00:00:00.000Z',
    };
    states[ids.nextItem] = {
      currentBucket: 'LEARNING',
      consecutiveCorrectCount: 1,
      nextDueAt: '2026-10-19T00:00:00.000Z',
    };

    expect((await start()).turns.map((turn) => turn.id)).toEqual([
      ids.nextItem,
      items[2].id,
      ids.item,
    ]);
  });

  it('rejects inaccessible and empty decks without creating a session', async () => {
    const { start, repository, items } = setup();
    jest.mocked(repository.findDeck).mockResolvedValueOnce(null);

    await expect(start()).rejects.toMatchObject({ code: 140405001 });

    items.length = 0;

    await expect(start()).rejects.toMatchObject({ code: 142205001 });
    expect(repository.createSession).not.toHaveBeenCalled();
  });

  it('grades the stored option snapshot after canonical content changes and strips next answer secrets', async () => {
    const { start, service, items, progress, answers } = setup();
    const session = await start();
    const selectedOptionId = session.turns[0].correctOptionId;
    items[0].answerOptionPayload.ENGLISH!.canonicalAnswer = 'edited after session creation';

    const result = await service.submitAnswer(ids.user, session.id, {
      itemId: ids.item,
      selectedOptionId,
      responseTimeMs: 1800,
    });

    expect(result.isCorrect).toBe(true);
    expect(result.correctAnswer.value).toBe('day / sun');
    expect(result.bucketUpdate.currentBucket).toBe('LEARNING');
    expect(result.feedback).toMatchObject({
      variant: 'KANJI_EXPLANATION',
      progressMessage: 'Progress updated.',
      kanjiDetails: { character: '日', onyomi: ['ニチ', 'ジツ'] },
    });
    expect(result.nextItem).not.toHaveProperty('correctOptionId');
    expect(result.nextItem).not.toHaveProperty('item');
    expect(result.progressImpact?.progressEventId).toBe([...answers.values()][0].eventId);
    expect(progress.recordAnswer).toHaveBeenCalledWith(
      ids.user,
      expect.objectContaining({ skillId: ids.skill, responseTimeMs: 1800 }),
      'n5_kanji_day',
    );
  });

  it('rejects a future item and forged option before writing any answer or progress', async () => {
    const { start, service, answers, progress, sessions } = setup();
    const session = await start();

    await expect(
      service.submitAnswer(ids.user, session.id, {
        itemId: ids.nextItem,
        selectedOptionId: 'opt_1',
      }),
    ).rejects.toMatchObject({ code: 142205005 });

    await expect(
      service.submitAnswer(ids.user, session.id, { itemId: ids.item, selectedOptionId: 'forged' }),
    ).rejects.toMatchObject({ code: 142205006 });
    expect(answers.size).toBe(0);
    expect(sessions.get(session.id)?.totalAnswered).toBe(0);
    expect(progress.recordAnswer).not.toHaveBeenCalled();
  });

  it('keeps session ownership separate from supplied answer fields', async () => {
    const { start, service, answers, progress } = setup();
    const session = await start();

    await expect(
      service.submitAnswer(ids.otherUser, session.id, {
        itemId: ids.item,
        selectedOptionId: session.turns[0].correctOptionId,
      }),
    ).rejects.toMatchObject({ code: 140405002 });
    expect(answers.size).toBe(0);
    expect(progress.recordAnswer).not.toHaveBeenCalled();
  });

  it('completes with accurate counters, and exact replays never advance counters or buckets twice', async () => {
    const { start, service, sessions, answers, states, progress } = setup();
    const session = await start();
    const request = { itemId: ids.item, selectedOptionId: session.turns[0].correctOptionId };
    const first = await service.submitAnswer(ids.user, session.id, request);

    expect(await service.submitAnswer(ids.user, session.id, request)).toEqual(first);
    expect(progress.recordAnswer).toHaveBeenCalledTimes(1);
    expect(states[`${ids.user}:${ids.item}`].consecutiveCorrectCount).toBe(1);

    const last = session.turns[1];
    const final = await service.submitAnswer(ids.user, session.id, {
      itemId: last.id,
      selectedOptionId: last.answerOptions.find((option) => option.id !== last.correctOptionId)!.id,
    });

    expect(final.sessionProgress).toEqual({
      totalItems: 2,
      totalAnswered: 2,
      correctCount: 1,
      incorrectCount: 1,
      isCompleted: true,
    });
    expect(final.nextItem).toBeNull();
    expect(sessions.get(session.id)?.status).toBe('COMPLETED');
    expect(answers.size).toBe(2);

    await expect(
      service.submitAnswer(ids.user, session.id, { ...request, responseTimeMs: 1 }),
    ).rejects.toMatchObject({ code: 142205005 });
  });

  it('recovers a failed progress handoff using the committed answer and stable event id', async () => {
    const { start, service, progress, answers, sessions } = setup();
    progress.recordAnswer.mockRejectedValueOnce(new Error('injected progress failure'));
    const session = await start();
    const request = { itemId: ids.item, selectedOptionId: session.turns[0].correctOptionId };

    await expect(service.submitAnswer(ids.user, session.id, request)).rejects.toThrow(
      'injected progress failure',
    );

    const committed = structuredClone([...answers.values()][0]);

    expect(committed.progressRecorded).toBe(false);
    expect(sessions.get(session.id)?.totalAnswered).toBe(1);
    await expect(
      service.submitAnswer(ids.user, session.id, {
        itemId: ids.nextItem,
        selectedOptionId: session.turns[1].correctOptionId,
      }),
    ).rejects.toMatchObject({ code: 142205005 });

    const result = await service.submitAnswer(ids.user, session.id, request);

    expect(result.progressImpact?.progressEventId).toBe(committed.eventId);
    expect(answers.size).toBe(1);
    expect(sessions.get(session.id)?.totalAnswered).toBe(1);
    expect(progress.recordAnswer.mock.calls.map(([, answer]) => answer.eventId)).toEqual([
      committed.eventId,
      committed.eventId,
    ]);
  });

  it('retries the same event after progress succeeded but its producer acknowledgement failed', async () => {
    const { start, service, repository, progress, answers, catalog } = setup();
    const session = await start();
    const request = { itemId: ids.item, selectedOptionId: session.turns[0].correctOptionId };
    jest
      .mocked(repository.saveProgressResult)
      .mockRejectedValueOnce(new Error('acknowledgement failed'));

    await expect(service.submitAnswer(ids.user, session.id, request)).rejects.toThrow(
      'acknowledgement failed',
    );

    const eventId = [...answers.values()][0].eventId;
    catalog.getPublishedCatalog.mockRejectedValue(
      new Error('Catalog unavailable after progress commit'),
    );
    const result = await service.submitAnswer(ids.user, session.id, request);

    expect(result.progressImpact?.progressEventId).toBe(eventId);
    expect(progress.recordAnswer.mock.calls.map(([, answer]) => answer.eventId)).toEqual([
      eventId,
      eventId,
    ]);
    expect(answers.size).toBe(1);
    expect(catalog.getPublishedCatalog).toHaveBeenCalledTimes(1);
  });

  it('updates an unmapped item locally without recording syllabus progress', async () => {
    const { start, service, items, progress, answers } = setup();
    items[0].skillId = null;
    const session = await start();
    const result = await service.submitAnswer(ids.user, session.id, {
      itemId: ids.item,
      selectedOptionId: session.turns[0].correctOptionId,
    });

    expect(result.progressImpact).toBeNull();
    expect(result.bucketUpdate.currentBucket).toBe('LEARNING');
    expect([...answers.values()][0].progressRecorded).toBe(true);
    expect(progress.recordAnswer).not.toHaveBeenCalled();
  });

  it('creates an empty private deck and preserves reference order for populated decks', async () => {
    const { service, repository } = setup();
    const base = { title: 'My kanji', deckType: 'FOUNDATION', contentType: 'KANJI' as const };
    const empty = await service.createDeck(ids.user, base);
    const populated = await service.createDeck(ids.user, {
      ...base,
      items: [ids.nextItem, ids.item],
    });

    expect(empty).toMatchObject({
      ownerUserId: ids.user,
      deckSource: 'CUSTOM',
      isPublished: false,
      itemCount: 0,
    });
    expect(populated.itemCount).toBe(2);
    expect(repository.createDeck).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: populated.id, ownerUserId: ids.user, ...base }),
      [ids.nextItem, ids.item],
    );
  });

  it('rejects mixed, invalid, duplicate, and inactive item references before creating custom decks', async () => {
    const { service, repository, items } = setup();
    const base = { title: 'My kanji', deckType: 'FOUNDATION', contentType: 'KANJI' as const };

    await expect(
      service.createDeck(ids.user, { ...base, items: [ids.item, ids.item] }),
    ).rejects.toMatchObject({ code: 142205002 });

    await expect(
      service.createDeck(ids.user, { ...base, items: ['missing'] }),
    ).rejects.toMatchObject({ code: 142205002 });

    items[0].isActive = false;

    await expect(
      service.createDeck(ids.user, { ...base, items: [ids.item] }),
    ).rejects.toMatchObject({ code: 142205002 });

    items[0].isActive = true;
    items[0].itemType = 'VOCABULARY';

    await expect(
      service.createDeck(ids.user, { ...base, items: [ids.item] }),
    ).rejects.toMatchObject({ code: 142205003 });
    expect(repository.createDeck).not.toHaveBeenCalled();
  });
});

describe('localized flashcard snapshot compatibility', () => {
  function bilingual() {
    const context = setup();

    Object.assign(context.currentDeck, {
      contentRevision: 1,
      localizations: {
        en: {
          sourceRevision: 1,
          translationRevision: 1,
          isPublished: true,
          sourceRefs: ['test'],
          title: 'N5 Kanji',
          description: null,
        },
        id: {
          sourceRevision: 1,
          translationRevision: 1,
          isPublished: true,
          sourceRefs: ['test'],
          title: 'Kanji Dasar',
          description: null,
        },
      },
    });

    for (const value of context.items) {
      value.contentRevision = 1;
      value.localizations = { en: translation(value, 'day / sun'), id: translation(value) };
    }

    const localizedStart = () =>
      context.service.createSession(ids.user, {
        deckId: ids.deck,
        questionScriptMode: 'KANJI',
        answerScriptMode: 'MEANING',
        contentFormat: 'localized',
        contentLocale: 'id',
      });

    return { ...context, localizedStart };
  }

  it('freezes Indonesian keys, metadata, examples and feedback across content changes and exact retry', async () => {
    const context = bilingual();
    const session = await context.localizedStart();

    expect(session.deck.title).toBe('Kanji Dasar');
    expect(session.turns[0].localization).toMatchObject({
      requestedLocale: 'id',
      resolvedLocale: 'id',
      isFallback: false,
    });

    context.items[0].localizations!.id!.meaning = 'edited';
    context.items[0].localizations!.id!.exampleWords = [];
    const payload = {
      itemId: ids.item,
      selectedOptionId: session.turns[0].correctOptionId,
      responseTimeMs: 1000,
    };

    const result = await context.service.submitAnswer(ids.user, session.id, payload);

    expect(result.feedback.kanjiDetails).toMatchObject({
      meaning: 'hari / matahari',
      exampleWords: [{ word: '日本', kana: 'にほん', meaning: 'Jepang' }],
    });
    expect(result.feedback.kanjiDetails).not.toHaveProperty('englishMeaning');
    expect(result.feedback.explanationText).toBe('Arti karakter ini dalam bahasa Indonesia.');

    expect(await context.service.submitAnswer(ids.user, session.id, payload)).toEqual(result);
    expect(context.progress.recordAnswer).toHaveBeenCalledTimes(1);
    expect(context.states[`${ids.user}:${ids.item}`].consecutiveCorrectCount).toBe(1);

    expect(result.nextItem).not.toHaveProperty('correctOptionId');
    expect(result.nextItem).not.toHaveProperty('localizedContent');
    expect(result.nextItem).toHaveProperty('localization.resolvedLocale', 'id');
  });

  it.each(['draft', 'stale', 'collision'] as const)(
    'falls back as an entire turn for %s Indonesian content',
    async (reason) => {
      const context = bilingual();
      const id = context.items[0].localizations!.id!;

      if (reason === 'draft') id.isPublished = false;
      if (reason === 'stale') id.sourceRevision = 2;
      if (reason === 'collision') id.meaningOptions!.distractors = [' HARI ', 'hari / matahari'];

      const session = await context.localizedStart();

      expect(session.turns[0].localization).toMatchObject({
        resolvedLocale: 'en',
        isFallback: true,
      });
      expect(session.turns[0].localizedContent!.meaning).toBe('day / sun');
      expect(session.turns[0].answerOptions.map((option) => option.value)).not.toContain(
        'hari / matahari',
      );
    },
  );

  it('rejects unavailable English before persistence while legacy remains usable', async () => {
    const context = bilingual();
    context.items[0].localizations = null;

    await expect(context.localizedStart()).rejects.toMatchObject({ code: 142205001 });
    expect(context.repository.createSession).not.toHaveBeenCalled();

    const old = await context.start();

    expect(old.turns[0]).not.toHaveProperty('localization');

    const result = await context.service.submitAnswer(ids.user, old.id, {
      itemId: ids.item,
      selectedOptionId: old.turns[0].correctOptionId,
    });

    expect(result).not.toHaveProperty('localization');
    expect(result.feedback).not.toHaveProperty('explanationText');
    expect(result.feedback.kanjiDetails).toHaveProperty('englishMeaning', 'day / sun');
  });

  it('uses the same per-user item state across legacy and localized sessions', async () => {
    const context = bilingual();
    const first = await context.start();

    await context.service.submitAnswer(ids.user, first.id, {
      itemId: ids.item,
      selectedOptionId: first.turns[0].correctOptionId,
    });

    const next = await context.localizedStart();
    const turn = next.turns.find((value) => value.id === ids.item)!;

    // The other new item is ordered first now; answer it before the previously reviewed item.
    if (next.turns[0].id !== ids.item)
      await context.service.submitAnswer(ids.user, next.id, {
        itemId: next.turns[0].id,
        selectedOptionId: next.turns[0].correctOptionId,
      });

    const result = await context.service.submitAnswer(ids.user, next.id, {
      itemId: ids.item,
      selectedOptionId: turn.correctOptionId,
    });

    expect(result.bucketUpdate).toMatchObject({
      previousBucket: 'LEARNING',
      currentBucket: 'MASTERED',
      consecutiveCorrectCount: 2,
    });
  });
});
