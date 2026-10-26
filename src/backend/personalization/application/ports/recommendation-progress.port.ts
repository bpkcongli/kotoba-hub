export interface RecommendationLearningContext {
  skills: {
    skillId: string;
    masteryState: string;
    recommendedDifficultyBand: 'REMEDIAL' | 'STANDARD' | 'STRETCH';
  }[];
  lessons: { lessonId: string; currentUnderstandingLevel: number }[];
  recentMistakes: { skillId: string; questionType: string; answeredAt: string }[];
}

export interface RecommendationProgressPort {
  getLearningContext(userId: string): Promise<RecommendationLearningContext>;
}
