import type {
  RecommendationLearningContext,
  RecommendationProgressPort,
} from '@/backend/personalization/application/ports/recommendation-progress.port';
import type { LearningContextService } from '@/backend/progress/application/services/learning-context.service';

export class RecommendationProgressAdapter implements RecommendationProgressPort {
  constructor(private readonly progress: LearningContextService) {}

  async getLearningContext(userId: string): Promise<RecommendationLearningContext> {
    const state = await this.progress.getLearningContext(userId);

    return {
      skills: state.skills.map(({ skillId, masteryState, recommendedDifficultyBand }) => ({
        skillId,
        masteryState,
        recommendedDifficultyBand,
      })),
      lessons: state.lessons.map(({ lessonId, currentUnderstandingLevel }) => ({
        lessonId,
        currentUnderstandingLevel,
      })),
      recentMistakes: state.recentMistakes.map(({ skillId, questionType, answeredAt }) => ({
        skillId,
        questionType,
        answeredAt,
      })),
    };
  }
}
