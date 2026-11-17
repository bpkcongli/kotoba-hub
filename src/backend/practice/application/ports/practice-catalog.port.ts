import type { CanonicalPostStudyQuestion } from '@/backend/syllabus/domain/value-objects/post-study-question-bank';
import type { Locale } from '@/shared/locale';

export interface PracticeCatalogSkill {
  id: string;
  code: string;
  lessonSlug: string;
  supportsPracticeObjective: boolean;
  supportsPracticeFreeResponse: boolean;
}

export interface PracticeCatalogPort {
  getSkills(): Promise<PracticeCatalogSkill[]>;

  getLesson(slug: string): Promise<{ id: string; slug: string } | null>;

  getQuestion(
    slug: string,
    difficulty: number,
    locale?: Locale,
  ): Promise<(CanonicalPostStudyQuestion & { skillId: string; lessonId: string }) | null>;
}
