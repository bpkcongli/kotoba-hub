import type {
  SyllabusLessonReadModel,
  SyllabusUnitReadModel,
} from '@/backend/syllabus/application/services/syllabus-catalog.service';
import type { SyllabusCatalogService } from '@/backend/syllabus/application/services/syllabus-catalog.service';
import type {
  SyllabusContentBlockSnapshot,
  SyllabusSkillSnapshot,
  SyllabusTrackSnapshot,
} from '@/backend/syllabus/domain/repositories/syllabus-catalog.repository';

export interface UnitMapSummaryDto {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  sortOrder: number;
  isFoundationUnit: boolean;
  lessonCount: number;
}

export interface TrackSummaryDto {
  id: string;
  slug: string;
  curriculumLevel: string;
  title: string;
  description: string | null;
  sortOrder: number;
  unitCount: number;
  foundationUnitSlug: string | null;
  units?: UnitMapSummaryDto[];
}

export function toTrackSummaryDto(
  track: SyllabusTrackSnapshot,
  catalog: SyllabusCatalogService,
  includeUnits = false,
): TrackSummaryDto {
  const units = catalog.publishedUnits(track);

  return {
    id: track.id,
    slug: track.slug,
    curriculumLevel: track.curriculumLevel,
    title: track.title,
    description: track.description,
    sortOrder: track.sortOrder,
    unitCount: units.length,
    foundationUnitSlug: units.find((unit) => unit.isFoundationUnit)?.slug ?? null,
    ...(includeUnits
      ? {
          units: units.map((unit) => ({
            id: unit.id,
            slug: unit.slug,
            title: unit.title,
            description: unit.description,
            sortOrder: unit.sortOrder,
            isFoundationUnit: unit.isFoundationUnit,
            lessonCount: catalog.publishedLessons(unit).length,
          })),
        }
      : {}),
  };
}

function toTrackParentDto(track: SyllabusTrackSnapshot) {
  return {
    id: track.id,
    slug: track.slug,
    curriculumLevel: track.curriculumLevel,
    title: track.title,
  };
}

function toSkillDto(skill: SyllabusSkillSnapshot) {
  return {
    id: skill.id,
    code: skill.code,
    slug: skill.slug,
    curriculumLevel: skill.curriculumLevel,
    title: skill.title,
    description: skill.description,
    skillType: skill.skillType,
    supportsFlashcards: skill.supportsFlashcards,
    supportsPracticeObjective: skill.supportsPracticeObjective,
    supportsPracticeFreeResponse: skill.supportsPracticeFreeResponse,
    prerequisiteSkillCodes: skill.prerequisiteSkillCodes,
  };
}

function toContentBlockDto(block: SyllabusContentBlockSnapshot) {
  if (!block.content) throw new Error(`Published content block ${block.id} has no content.`);

  return {
    id: block.id,
    blockType: block.blockType,
    content: block.content,
    sortOrder: block.sortOrder,
  };
}

export function toUnitDto(
  result: SyllabusUnitReadModel,
  catalog: SyllabusCatalogService,
  includeLessons: boolean,
  includeSkills: boolean,
) {
  const { track, unit } = result;
  const lessons = catalog.publishedLessons(unit);

  return {
    id: unit.id,
    slug: unit.slug,
    title: unit.title,
    description: unit.description,
    sortOrder: unit.sortOrder,
    isFoundationUnit: unit.isFoundationUnit,
    track: toTrackParentDto(track),
    lessons: includeLessons
      ? lessons.map((lesson) => ({
          id: lesson.id,
          slug: lesson.slug,
          title: lesson.title,
          learningObjective: lesson.learningObjective,
          sortOrder: lesson.sortOrder,
          estimatedMinutes: lesson.estimatedMinutes,
          skills: includeSkills ? catalog.publishedSkills(lesson).map(toSkillDto) : [],
        }))
      : [],
    unitSkills: includeSkills
      ? (
          unit.unitSkillMappings ??
          lessons
            .flatMap((lesson) =>
              catalog.publishedSkills(lesson).map((skill) => ({
                skillCode: skill.code,
                lessonSlug: lesson.slug,
                isPrimary: true,
              })),
            )
            .map((mapping, index) => ({ ...mapping, sortOrder: index + 1 }))
        )
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
      : [],
  };
}

export function toLessonDto(
  result: SyllabusLessonReadModel,
  catalog: SyllabusCatalogService,
  includeContentBlocks: boolean,
  includeSkills: boolean,
) {
  const { track, unit, lesson } = result;

  return {
    id: lesson.id,
    slug: lesson.slug,
    title: lesson.title,
    learningObjective: lesson.learningObjective,
    sortOrder: lesson.sortOrder,
    estimatedMinutes: lesson.estimatedMinutes,
    track: toTrackParentDto(track),
    unit: { id: unit.id, slug: unit.slug, title: unit.title, sortOrder: unit.sortOrder },
    contentBlocks: includeContentBlocks
      ? lesson.contentBlocks
          .filter((block) => block.isPublished)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(toContentBlockDto)
      : [],
    postStudyQuiz: {
      isRequired: true,
      practiceMode: 'DIRECT_LESSON_POST_STUDY',
      deliveryMode: 'DETERMINISTIC_CURATED',
      questionType: 'SHORT_FREE_RESPONSE',
      questionCountPerAttempt: 1,
      bankQuestionCount: 10,
      difficultyLevelStart: 1,
      difficultyLevelEnd: 10,
      initialUnderstandingLevel: 0,
      maxUnderstandingLevel: 10,
    },
    skills: includeSkills ? catalog.publishedSkills(lesson).map(toSkillDto) : [],
  };
}
