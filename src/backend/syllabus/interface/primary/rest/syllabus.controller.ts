import { randomUUID } from 'node:crypto';
import type { AuthorizationService } from '@/backend/auth/application/services/authorization.service';
import { authorizationService, getSessionSnapshot } from '@/backend/auth/infrastructure/di';
import { ApplicationStatusCode } from '@/backend/shared/interface/primary/rest/api-status';
import { queryValue } from '@/backend/shared/interface/primary/rest/query-value';
import { apiResponse } from '@/backend/shared/interface/primary/rest/response';
import type { ContentLocalePort } from '@/backend/syllabus/application/ports/content-locale.port';
import type { SyllabusCatalogService } from '@/backend/syllabus/application/services/syllabus-catalog.service';
import { contentLocaleAdapter } from '@/backend/syllabus/infrastructure/di';
import { syllabusCatalogService } from '@/backend/syllabus/infrastructure/di';
import { resolveLocale, type Locale } from '@/shared/locale';
import {
  getLessonRequestSchema,
  getUnitRequestSchema,
  listTracksRequestSchema,
} from './dto/syllabus.request.dto';
import { toLessonDto, toTrackSummaryDto, toUnitDto } from './dto/syllabus.response.dto';

export class SyllabusController {
  constructor(
    private readonly catalog: SyllabusCatalogService,
    private readonly authorization: AuthorizationService,
    private readonly preferences: ContentLocalePort = contentLocaleAdapter,
  ) {}

  private async locale(query: { contentFormat?: string; contentLocale?: Locale }, userId: string) {
    return query.contentFormat
      ? resolveLocale(query.contentLocale ?? (await this.preferences.getContentLocale(userId)))
      : undefined;
  }

  async listTracks(request: Request): Promise<Response> {
    try {
      const session = await getSessionSnapshot(request.headers.get('cookie'));

      if (this.authorization.authorize(session, 'AUTHENTICATED')) {
        return apiResponse(ApplicationStatusCode.SYLLABUS_UNAUTHORIZED);
      }

      const url = new URL(request.url);
      const parsed = listTracksRequestSchema.safeParse({
        contentFormat: queryValue(url, 'contentFormat'),
        contentLocale: queryValue(url, 'contentLocale'),
        offset: queryValue(url, 'offset'),
        limit: queryValue(url, 'limit'),
        curriculumLevels: queryValue(url, 'curriculumLevels'),
        includeUnits: queryValue(url, 'includeUnits'),
      });

      if (!parsed.success) return invalidQuery(parsed.error.issues);

      const { offset, limit, curriculumLevels, includeUnits } = parsed.data;
      const filter = curriculumLevels ? new Set(curriculumLevels.split(',')) : null;
      const locale = parsed.data.contentFormat
        ? resolveLocale(
            parsed.data.contentLocale ??
              (await this.preferences.getContentLocale(session.user!.id)),
          )
        : undefined;
      const publishedTracks = await this.catalog.getPublishedTracks(locale);

      if (
        filter &&
        [...filter].some(
          (level) => !publishedTracks.some((track) => track.curriculumLevel === level),
        )
      ) {
        return apiResponse(ApplicationStatusCode.SYLLABUS_INVALID_FILTER, undefined, [
          {
            field: 'curriculumLevels',
            message: 'curriculumLevels must use comma-separated published levels.',
          },
        ]);
      }

      const tracks = publishedTracks.filter(
        (track) => !filter || filter.has(track.curriculumLevel),
      );
      const data = {
        tracks: tracks
          .slice(offset, offset + limit)
          .map((track) => toTrackSummaryDto(track, this.catalog, includeUnits)),
      };

      return Response.json(
        {
          status: {
            traceId: randomUUID(),
            code: ApplicationStatusCode.SYLLABUS_SUCCESS,
            message: 'Success!',
            errorDetails: [],
          },
          metadata: {
            pagination: {
              pageNumber: Math.floor(offset / limit) + 1,
              pageSize: limit,
              totalRecords: tracks.length,
            },
          },
          data,
        },
        { headers: { 'Cache-Control': 'private, no-store' } },
      );
    } catch (error) {
      console.error('Syllabus track read failed', error);

      return apiResponse(ApplicationStatusCode.UNHANDLED_SYLLABUS_EXCEPTION);
    }
  }

