import { InvalidProgressEvent } from '@/backend/progress/domain/exceptions/invalid-progress-event';
import type {
  LessonUnderstandingSnapshot,
  ProgressEventSnapshot,
} from '@/backend/progress/domain/repositories/progress.repository';

export class LessonUnderstandingCalculator {
  advance(
    previous: LessonUnderstandingSnapshot,
    event: ProgressEventSnapshot,
    difficultyLevel: number,
  ): LessonUnderstandingSnapshot {
    if (difficultyLevel !== Math.min(previous.currentUnderstandingLevel + 1, 10)) {
      throw new InvalidProgressEvent(
        'Post-study difficulty does not match the current lesson understanding.',
      );
    }

    if (previous.lastAttemptedAt && event.answeredAt < previous.lastAttemptedAt) {
      throw new InvalidProgressEvent(
        'Post-study attempts must be submitted in chronological order.',
      );
    }

    return {
      ...previous,
      lastProgressEventId: event.id,
      lastQuestionId: event.sourceEntityId,
      currentUnderstandingLevel: Math.min(
        previous.currentUnderstandingLevel + Number(event.isCorrect),
        10,
      ),
      lastAttemptedDifficultyLevel: difficultyLevel,
      lastCorrectDifficultyLevel: event.isCorrect
        ? difficultyLevel
        : previous.lastCorrectDifficultyLevel,
      totalCorrectCount: previous.totalCorrectCount + Number(event.isCorrect),
      totalAttemptCount: previous.totalAttemptCount + 1,
      lastAttemptedAt: event.answeredAt,
      lastCorrectAt: event.isCorrect ? event.answeredAt : previous.lastCorrectAt,
    };
  }
}
