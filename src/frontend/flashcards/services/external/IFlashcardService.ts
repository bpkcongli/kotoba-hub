import type {
  FlashcardDeck,
  FlashcardSession,
  FlashcardAnswerResult,
} from '@/frontend/flashcards/interfaces/entities';
import type {
  CreateFlashcardSessionRequest,
  FlashcardAnswerRequest,
} from '@/frontend/flashcards/interfaces/requests';
import type { Locale } from '@/shared/locale';

export interface IFlashcardService {
  getDecks(signal?: AbortSignal, contentLocale?: Locale): Promise<FlashcardDeck[]>;

  createSession(
    request: CreateFlashcardSessionRequest,
    signal?: AbortSignal,
  ): Promise<FlashcardSession>;

  submitAnswer(
    sessionId: string,
    request: FlashcardAnswerRequest,
    signal?: AbortSignal,
  ): Promise<FlashcardAnswerResult>;
}
