import type {
  ProgressImpact,
  StoredAnswer,
} from '@/backend/flashcards/domain/repositories/flashcard.repository';

export interface FlashcardProgressPort {
  recordAnswer(userId: string, answer: StoredAnswer, skillCode: string): Promise<ProgressImpact>;
}
