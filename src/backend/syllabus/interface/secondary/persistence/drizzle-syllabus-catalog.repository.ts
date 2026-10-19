import { eq } from 'drizzle-orm';
import { getDatabase } from '@/backend/shared/infrastructure/database/connection';
import type {
  SyllabusCatalogRepository,
  SyllabusTrackSnapshot,
} from '@/backend/syllabus/domain/repositories/syllabus-catalog.repository';
import {
  lessonContentBlocks,
  lessonPostStudyQuestions,
  lessons,
  skills,
  tracks,
  units,
  unitSkillMappings,
} from '@/backend/syllabus/infrastructure/database/schema';

export class DrizzleSyllabusCatalogRepository implements SyllabusCatalogRepository {
  async getTracks(): Promise<SyllabusTrackSnapshot[]> {
    const db = getDatabase();

    return db.transaction(
      async (tx) => {
        const trackRows = await tx.select().from(tracks).where(eq(tracks.isPublished, true));
        const unitRows = await tx.select().from(units).where(eq(units.isPublished, true));
        const lessonRows = await tx.select().from(lessons).where(eq(lessons.isPublished, true));
        const skillRows = await tx.select().from(skills).where(eq(skills.isPublished, true));
        const blockRows = await tx
          .select()
          .from(lessonContentBlocks)
          .where(eq(lessonContentBlocks.isPublished, true));
        const questionRows = await tx.select().from(lessonPostStudyQuestions);
        const mappingRows = await tx.select().from(unitSkillMappings);

        return trackRows.map((track) => ({
          id: track.id,
          slug: track.slug,
          curriculumLevel: track.curriculumLevel,
          title: track.title,
          description: track.description,
          sortOrder: track.sortOrder,
          isPublished: track.isPublished,
          units: unitRows
            .filter((unit) => unit.trackId === track.id)
            .map((unit) => ({
              id: unit.id,
              slug: unit.slug,
              title: unit.title,
              description: unit.description,
              sortOrder: unit.sortOrder,
              isFoundationUnit: unit.isFoundationUnit,
              isPublished: unit.isPublished,
              unitSkillMappings: mappingRows
                .filter((mapping) => mapping.unitId === unit.id)
                .flatMap((mapping) => {
                  const skill = skillRows.find((row) => row.id === mapping.skillId);
                  const lesson = lessonRows.find((row) => row.id === mapping.lessonId);
                  return skill &&
                    lesson &&
                    lesson.unitId === unit.id &&
                    skill.lessonId === lesson.id
                    ? [
                        {
                          skillCode: skill.code,
                          lessonSlug: lesson.slug,
                          isPrimary: mapping.isPrimary,
                          sortOrder: mapping.sortOrder,
                        },
                      ]
                    : [];
                }),
              lessons: lessonRows
                .filter((lesson) => lesson.unitId === unit.id)
                .map((lesson) => ({
                  id: lesson.id,
                  slug: lesson.slug,
                  title: lesson.title,
                  learningObjective: lesson.learningObjective,
                  sortOrder: lesson.sortOrder,
                  estimatedMinutes: lesson.estimatedMinutes,
                  isPublished: lesson.isPublished,
                  contentBlocks: blockRows
                    .filter((block) => block.lessonId === lesson.id)
                    .map((block) => ({
                      id: block.id,
                      blockType: block.blockType,
                      content: block.content as Record<string, unknown>,
                      sortOrder: block.sortOrder,
                      isPublished: block.isPublished,
                    })),
                  skills: skillRows
                    .filter((skill) => skill.lessonId === lesson.id)
                    .map((skill) => ({
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
                      prerequisiteSkillCodes: Array.isArray(skill.prerequisiteSkillCodes)
                        ? (skill.prerequisiteSkillCodes as string[])
                        : [],
                      sortOrder: skill.sortOrder,
                      isPublished: skill.isPublished,
                    })),
                  postStudyQuestions: questionRows
                    .filter((question) => question.lessonId === lesson.id)
                    .map((question) => ({
                      id: question.id,
                      skillCode:
                        skillRows.find((skill) => skill.id === question.skillId)?.code ?? '',
                      difficultyLevel: question.difficultyLevel,
                      questionType: question.questionType,
                      promptPayload: question.promptPayload as Record<string, unknown>,
                      expectedAnswer: question.expectedAnswerPayload as Record<string, unknown>,
                      explanation: question.explanationText,
                      sourceRefs: Array.isArray(question.sourceRefPayload)
                        ? question.sourceRefPayload
                        : [],
                    })),
                })),
            })),
        }));
      },
      { isolationLevel: 'repeatable read', withConsistentSnapshot: true },
    );
  }
}

export const syllabusCatalogRepository = new DrizzleSyllabusCatalogRepository();
