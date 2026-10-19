import { InvalidProgressEvent } from '@/backend/progress/domain/exceptions/invalid-progress-event';
import type { ProgressEventSnapshot } from '@/backend/progress/domain/repositories/progress.repository';

export class LearningEvent {
  constructor(readonly snapshot: ProgressEventSnapshot) {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (
      ![snapshot.id, snapshot.userId, snapshot.skillId, snapshot.sourceEntityId].every((id) =>
        uuid.test(id),
      )
    )
      throw new InvalidProgressEvent('Learning event identifiers must be UUIDs.');

    if (!['FLASHCARD', 'PRACTICE', 'LESSON_POST_STUDY'].includes(snapshot.sourceType))
      throw new InvalidProgressEvent('Unsupported progress source type.');

    if (
      snapshot.sourceType === 'LESSON_POST_STUDY'
        ? snapshot.sourceSessionId !== null
        : !snapshot.sourceSessionId || !uuid.test(snapshot.sourceSessionId)
    )
      throw new InvalidProgressEvent('Learning event session does not match its source type.');

    if (
      !Number.isFinite(snapshot.numericScore) ||
      snapshot.numericScore < 0 ||
      snapshot.numericScore > 100
    )
      throw new InvalidProgressEvent('Learning event score must be between 0 and 100.');

    if (
      snapshot.confidenceWeight !== null &&
      (!Number.isFinite(snapshot.confidenceWeight) ||
        snapshot.confidenceWeight < 0 ||
        snapshot.confidenceWeight > 1)
    )
      throw new InvalidProgressEvent('Confidence weight must be between 0 and 1.');

    if (
      snapshot.responseTimeMs !== null &&
      (!Number.isInteger(snapshot.responseTimeMs) ||
        snapshot.responseTimeMs < 0 ||
        snapshot.responseTimeMs > 2147483647)
    )
      throw new InvalidProgressEvent('Response time must be a nonnegative database integer.');

    if (
      typeof snapshot.isCorrect !== 'boolean' ||
      !snapshot.questionType ||
      snapshot.questionType.length > 50 ||
      !Number.isFinite(Date.parse(snapshot.answeredAt))
    )
      throw new InvalidProgressEvent('Learning event outcome, type or timestamp is invalid.');

    if (
      snapshot.sourceType !== 'FLASHCARD' &&
      !['SHORT_FREE_RESPONSE', 'SLOT_FILL', 'ARRANGE_TOKEN', 'FREE_RESPONSE'].includes(
        snapshot.questionType,
      )
    )
      throw new InvalidProgressEvent('Unsupported practice question type.');
  }
}