  async getUnit(request: Request, unitSlug: string): Promise<Response> {
    try {
      const session = await getSessionSnapshot(request.headers.get('cookie'));
      const denied = this.authorization.authorize(session, 'APP_READY');

      if (denied)
        return apiResponse(
          denied === 'UNAUTHENTICATED'
            ? ApplicationStatusCode.SYLLABUS_UNAUTHORIZED
            : ApplicationStatusCode.SYLLABUS_ONBOARDING_REQUIRED,
        );

      const url = new URL(request.url);
      const parsed = getUnitRequestSchema.safeParse({
        contentFormat: queryValue(url, 'contentFormat'),
        contentLocale: queryValue(url, 'contentLocale'),
        unitSlug,
        includeLessons: queryValue(url, 'includeLessons'),
        includeSkills: queryValue(url, 'includeSkills'),
      });

      if (!parsed.success) return invalidQuery(parsed.error.issues);

      const result = await this.catalog.getPublishedUnit(
        parsed.data.unitSlug,
        await this.locale(parsed.data, session.user!.id),
      );

      if (!result) return apiResponse(ApplicationStatusCode.SYLLABUS_UNIT_NOT_FOUND);

      return apiResponse(
        ApplicationStatusCode.SYLLABUS_SUCCESS,
        toUnitDto(result, this.catalog, parsed.data.includeLessons, parsed.data.includeSkills),
      );
    } catch (error) {
      console.error('Syllabus unit read failed', error);

      return apiResponse(ApplicationStatusCode.UNHANDLED_SYLLABUS_EXCEPTION);
    }
  }

  async getLesson(request: Request, lessonSlug: string): Promise<Response> {
    try {
      const session = await getSessionSnapshot(request.headers.get('cookie'));
      const denied = this.authorization.authorize(session, 'APP_READY');

      if (denied)
        return apiResponse(
          denied === 'UNAUTHENTICATED'
            ? ApplicationStatusCode.SYLLABUS_UNAUTHORIZED
            : ApplicationStatusCode.SYLLABUS_ONBOARDING_REQUIRED,
        );

      const url = new URL(request.url);
      const parsed = getLessonRequestSchema.safeParse({
        contentFormat: queryValue(url, 'contentFormat'),
        contentLocale: queryValue(url, 'contentLocale'),
        lessonSlug,
        includeContentBlocks: queryValue(url, 'includeContentBlocks'),
        includeSkills: queryValue(url, 'includeSkills'),
      });

      if (!parsed.success) return invalidQuery(parsed.error.issues);

      const result = await this.catalog.getPublishedLesson(
        parsed.data.lessonSlug,
        await this.locale(parsed.data, session.user!.id),
      );

      if (!result) return apiResponse(ApplicationStatusCode.SYLLABUS_LESSON_NOT_FOUND);

      this.catalog.assertPostStudyBank(result.lesson);

      return apiResponse(
        ApplicationStatusCode.SYLLABUS_SUCCESS,
        toLessonDto(
          result,
          this.catalog,
          parsed.data.includeContentBlocks,
          parsed.data.includeSkills,
        ),
      );
    } catch (error) {
      console.error('Syllabus lesson read failed', error);

      return apiResponse(ApplicationStatusCode.UNHANDLED_SYLLABUS_EXCEPTION);
    }
  }
}

function invalidQuery(issues: { path: PropertyKey[]; message: string }[]): Response {
  return apiResponse(
    ApplicationStatusCode.SYLLABUS_INVALID_FILTER,
    undefined,
    issues.map((issue) => ({ field: String(issue.path[0] ?? 'query'), message: issue.message })),
  );
}

export const syllabusController = new SyllabusController(
  syllabusCatalogService,
  authorizationService,
);
