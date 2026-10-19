import type { CanonicalPostStudyQuestion } from '@/backend/syllabus/domain/value-objects/post-study-question-bank';

export interface SyllabusSkillSnapshot {
  id: string;
  code: string;
  slug: string;
  curriculumLevel: string;
  title: string;
  description: string | null;
  skillType: string;
  supportsFlashcards: boolean;
  supportsPracticeObjective: boolean;
  supportsPracticeFreeResponse: boolean;
  prerequisiteSkillCodes: string[];
  sortOrder: number;
  isPublished: boolean;
}

export interface SyllabusContentBlockSnapshot {
  id: string;
  blockType: string;
  content?: Record<string, unknown>;
  title?: string;
  body?: string;
  sortOrder: number;
  isPublished: boolean;
}

export interface SyllabusLessonSnapshot {
  id: string;
  slug: string;
  title: string;
  learningObjective: string | null;
  sortOrder: number;
  estimatedMinutes: number | null;
  isPublished: boolean;
  contentBlocks: SyllabusContentBlockSnapshot[];
  postStudyQuestions?: (CanonicalPostStudyQuestion & {
    isPublished?: boolean;
    sortOrder?: number;
  })[];
  skills: SyllabusSkillSnapshot[];
}

export interface SyllabusUnitSnapshot {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  sortOrder: number;
  isFoundationUnit: boolean;
  isPublished: boolean;
  unitSkillMappings?: {
    skillCode: string;
    lessonSlug: string;
    isPrimary: boolean;
    sortOrder: number;
  }[];
  lessons: SyllabusLessonSnapshot[];
}

export interface SyllabusTrackSnapshot {
  id: string;
  slug: string;
  curriculumLevel: string;
  title: string;
  description: string | null;
  sortOrder: number;
  isPublished: boolean;
  units: SyllabusUnitSnapshot[];
}

export interface SyllabusCatalogRepository {
  getTracks(): Promise<SyllabusTrackSnapshot[]>;
}
