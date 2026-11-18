import type {
  AnswerResult,
  ContentType,
  DeckFilter,
  FlashcardDeck,
  SessionSnapshot,
  ScriptMode,
} from '@/backend/flashcards/domain/repositories/flashcard.repository';
import type { Locale } from '@/shared/locale';

export interface CreateDeckRequest {
  title: string;
  description?: string | null;
  deckType: string;
  contentType: ContentType;
  unitSlug?: string | null;
  items?: string[];
}

export interface FlashcardRepresentation {
  contentFormat?: 'localized';
  contentLocale?: Locale;
}

export interface CreateSessionRequest extends FlashcardRepresentation {
  deckId: string;
  questionScriptMode: ScriptMode;
  answerScriptMode: ScriptMode;
}

export interface SubmitAnswerRequest {
  itemId: string;
  selectedOptionId: string;
  responseTimeMs?: number | null;
}

export type DeckReadModel = FlashcardDeck & { unitSlug: string | null };

export interface FlashcardService {
  listDecks(
    userId: string,
    filter: Omit<DeckFilter, 'unitId'> & { unitSlug?: string } & FlashcardRepresentation,
  ): Promise<{ items: DeckReadModel[]; totalRecords: number }>;

  createDeck(userId: string, request: CreateDeckRequest): Promise<DeckReadModel>;

  createSession(userId: string, request: CreateSessionRequest): Promise<SessionSnapshot>;

  submitAnswer(
    userId: string,
    sessionId: string,
    request: SubmitAnswerRequest,
  ): Promise<AnswerResult>;
}
