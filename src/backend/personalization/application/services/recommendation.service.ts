import type {
  AiContextBundle,
  AiDifficultyBand,
} from '@/backend/shared/application/services/requests/ai-request';

export interface PracticeRecommendation {
  context: AiContextBundle;
  difficultyBand: AiDifficultyBand;
  questionMix: { WEAK: number; REINFORCEMENT: number; STRETCH: number };
}

export interface RecommendationService {
  getRecommendation(userId: string): Promise<PracticeRecommendation>;
}
