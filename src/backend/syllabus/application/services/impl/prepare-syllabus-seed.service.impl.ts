import { z } from 'zod';
import { normalizeContentBlock } from '@/backend/syllabus/application/helpers/normalize-content-block';
import type {
  PrepareSyllabusSeedService,
  SyllabusSeedPlan,
} from '@/backend/syllabus/application/services/prepare-syllabus-seed.service';
import type {
  SyllabusCatalogRepository,
  SyllabusLessonSnapshot,
} from '@/backend/syllabus/domain/repositories/syllabus-catalog.repository';
import { PostStudyQuestionBank } from '@/backend/syllabus/domain/value-objects/post-study-question-bank';

const sourceRefSchema = z
  .object({
    provider: z.string().min(1).max(50),
    category: z.string().min(1),
    externalId: z.string().min(1),
    sourceUrl: z.url().optional(),
    licenseNote: z.string().optional(),
    retrievedFrom: z.string().optional(),
    notes: z.string().optional(),
  })
  .strict()
  .refine((source) => source.provider === 'KOTOBAHUB_INTERNAL' || source.sourceUrl !== undefined);

export class PrepareSyllabusSeedServiceImpl implements PrepareSyllabusSeedService {
  constructor(private readonly repository: SyllabusCatalogRepository) {}

  async prepare(): Promise<SyllabusSeedPlan> {
    const rejectedLessons: SyllabusSeedPlan['rejectedLessons'] = [];
    const tracks = (await this.repository.getTracks())
      .filter((track) => track.isPublished)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .flatMap((track) => {
        const units = track.units
          .filter((unit) => unit.isPublished)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .flatMap((unit) => {
            const lessons = unit.lessons
              .filter((lesson) => lesson.isPublished)
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .flatMap((lesson) => {
                try {
                  return [this.prepareLesson(lesson)];
                } catch (error) {
                  rejectedLessons.push({
                    slug: lesson.slug,
                    reason: error instanceof Error ? error.message : String(error),
                  });
                  return [];
                }
              });
            return lessons.length ? [{ ...unit, lessons }] : [];
          });
        return units.length ? [{ ...track, units }] : [];
      });

    const units = tracks.flatMap((track) => track.units);
    const lessons = units.flatMap((unit) => unit.lessons);
    const counts = {
      tracks: tracks.length,
      units: units.length,
      lessons: lessons.length,
      skills: lessons.reduce((count, lesson) => count + lesson.skills.length, 0),
      contentBlocks: lessons.reduce((count, lesson) => count + lesson.contentBlocks.length, 0),
      questions: lessons.reduce(
        (count, lesson) => count + (lesson.postStudyQuestions?.length ?? 0),
        0,
      ),
      mappings: lessons.reduce((count, lesson) => count + lesson.skills.length, 0),
    };

    return { tracks, counts, rejectedLessons };
  }

  private prepareLesson(lesson: SyllabusLessonSnapshot): SyllabusLessonSnapshot {
    const skills = lesson.skills
      .filter((skill) => skill.isPublished)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    if (!skills.length) throw new Error('no published skills');

    const questions = (lesson.postStudyQuestions ?? []).filter(
      (question) => question.isPublished !== false,
    );

    // Check validity of post study question bank
    new PostStudyQuestionBank(
      lesson.slug,
      questions,
      skills.map((skill) => skill.code),
    );

    for (const question of questions) {
      if (
        !Number.isInteger(question.sortOrder) ||
        (question.sortOrder as number) < 1 ||
        question.isPublished !== true
      ) {
        throw new Error(`question ${question.id} has invalid seed publication or sort order`);
      }

      if (
        !question.sourceRefs.length ||
        !question.sourceRefs.every((source) => sourceRefSchema.safeParse(source).success)
      ) {
        throw new Error(`question ${question.id} has invalid source provenance`);
      }
    }

    const contentBlocks = lesson.contentBlocks
      .filter((block) => block.isPublished)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(normalizeContentBlock);

    for (const block of contentBlocks) {
      if (
        block.blockType === 'GRAMMAR_STRUCTURE' &&
        !skills.some(
          (skill) => skill.skillType === 'GRAMMAR' && skill.code === block.content?.skillCode,
        )
      ) {
        throw new Error(
          `content block ${block.id} has no published grammar skill in lesson ${lesson.slug}`,
        );
      }
    }

    return { ...lesson, skills, contentBlocks, postStudyQuestions: questions };
  }
}
