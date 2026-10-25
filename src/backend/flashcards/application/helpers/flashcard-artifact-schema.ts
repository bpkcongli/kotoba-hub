import { z } from 'zod';

const uuid = z.uuid();

const scriptMode = z.enum(['KANJI', 'KANA', 'ROMAJI', 'ENGLISH', 'JAPANESE']);

export const flashcardArtifactSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  deckSource: z.literal('SYSTEM'),
  deckType: z.literal('FOUNDATION'),
  contentType: z.enum(['KANA', 'KANJI', 'VOCABULARY']),
  decks: z.array(
    z.object({
      id: uuid,
      slug: z.string().min(1).max(100),
      trackSlug: z.string(),
      unitSlug: z.string().nullable(),
      lessonSlug: z.string().optional(),
      title: z.string().min(1).max(255),
      description: z.string().nullable(),
      sortOrder: z.number().int().positive(),
      isPublished: z.boolean(),
    }),
  ),
  items: z.array(
    z.object({
      id: uuid,
      skillId: uuid.nullable(),
      skillCode: z.string(),
      trackSlug: z.string(),
      unitSlug: z.string().nullable(),
      lessonSlug: z.string().nullable(),
      itemType: z.enum([
        'KANJI_CHARACTER',
        'HIRAGANA_CHARACTER',
        'KATAKANA_CHARACTER',
        'VOCABULARY',
      ]),
      surfaceFormText: z.string().min(1).max(255),
      kanaDisplayText: z.string().nullable(),
      romajiText: z.string().nullable(),
      englishMeaning: z.string().nullable(),
      mappingStatus: z.enum(['SYLLABUS_MAPPED', 'PENDING_LESSON_MAPPING']),
      answerOptionPayload: z.object({
        schemaVersion: z.literal(1),
        canonicalAnswers: z.partialRecord(scriptMode, z.array(z.string().min(1)).min(1)),
        distractorPoolItemIds: z.array(uuid),
      }),
      explanationText: z.string().nullable(),
      isActive: z.boolean(),
    }),
  ),
  deckItems: z.array(
    z.object({ deckId: uuid, itemId: uuid, sortOrder: z.number().int().positive() }),
  ),
});

export type FlashcardArtifact = z.infer<typeof flashcardArtifactSchema>;
