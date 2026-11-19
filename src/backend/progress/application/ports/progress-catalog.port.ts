export interface ProgressSkillAttribution {
  skillId: string;
  skillCode: string;
  skillTitle: string;
  lessonId: string | null;
  lessonSlug: string | null;
  lessonTitle: string | null;
  unitId: string | null;
  unitSlug: string | null;
  trackId: string;
  trackSlug: string;
  trackTitle: string;
  vocabularyItemIds?: string[];
  postStudyQuestions: {
    id: string;
    skillCode: string;
    questionType: string;
    difficultyLevel: number;
  }[];
}

export interface ProgressCatalogPort {
  getPublishedAttributions(): Promise<ProgressSkillAttribution[]>;
}
