import { z } from 'zod';
import { apiStatusSchema } from '@/frontend/shared/interfaces/responses';

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const order = z.number().int();
const nonblank = z.string().min(1);

const skillSchema = z.object({
  id: z.uuid(),
  code: nonblank,
  slug,
  curriculumLevel: nonblank,
  title: nonblank,
  description: z.string().nullable(),
  skillType: nonblank,
  supportsFlashcards: z.boolean(),
  supportsPracticeObjective: z.boolean(),
  supportsPracticeFreeResponse: z.boolean(),
  prerequisiteSkillCodes: z.array(z.string()),
});

const trackParent = z.object({ id: z.uuid(), slug, curriculumLevel: nonblank, title: nonblank });

export const trackSchema = trackParent.extend({
  description: z.string().nullable(),
  sortOrder: order,
  unitCount: z.number().int().nonnegative(),
  foundationUnitSlug: slug.nullable(),
  units: z.array(
    z.object({
      id: z.uuid(),
      slug,
      title: nonblank,
      description: z.string().nullable(),
      sortOrder: order,
      isFoundationUnit: z.boolean(),
      lessonCount: z.number().int().nonnegative(),
    }),
  ),
});

const lessonSummary = z.object({
  id: z.uuid(),
  slug,
  title: nonblank,
  learningObjective: z.string().nullable(),
  sortOrder: order,
  estimatedMinutes: z.number().int().nonnegative().nullable(),
  skills: z.array(skillSchema),
});

export const unitSchema = z.object({
  id: z.uuid(),
  slug,
  title: nonblank,
  description: z.string().nullable(),
  sortOrder: order,
  isFoundationUnit: z.boolean(),
  track: trackParent,
  lessons: z.array(lessonSummary),
  unitSkills: z.array(
    z.object({ skillCode: nonblank, lessonSlug: slug, isPrimary: z.boolean(), sortOrder: order }),
  ),
});

export const contentBlockSchema = z.discriminatedUnion('blockType', [
  z.object({
    id: z.uuid(),
    sortOrder: order,
    blockType: z.literal('PARAGRAPH'),
    content: z.object({ title: z.string().optional(), body: nonblank }),
  }),
  z.object({
    id: z.uuid(),
    sortOrder: order,
    blockType: z.literal('EXAMPLE_SENTENCE'),
    content: z.object({ japaneseSentence: nonblank, englishTranslation: nonblank }),
  }),
  z.object({
    id: z.uuid(),
    sortOrder: order,
    blockType: z.literal('GRAMMAR_STRUCTURE'),
    content: z
      .object({
        skillCode: nonblank,
        ALL: nonblank.nullish(),
        STANDARD: nonblank.nullish(),
        POLITE: nonblank.nullish(),
      })
      .refine((c) => Boolean(c.ALL || c.STANDARD || c.POLITE)),
  }),
]);

export const lessonSchema = lessonSummary.extend({
  track: trackParent,
  unit: z.object({ id: z.uuid(), slug, title: nonblank, sortOrder: order }),
  contentBlocks: z.array(contentBlockSchema),
  postStudyQuiz: z.object({
    isRequired: z.literal(true),
    practiceMode: z.literal('DIRECT_LESSON_POST_STUDY'),
    deliveryMode: z.literal('DETERMINISTIC_CURATED'),
    questionType: z.literal('SHORT_FREE_RESPONSE'),
    questionCountPerAttempt: z.literal(1),
    bankQuestionCount: z.literal(10),
    difficultyLevelStart: z.literal(1),
    difficultyLevelEnd: z.literal(10),
    initialUnderstandingLevel: z.literal(0),
    maxUnderstandingLevel: z.literal(10),
  }),
});

export const nextQuizSchema = z.object({
  lessonSlug: slug,
  currentUnderstandingLevel: z.number().int().min(0).max(10),
  targetUnderstandingLevel: z.number().int().min(1).max(10),
  targetDifficultyLevel: z.number().int().min(1).max(10),
  isReview: z.boolean(),
  question: z.object({
    id: z.uuid(),
    skillCode: nonblank,
    questionType: z.literal('SHORT_FREE_RESPONSE'),
    gradingStrategy: z.literal('DETERMINISTIC'),
    difficultyLevel: z.number().int().min(1).max(10),
    promptPayload: z.object({
      schemaVersion: z.number().int().min(1),
      promptLanguage: z.literal('JA'),
      answerLanguage: z.literal('JA'),
      slotCount: z.literal(1),
      sentenceTemplate: nonblank,
      sentenceTemplateHtml: nonblank,
      blankInputMode: z.literal('ROMAJI_TO_KANA'),
      placeholder: z.string().nullish(),
      inputMethod: z.object({ acceptsRomaji: z.literal(true), transformsTo: z.literal('KANA') }),
      hintTexts: z.array(z.string()).optional(),
    }),
  }),
});

const syllabusStatus = apiStatusSchema.extend({ code: z.literal(120004000) });

export const tracksResponseSchema = z.object({
  status: syllabusStatus,
  data: z.object({ tracks: z.array(trackSchema) }),
  metadata: z.object({
    pagination: z.object({
      pageNumber: z.number().int().positive(),
      pageSize: z.number().int().positive(),
      totalRecords: z.number().int().nonnegative(),
    }),
  }),
});

export const unitResponseSchema = z.object({ status: syllabusStatus, data: unitSchema });

export const lessonResponseSchema = z.object({ status: syllabusStatus, data: lessonSchema });

export const nextQuizResponseSchema = z.object({
  status: apiStatusSchema.extend({ code: z.literal(120006000) }),
  data: nextQuizSchema,
});
