import type { ScriptMode } from '@/frontend/flashcards/interfaces/entities';

export interface CreateFlashcardSessionRequest {
  deckId: string;
  questionScriptMode: ScriptMode;
  answerScriptMode: ScriptMode;
}

export interface FlashcardAnswerRequest {
  itemId: string;
  selectedOptionId: string;
  responseTimeMs: number | null;
}
