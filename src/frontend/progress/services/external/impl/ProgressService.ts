import type {
  ProgressFeedQuery,
  ProgressTimelineQuery,
} from '@/frontend/progress/interfaces/requests';
import {
  progressOverviewResponseSchema,
  progressSessionsResponseSchema,
  progressTimelineResponseSchema,
} from '@/frontend/progress/interfaces/responses';
import type { IProgressService } from '@/frontend/progress/services/external/IProgressService';
import type { HttpClient } from '@/frontend/shared/adapters/http-client';
import { readHttpResponse } from '@/frontend/shared/adapters/http-client/helpers';

function feedQuery(query: ProgressFeedQuery) {
  return {
    offset: query.offset ?? 0,
    limit: query.limit ?? 10,
    trackSlug: query.trackSlug || undefined,
    sourceTypes: query.sourceTypes?.length ? query.sourceTypes.join(',') : undefined,
  };
}

export class ProgressService implements IProgressService {
  constructor(private readonly http: HttpClient) {}

  async getOverview(trackSlug?: string, signal?: AbortSignal) {
    return readHttpResponse(
      await this.http.request({
        method: 'GET',
        path: '/progress/overview',
        query: { trackSlug: trackSlug || undefined },
        signal,
      }),
      progressOverviewResponseSchema,
    ).data;
  }

  async getSessions(query: ProgressFeedQuery, signal?: AbortSignal) {
    const response = readHttpResponse(
      await this.http.request({
        method: 'GET',
        path: '/progress/sessions',
        query: feedQuery(query),
        signal,
      }),
      progressSessionsResponseSchema,
    );

    return { items: response.data.progressSessions, pagination: response.metadata.pagination };
  }

  async getTimeline(query: ProgressTimelineQuery, signal?: AbortSignal) {
    const response = readHttpResponse(
      await this.http.request({
        method: 'GET',
        path: '/progress/timeline',
        query: {
          ...feedQuery(query),
          skillCodes: query.skillCodes?.length ? query.skillCodes.join(',') : undefined,
        },
        signal,
      }),
      progressTimelineResponseSchema,
    );

    return { items: response.data.progressEvents, pagination: response.metadata.pagination };
  }
}
