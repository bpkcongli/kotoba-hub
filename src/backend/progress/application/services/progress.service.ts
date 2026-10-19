import type { RecordLearningEventRequest } from '@/backend/progress/application/services/requests/record-learning-event.request';
import type {
  ProgressOverview,
  ProgressPage,
  ProgressSessionFeedItem,
  ProgressTimelineItem,
  RecordLearningEventResponse,
} from '@/backend/progress/application/services/responses/progress.response';
import type {
  LessonUnderstandingSnapshot,
  ProgressSourceType,
} from '@/backend/progress/domain/repositories/progress.repository';

export interface ProgressFilter {
  trackSlug?: string;
}

export interface ProgressPageFilter extends ProgressFilter {
  offset: number;
  limit: number;
  sourceTypes?: ProgressSourceType[];
  skillCodes?: string[];
}

export interface ProgressService {
  recordLearningEvent(request: RecordLearningEventRequest): Promise<RecordLearningEventResponse>;

  getOverview(userId: string, filter?: ProgressFilter): Promise<ProgressOverview>;

  getTimeline(
    userId: string,
    filter: ProgressPageFilter,
  ): Promise<ProgressPage<ProgressTimelineItem>>;

  getSessions(
    userId: string,
    filter: ProgressPageFilter,
  ): Promise<ProgressPage<ProgressSessionFeedItem>>;

  getLessonUnderstanding(
    userId: string,
    lessonId: string,
  ): Promise<LessonUnderstandingSnapshot | null>;
}
