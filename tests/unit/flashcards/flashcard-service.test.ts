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
