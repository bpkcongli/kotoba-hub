import type { PracticeProgressPort } from '@/backend/practice/application/ports/practice-progress.port';
import { PracticeError } from '@/backend/practice/domain/exceptions/practice-error';
import type { ProgressService } from '@/backend/progress/application/services/progress.service';
import type { RecordLearningEventRequest } from '@/backend/progress/application/services/requests/record-learning-event.request';
import { InvalidProgressEvent } from '@/backend/progress/domain/exceptions/invalid-progress-event';

export class PracticeProgressAdapter implements PracticeProgressPort {
  constructor(private readonly progress: ProgressService) {}

  async getUnderstanding(userId: string, lessonId: string) {
    return (
      (await this.progress.getLessonUnderstanding(userId, lessonId))?.currentUnderstandingLevel ?? 0
    );
  }

  async recordEvent(request: RecordLearningEventRequest) {
    try {
      return await this.progress.recordLearningEvent(request);
    } catch (error) {
      if (error instanceof InvalidProgressEvent)
        throw new PracticeError(142206002, error.message, 'questionId');

      throw error;
    }
  }
}
