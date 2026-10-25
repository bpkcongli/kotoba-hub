import type {
  ItemState,
  BucketUpdate,
} from '@/backend/flashcards/domain/repositories/flashcard.repository';

export class LeitnerScheduler {
  evaluate(
    state: Pick<ItemState, 'currentBucket' | 'consecutiveCorrectCount'>,
    isCorrect: boolean,
    answeredAt: Date,
  ): BucketUpdate {
    const streak = isCorrect ? state.consecutiveCorrectCount + 1 : 0;
    const currentBucket = isCorrect && streak >= 2 ? 'MASTERED' : 'LEARNING';
    const interval = isCorrect
      ? streak >= 2
        ? 24 * 60 * 60 * 1000
        : 2 * 60 * 60 * 1000
      : 10 * 60 * 1000;

    return {
      previousBucket: state.currentBucket,
      currentBucket,
      consecutiveCorrectCount: streak,
      nextDueAt: new Date(answeredAt.getTime() + interval).toISOString(),
    };
  }
}
