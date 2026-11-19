import type {
  SyllabusLessonSnapshot,
  SyllabusSkillSnapshot,
  SyllabusTrackSnapshot,
  SyllabusUnitSnapshot,
} from '@/backend/syllabus/domain/repositories/syllabus-catalog.repository';
import type { CanonicalPostStudyQuestion } from '@/backend/syllabus/domain/value-objects/post-study-question-bank';
import type { Locale } from '@/shared/locale';

export interface PublishedOnboardingTrack {
  slug: string;
  curriculumLevel: string;
  sortOrder: number;
  units: {
    slug: string;
    sortOrder: number;
    lessons: { slug: string; sortOrder: number; skillCodes: string[] }[];
  }[];
}

export interface SyllabusUnitReadModel {
  track: SyllabusTrackSnapshot;
  unit: SyllabusUnitSnapshot;
}

export interface SyllabusLessonReadModel extends SyllabusUnitReadModel {
  lesson: SyllabusLessonSnapshot;
}

export interface CanonicalQuestionReadModel extends SyllabusLessonReadModel {
  question: CanonicalPostStudyQuestion;
}

export interface ActivitySkill {
  skill: SyllabusSkillSnapshot;
  track: SyllabusTrackSnapshot;
  unit: SyllabusUnitSnapshot | null;
  lesson: SyllabusLessonSnapshot | null;
}

export interface SyllabusCatalogService {
  getActivitySkills(): Promise<ActivitySkill[]>;

  getPublishedTracks(locale?: Locale): Promise<SyllabusTrackSnapshot[]>;

  getPublishedOnboardingTracks(locale?: Locale): Promise<PublishedOnboardingTrack[]>;

  getPublishedUnit(unitSlug: string, locale?: Locale): Promise<SyllabusUnitReadModel | null>;

  getPublishedLesson(lessonSlug: string, locale?: Locale): Promise<SyllabusLessonReadModel | null>;

  getCanonicalPostStudyQuestion(
    lessonSlug: string,
    difficultyLevel: number,
    locale?: Locale,
  ): Promise<CanonicalQuestionReadModel | null>;

  assertPostStudyBank(lesson: SyllabusLessonSnapshot): void;

  publishedUnits(track: SyllabusTrackSnapshot): SyllabusUnitSnapshot[];

  publishedLessons(unit: SyllabusUnitSnapshot): SyllabusLessonSnapshot[];

  publishedSkills(lesson: SyllabusLessonSnapshot): SyllabusSkillSnapshot[];
}
