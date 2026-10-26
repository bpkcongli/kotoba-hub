import type { RecordLearningEventRequest } from '@/backend/progress/application/services/requests/record-learning-event.request';
import type { RecordLearningEventResponse } from '@/backend/progress/application/services/responses/progress.response';

export interface PracticeProgressPort {
  getUnderstanding(userId: string, lessonId: string): Promise<number>;

  recordEvent(request: RecordLearningEventRequest): Promise<RecordLearningEventResponse>;
}
