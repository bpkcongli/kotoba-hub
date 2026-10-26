import type {
  LessonUnderstandingSnapshot,
  SkillMasterySnapshot,
} from '@/backend/progress/domain/repositories/progress.repository';

export interface LearningContext {
  skills: SkillMasterySnapshot[];
  lessons: LessonUnderstandingSnapshot[];
  recentMistakes: { skillId: string; questionType: string; answeredAt: string }[];
}

export interface LearningContextService {
  getLearningContext(userId: string): Promise<LearningContext>;
}
