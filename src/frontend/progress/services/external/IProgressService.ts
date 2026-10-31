import type {
  ProgressOverview,
  ProgressSession,
  ProgressEvent,
  ProgressPagination,
} from '@/frontend/progress/interfaces/entities';
import type {
  ProgressFeedQuery,
  ProgressTimelineQuery,
} from '@/frontend/progress/interfaces/requests';

export interface IProgressService {
  getOverview(trackSlug?: string, signal?: AbortSignal): Promise<ProgressOverview>;

  getSessions(
    query: ProgressFeedQuery,
    signal?: AbortSignal,
  ): Promise<{
    items: ProgressSession[];
    pagination: ProgressPagination;
  }>;

  getTimeline(
    query: ProgressTimelineQuery,
    signal?: AbortSignal,
  ): Promise<{
    items: ProgressEvent[];
    pagination: ProgressPagination;
  }>;
}
