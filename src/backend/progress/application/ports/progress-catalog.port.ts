export interface ProgressSkillAttribution {
  skillId: string;
  skillCode: string;
  skillTitle: string;
  lessonId: string;
  lessonSlug: string;
  lessonTitle: string;
  unitId: string;
  unitSlug: string;
  trackId: string;
  trackSlug: string;
  trackTitle: string;
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
