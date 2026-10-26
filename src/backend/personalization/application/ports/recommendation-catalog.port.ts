export interface RecommendationCatalogSkill {
  skillId: string;
  skillCode: string;
  title: string;
  skillType: string;
  lessonId: string;
  lessonSlug: string;
  unitSlug: string;
  trackSlug: string;
  curriculumLevel: string;
  supportsObjective: boolean;
  supportsFreeResponse: boolean;
}

export interface RecommendationCatalogPort {
  getPracticeSkills(): Promise<RecommendationCatalogSkill[]>;
}
