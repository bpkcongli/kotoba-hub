import type {
  FlashcardDeck,
  FlashcardSession,
  FlashcardItem,
  FlashcardAnswerResult,
  ScriptMode,
} from '@/frontend/flashcards/interfaces/entities';
import type { StoreError } from '@/frontend/shared/interfaces';
import type { IDisposableStore } from '@/frontend/shared/interfaces/stores';

export interface IFlashcardStore extends IDisposableStore {
  decks: FlashcardDeck[];

  selectedDeckId: string;

  readonly selectedDeck: FlashcardDeck | null;

  questionScriptMode: ScriptMode;

  answerScriptMode: ScriptMode;

  session: FlashcardSession | null;

  currentItem: FlashcardItem | null;

  answerResult: FlashcardAnswerResult | null;

  selectedOptionId: string | null;

  stage: 'setup' | 'question' | 'feedback' | 'completed';

  isLoading: boolean;

  isLoaded: boolean;

  isStarting: boolean;

  isSubmitting: boolean;

  error: StoreError | null;

  errorOperation: 'decks' | 'start' | 'answer' | null;

  accessIssue: 'session' | 'onboarding' | null;

  readonly answerLocked: boolean;

  loadDecks(): Promise<void>;

  selectDeck(id: string): void;

  setQuestionScriptMode(mode: ScriptMode): void;

  setAnswerScriptMode(mode: ScriptMode): void;

  startSession(): Promise<void>;

  selectOption(id: string): void;

  submitAnswer(): Promise<void>;

  continueSession(): void;

  resetSession(): void;
}
