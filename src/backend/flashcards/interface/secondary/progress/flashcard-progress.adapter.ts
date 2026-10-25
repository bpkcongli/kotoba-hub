import type { FlashcardProgressPort } from '@/backend/flashcards/application/ports/flashcard-progress.port';
import type {
  StoredAnswer,
  ProgressImpact,
} from '@/backend/flashcards/domain/repositories/flashcard.repository';
import type { ProgressService } from '@/backend/progress/application/services/progress.service';

export class FlashcardProgressAdapter implements FlashcardProgressPort {
  constructor(private readonly progress: ProgressService) {}

  async recordAnswer(
    userId: string,
    answer: StoredAnswer,
    skillCode: string,
  ): Promise<ProgressImpact> {
    if (!answer.skillId) throw new Error('Official progress requires a mapped skill.');

    const result = await this.progress.recordLearningEvent({
      eventId: answer.eventId,
      userId,
      skillId: answer.skillId,
      sourceType: 'FLASHCARD',
      sourceSessionId: answer.sessionId,
      sourceEntityId: answer.id,
      questionType: 'MULTIPLE_CHOICE',
      isCorrect: answer.result.isCorrect,
      numericScore: answer.result.isCorrect ? 100 : 0,
      responseTimeMs: answer.responseTimeMs,
      answeredAt: answer.answeredAt,
      gradingMetadata: {
        selectedOptionId: answer.selectedOptionId,
        correctOptionId: answer.result.correctOptionId,
      },
      producerSession: answer.producerSession,
    });

    return {
      progressEventId: result.eventId,
      skillCode,
      masteryScore: result.mastery.masteryScore,
      masteryState: result.mastery.masteryState,
      recommendedDifficultyBand: result.mastery.recommendedDifficultyBand,
    };
  }
}
