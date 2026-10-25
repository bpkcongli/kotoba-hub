import { FlashcardError } from '@/backend/flashcards/domain/exceptions/flashcard-error';
import type {
  SessionSnapshot,
  TurnSnapshot,
} from '@/backend/flashcards/domain/repositories/flashcard.repository';

export class FlashcardSession {
  constructor(readonly snapshot: SessionSnapshot) {
    if (
      snapshot.turns.length === 0 ||
      new Set(snapshot.turns.map((turn) => turn.id)).size !== snapshot.turns.length ||
      snapshot.totalAnswered < 0 ||
      snapshot.totalAnswered > snapshot.turns.length ||
      snapshot.correctCount + snapshot.incorrectCount !== snapshot.totalAnswered
    ) {
      throw new FlashcardError(142205001, 'Flashcard session state is inconsistent.');
    }
  }

  currentTurn(itemId: string, selectedOptionId: string): TurnSnapshot {
    const turn = this.snapshot.turns[this.snapshot.totalAnswered];
    if (!turn || this.snapshot.status !== 'ACTIVE' || turn.id !== itemId) {
      throw new FlashcardError(
        142205005,
        'itemId does not match the current session item.',
        'itemId',
      );
    }
    if (!turn.answerOptions.some((option) => option.id === selectedOptionId)) {
      throw new FlashcardError(
        142205006,
        'selectedOptionId is not part of the current item options.',
        'selectedOptionId',
      );
    }

    return turn;
  }

  recordOutcome(isCorrect: boolean, answeredAt: Date): void {
    this.snapshot.totalAnswered++;
    this.snapshot.correctCount += Number(isCorrect);
    this.snapshot.incorrectCount += Number(!isCorrect);
    if (this.snapshot.totalAnswered === this.snapshot.turns.length) {
      this.snapshot.status = 'COMPLETED';
      this.snapshot.completedAt = answeredAt.toISOString();
    }
  }
}
