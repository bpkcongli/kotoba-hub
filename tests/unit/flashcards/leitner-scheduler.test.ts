import { LeitnerScheduler } from '@/backend/flashcards/domain/services/leitner-scheduler';

describe('flashcard Leitner scheduling', () => {
  const scheduler = new LeitnerScheduler();
  const answeredAt = new Date('2026-10-19T00:00:00.000Z');

  it('introduces an unseen item into learning after its first correct answer', () => {
    expect(
      scheduler.evaluate({ currentBucket: 'NEW', consecutiveCorrectCount: 0 }, true, answeredAt),
    ).toEqual({
      previousBucket: 'NEW',
      currentBucket: 'LEARNING',
      consecutiveCorrectCount: 1,
      nextDueAt: '2026-10-19T02:00:00.000Z',
    });
  });

  it('promotes an item on its second consecutive correct answer', () => {
    expect(
      scheduler.evaluate(
        { currentBucket: 'LEARNING', consecutiveCorrectCount: 1 },
        true,
        answeredAt,
      ),
    ).toEqual({
      previousBucket: 'LEARNING',
      currentBucket: 'MASTERED',
      consecutiveCorrectCount: 2,
      nextDueAt: '2026-10-20T00:00:00.000Z',
    });
  });

  it('keeps a mastered item mastered when recall succeeds again', () => {
    expect(
      scheduler.evaluate(
        { currentBucket: 'MASTERED', consecutiveCorrectCount: 2 },
        true,
        answeredAt,
      ),
    ).toMatchObject({
      currentBucket: 'MASTERED',
      consecutiveCorrectCount: 3,
      nextDueAt: '2026-10-20T00:00:00.000Z',
    });
  });

  it.each([
    ['NEW', 0],
    ['LEARNING', 1],
    ['MASTERED', 5],
  ] as const)('resets failed recall from %s to learning with a short retry', (bucket, streak) => {
    expect(
      scheduler.evaluate(
        { currentBucket: bucket, consecutiveCorrectCount: streak },
        false,
        answeredAt,
      ),
    ).toEqual({
      previousBucket: bucket,
      currentBucket: 'LEARNING',
      consecutiveCorrectCount: 0,
      nextDueAt: '2026-10-19T00:10:00.000Z',
    });
  });

  it('requires a fresh streak after failure and leaves caller state untouched', () => {
    const state = { currentBucket: 'MASTERED' as const, consecutiveCorrectCount: 4 };
    const failed = scheduler.evaluate(state, false, answeredAt);
    const recovered = scheduler.evaluate(failed, true, answeredAt);

    expect(recovered.currentBucket).toBe('LEARNING');
    expect(recovered.consecutiveCorrectCount).toBe(1);
    expect(state).toEqual({ currentBucket: 'MASTERED', consecutiveCorrectCount: 4 });
    expect(answeredAt.toISOString()).toBe('2026-10-19T00:00:00.000Z');
  });
});
