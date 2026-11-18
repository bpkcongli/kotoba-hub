import { z } from 'zod';
import { apiStatusSchema } from '@/frontend/shared/interfaces/responses';
import { localeSchema } from '@/shared/locale';

const id = z.uuid();
const count = z.number().int().nonnegative();

export const scriptModeSchema = z.enum([
  'KANJI',
  'KANA',
  'ENGLISH',
  'ROMAJI',
  'JAPANESE',
  'MEANING',
]);

export const contentTypeSchema = z.enum(['KANJI', 'KANA', 'VOCABULARY']);

const localizationSchema = z
  .object({
    requestedLocale: localeSchema,
    resolvedLocale: localeSchema,
    isFallback: z.boolean(),
    contentRevision: z.number().int().positive(),
    translationRevision: z.number().int().positive(),
  })
  .refine(
    (value) =>
      value.isFallback === (value.requestedLocale !== value.resolvedLocale) &&
      (!value.isFallback || value.resolvedLocale === 'en'),
  );

const deckSummarySchema = z.object({
  id,
  slug: z.string().nullable(),
  title: z.string(),
  localization: localizationSchema.optional(),
  deckSource: z.enum(['SYSTEM', 'CUSTOM']),
  deckType: z.string(),
  contentType: contentTypeSchema,
});

export const flashcardDeckSchema = deckSummarySchema.extend({
  description: z.string().nullable(),
  unitSlug: z.string().nullable(),
  sortOrder: z.number().int(),
  itemCount: count,
  isPublished: z.boolean(),
});

const promptSchema = z.object({ scriptMode: scriptModeSchema, value: z.string() });

export const flashcardItemSchema = z
  .object({
    id,
    localization: localizationSchema.optional(),
    itemType: z.enum(['KANJI_CHARACTER', 'HIRAGANA_CHARACTER', 'KATAKANA_CHARACTER', 'VOCABULARY']),
    prompt: promptSchema,
    answerOptions: z.array(promptSchema.extend({ id: z.string().min(1) })).min(2),
  })
  .refine(
    (item) =>
      new Set(item.answerOptions.map((option) => option.id)).size === item.answerOptions.length,
  );

const progressSchema = z.object({
  totalItems: z.number().int().positive(),
  totalAnswered: count,
  correctCount: count,
  incorrectCount: count,
});

export const flashcardSessionSchema = z.object({
  id,
  status: z.enum(['ACTIVE', 'COMPLETED', 'ABANDONED']),
  startedAt: z.iso.datetime({ offset: true }),
  deck: deckSummarySchema,
  sessionConfig: z.object({
    questionScriptMode: scriptModeSchema,
    answerScriptMode: scriptModeSchema,
    isLocked: z.literal(true),
    contentFormat: z.literal('localized').optional(),
    contentLocale: localeSchema.optional(),
  }),
  sessionProgress: progressSchema,
  currentItem: flashcardItemSchema.nullable(),
});

const kanjiDetails = z.object({
  character: z.string(),
  englishMeaning: z.string().optional(),
  meaning: z.string().optional(),
  onyomi: z.array(z.string()),
  kunyomi: z.array(z.string()),
  exampleWords: z.array(z.object({ word: z.string(), kana: z.string(), meaning: z.string() })),
});

const vocabularyDetails = z.object({
  term: z.string(),
  kana: z.string().nullable().optional(),
  englishMeaning: z.string().optional(),
  meaning: z.string().optional(),
});

const feedbackBase = z.object({
  explanationText: z.string().nullable().optional(),
  headline: z.string(),
  bucketMessage: z.string(),
  progressMessage: z.string(),
});

const feedbackSchema = z.discriminatedUnion('variant', [
  feedbackBase.extend({
    variant: z.literal('KANJI_EXPLANATION'),
    kanjiDetails,
    vocabularyDetails: vocabularyDetails.nullable().optional(),
  }),
  feedbackBase.extend({
    variant: z.literal('VOCABULARY_EXPLANATION'),
    vocabularyDetails,
    kanjiDetails: kanjiDetails.nullable().optional(),
  }),
  feedbackBase.extend({
    variant: z.literal('KANA_DEFAULT'),
    kanjiDetails: kanjiDetails.nullable().optional(),
    vocabularyDetails: vocabularyDetails.nullable().optional(),
  }),
]);

const bucket = z.enum(['NEW', 'LEARNING', 'MASTERED']);

export const flashcardAnswerResultSchema = z
  .object({
    localization: localizationSchema.optional(),
    sessionId: id,
    itemId: id,
    selectedOptionId: z.string(),
    correctOptionId: z.string(),
    isCorrect: z.boolean(),
    correctAnswer: promptSchema,
    feedback: feedbackSchema,
    bucketUpdate: z.object({
      previousBucket: bucket,
      currentBucket: bucket,
      consecutiveCorrectCount: count,
      nextDueAt: z.iso.datetime({ offset: true }).nullable(),
    }),
    sessionProgress: progressSchema.extend({ isCompleted: z.boolean() }),
    nextItem: flashcardItemSchema.nullable(),
    progressImpact: z
      .object({
        progressEventId: id,
        skillCode: z.string(),
        masteryScore: z.number().min(0).max(100),
        masteryState: z.string(),
        recommendedDifficultyBand: z.string(),
      })
      .nullable(),
  })
  .refine((result) => {
    const details =
      result.feedback.variant === 'KANJI_EXPLANATION'
        ? result.feedback.kanjiDetails
        : result.feedback.variant === 'VOCABULARY_EXPLANATION'
          ? result.feedback.vocabularyDetails
          : undefined;

    if (!details) return true;

    return result.localization
      ? typeof details.meaning === 'string' && details.englishMeaning === undefined
      : typeof details.englishMeaning === 'string' && details.meaning === undefined;
  })
  .refine(
    (result) =>
      result.sessionProgress.totalAnswered ===
        result.sessionProgress.correctCount + result.sessionProgress.incorrectCount &&
      result.sessionProgress.totalAnswered <= result.sessionProgress.totalItems &&
      result.sessionProgress.isCompleted ===
        (result.sessionProgress.totalAnswered === result.sessionProgress.totalItems) &&
      result.sessionProgress.isCompleted === (result.nextItem === null),
  );

const status = apiStatusSchema.extend({ code: z.literal(120005000) });

export const decksResponseSchema = z.object({
  status,
  metadata: z.object({
    pagination: z.object({
      pageNumber: z.number().int().positive(),
      pageSize: z.number().int().positive(),
      totalRecords: count,
    }),
  }),
  data: z.object({ flashcardDecks: z.array(flashcardDeckSchema) }),
});

export const sessionResponseSchema = z.object({ status, data: flashcardSessionSchema });

export const answerResponseSchema = z.object({ status, data: flashcardAnswerResultSchema });
