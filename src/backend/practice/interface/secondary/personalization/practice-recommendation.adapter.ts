import type { RecommendationService } from '@/backend/personalization/application/services/recommendation.service';
import { RecommendationUnavailable } from '@/backend/personalization/domain/exceptions/recommendation-unavailable';
import type { PracticeRecommendationPort } from '@/backend/practice/application/ports/practice-recommendation.port';
import { PracticeError } from '@/backend/practice/domain/exceptions/practice-error';

export class PracticeRecommendationAdapter implements PracticeRecommendationPort {
  constructor(private readonly recommendation: RecommendationService) {}

  async getRecommendation(userId: string) {
    try {
      return await this.recommendation.getRecommendation(userId);
    } catch (error) {
      if (error instanceof RecommendationUnavailable)
        throw new PracticeError(142206001, error.message);

      throw error;
    }
  }
}
