import type { ContentTranslation } from '@/backend/syllabus/domain/value-objects/bilingual-content';
import type { Locale } from '@/shared/locale';

export interface BilingualSeedOwner {
  id: string;
  contentRevision: number;
  isPublished: boolean;
  sortOrder: number;
  localizations: Partial<Record<Locale, ContentTranslation>>;
  [key: string]: unknown;
}

export interface BilingualSeedSkill extends BilingualSeedOwner {
  code: string;
  slug: string;
  skillType: string;
  prerequisiteSkillCodes: string[];
  content: Record<string, unknown>;
}

export interface BilingualSeedLesson extends BilingualSeedOwner {
  slug: string;
  skills: BilingualSeedSkill[];
  contentBlocks: BilingualSeedOwner[];
  postStudyQuestions: BilingualSeedOwner[];
}

export interface BilingualSeedUnit extends BilingualSeedOwner {
  slug: string;
  lessons: BilingualSeedLesson[];
}

export interface BilingualSeedTrack extends BilingualSeedOwner {
  slug: string;
  curriculumLevel: string;
  units: BilingualSeedUnit[];
}

export interface BilingualSeedPlan {
  schemaVersion: '2.0.0';
  tracks: BilingualSeedTrack[];
  lessonIds: string[];
}

export interface PrepareBilingualSeedService {
  prepare(manifestPath: string): Promise<BilingualSeedPlan>;
}
