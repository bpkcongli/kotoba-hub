import type { ScriptMode } from '@/frontend/flashcards/interfaces/entities';
import type { Locale } from '@/shared/locale';

export interface CreateFlashcardSessionRequest {
  contentFormat?: 'localized';
  contentLocale?: Locale;
  deckId: string;
  questionScriptMode: ScriptMode;
  answerScriptMode: ScriptMode;
}

export interface FlashcardAnswerRequest {
  itemId: string;
  selectedOptionId: string;
  responseTimeMs: number | null;
}
