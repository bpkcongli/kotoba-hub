import { randomUUID } from 'node:crypto';
import type { AuthorizationService } from '@/backend/auth/application/services/authorization.service';
import { authorizationService, getSessionSnapshot } from '@/backend/auth/infrastructure/di';
import type { ProgressService } from '@/backend/progress/application/services/progress.service';
import { progressService } from '@/backend/progress/infrastructure/di';
import { ApplicationStatusCode } from '@/backend/shared/interface/primary/rest/api-status';
import { apiResponse } from '@/backend/shared/interface/primary/rest/response';
import {
  progressOverviewRequestSchema,
  progressQueryValue,
  progressSessionsRequestSchema,
  progressTimelineRequestSchema,
} from './dto/progress.request.dto';
import {
  toProgressOverviewDto,
  toProgressSessionDto,
  toProgressTimelineDto,
  type ProgressSessionsResponseDto,
  type ProgressTimelineResponseDto,
} from './dto/progress.response.dto';

export class ProgressController {
  constructor(
    private readonly progress: ProgressService,
    private readonly authorization: AuthorizationService,
  ) {}

  getOverview(request: Request): Promise<Response> {
    return this.read(request, 'overview');
  }

  getTimeline(request: Request): Promise<Response> {
    return this.read(request, 'timeline');
  }

  getSessions(request: Request): Promise<Response> {
    return this.read(request, 'sessions');
  }

  private async read(
    request: Request,
    kind: 'overview' | 'timeline' | 'sessions',
  ): Promise<Response> {
    try {
      const session = await getSessionSnapshot(request.headers.get('cookie'));
      const denied = this.authorization.authorize(session, 'APP_READY');
      if (denied || !session.user) {
        return apiResponse(
          denied === 'ONBOARDING_REQUIRED'
            ? ApplicationStatusCode.PROGRESS_ONBOARDING_REQUIRED
            : ApplicationStatusCode.PROGRESS_UNAUTHORIZED,
        );
      }

      const url = new URL(request.url);
      const trackSlug = progressQueryValue(url, 'trackSlug');
      if (kind === 'overview') {
        const parsed = progressOverviewRequestSchema.safeParse({ trackSlug });
        if (!parsed.success) return invalidQuery(parsed.error.issues);

        return apiResponse(
          ApplicationStatusCode.PROGRESS_SUCCESS,
          toProgressOverviewDto(await this.progress.getOverview(session.user.id, parsed.data)),
        );
      }

      const query = {
        trackSlug,
        offset: progressQueryValue(url, 'offset'),
        limit: progressQueryValue(url, 'limit'),
        sourceTypes: progressQueryValue(url, 'sourceTypes'),
      };
      if (kind === 'timeline') {
        const parsed = progressTimelineRequestSchema.safeParse({
          ...query,
          skillCodes: progressQueryValue(url, 'skillCodes'),
        });
        if (!parsed.success) return invalidQuery(parsed.error.issues);

        const result = await this.progress.getTimeline(session.user.id, parsed.data);
        const data: ProgressTimelineResponseDto = {
          progressEvents: result.items.map(toProgressTimelineDto),
        };

        return paginated(data, parsed.data, result.totalRecords);
      }

      const parsed = progressSessionsRequestSchema.safeParse(query);
      if (!parsed.success) return invalidQuery(parsed.error.issues);

      const result = await this.progress.getSessions(session.user.id, parsed.data);
      const data: ProgressSessionsResponseDto = {
        progressSessions: result.items.map(toProgressSessionDto),
      };

      return paginated(data, parsed.data, result.totalRecords);
    } catch (error) {
      console.error('Progress read failed', error);
      return apiResponse(ApplicationStatusCode.UNHANDLED_PROGRESS_EXCEPTION);
    }
  }
}

function invalidQuery(issues: { path: PropertyKey[]; message: string }[]): Response {
  return apiResponse(
    ApplicationStatusCode.PROGRESS_VALIDATION_ERROR,
    undefined,
    issues.map((issue) => ({ field: String(issue.path[0] ?? 'query'), message: issue.message })),
  );
}

function paginated<T>(
  data: T,
  query: { offset: number; limit: number },
  totalRecords: number,
): Response {
  return Response.json({
    status: {
      traceId: randomUUID(),
      code: ApplicationStatusCode.PROGRESS_SUCCESS,
      message: 'Success!',
      errorDetails: [],
    },
    metadata: {
      pagination: {
        pageNumber: Math.floor(query.offset / query.limit) + 1,
        pageSize: query.limit,
        totalRecords,
      },
    },
    data,
  });
}

export const progressController = new ProgressController(progressService, authorizationService);
