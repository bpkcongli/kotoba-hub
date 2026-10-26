import type { Recommendation } from '@/backend/practice/domain/repositories/practice.repository';

export interface PracticeRecommendationPort {
  getRecommendation(userId: string): Promise<Recommendation>;
}
