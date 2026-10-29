import type { z } from 'zod';
import type {
  flashcardDeckSchema,
  flashcardItemSchema,
  flashcardSessionSchema,
  flashcardAnswerResultSchema,
  scriptModeSchema,
  contentTypeSchema,
} from '@/frontend/flashcards/interfaces/responses';

export type FlashcardDeck = z.infer<typeof flashcardDeckSchema>;

export type FlashcardItem = z.infer<typeof flashcardItemSchema>;

export type FlashcardSession = z.infer<typeof flashcardSessionSchema>;

export type FlashcardAnswerResult = z.infer<typeof flashcardAnswerResultSchema>;

export type ScriptMode = z.infer<typeof scriptModeSchema>;

export type ContentType = z.infer<typeof contentTypeSchema>;
