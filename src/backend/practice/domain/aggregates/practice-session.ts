import { PracticeError } from '@/backend/practice/domain/exceptions/practice-error';
import type { PracticeSession } from '@/backend/practice/domain/repositories/practice.repository';

export class PracticeSessionAggregate {
  constructor(readonly snapshot: PracticeSession) {}

  currentQuestion(questionId: string) {
    const question = this.snapshot.questions[this.snapshot.answeredQuestionsCount];

    if (
      this.snapshot.status === 'EXPIRED' ||
      this.snapshot.status === 'COMPLETED' ||
      question?.id !== questionId
    )
      throw new PracticeError(
        142206002,
        'Question is not the active session question.',
        'questionId',
      );

    return question;
  }

  recordAnswer(at: string) {
    this.snapshot.answeredQuestionsCount++;
    this.snapshot.status =
      this.snapshot.answeredQuestionsCount === this.snapshot.questions.length
        ? 'COMPLETED'
        : 'IN_PROGRESS';

    if (this.snapshot.status === 'COMPLETED') this.snapshot.completedAt = at;
  }
}
