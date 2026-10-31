import type { ProgressSourceType } from '@/frontend/progress/interfaces/entities';

export interface ProgressFeedQuery {
  offset?: number;
  limit?: number;
  trackSlug?: string;
  sourceTypes?: ProgressSourceType[];
}

export interface ProgressTimelineQuery extends ProgressFeedQuery {
  skillCodes?: string[];
}
