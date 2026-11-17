import type { HttpClient } from '@/frontend/shared/adapters/http-client';
import { readHttpResponse } from '@/frontend/shared/adapters/http-client/helpers';
import { ClientException } from '@/frontend/shared/exceptions';
import { validateLocalizedContent } from '@/frontend/shared/helpers';
import type { ILocaleStore } from '@/frontend/shared/services/internal';
import type { SyllabusTrack } from '@/frontend/syllabus/interfaces/entities';
import {
  tracksResponseSchema,
  unitResponseSchema,
  lessonResponseSchema,
  nextQuizResponseSchema,
} from '@/frontend/syllabus/interfaces/responses';
import type { ISyllabusService } from '@/frontend/syllabus/services/external/ISyllabusService';

export class SyllabusService implements ISyllabusService {
  constructor(
    private readonly http: HttpClient,
    private readonly locale?: ILocaleStore,
  ) {}

  async getTracks(signal?: AbortSignal) {
    const query = this.locale?.contentQuery;
    const tracks: SyllabusTrack[] = [];
    let total = 0;

    do {
      const response = readHttpResponse(
        await this.http.request({
          method: 'GET',
          path: '/syllabus',
          query: {
            includeUnits: true,
            offset: tracks.length,
            limit: 100,
            ...query,
          },
          signal,
        }),
        tracksResponseSchema,
      );

      validateLocalizedContent(response.data.tracks, query?.contentLocale);

      total = response.metadata.pagination.totalRecords;

      if (!response.data.tracks.length && tracks.length < total)
        throw new ClientException(
          'contract',
          'The syllabus response could not be read. Please try again.',
        );

      tracks.push(...response.data.tracks);
    } while (tracks.length < total);

    return tracks
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((t) => ({ ...t, units: [...t.units].sort((a, b) => a.sortOrder - b.sortOrder) }));
  }

  async getUnit(slug: string, signal?: AbortSignal) {
    const query = this.locale?.contentQuery;
    const data = readHttpResponse(
      await this.http.request({
        method: 'GET',
        path: `/syllabus/units/${encodeURIComponent(slug)}`,
        query,
        signal,
      }),
      unitResponseSchema,
    ).data;

    validateLocalizedContent(data, query?.contentLocale);

    return data;
  }

  async getLesson(slug: string, signal?: AbortSignal) {
    const query = this.locale?.contentQuery;
    const data = readHttpResponse(
      await this.http.request({
        method: 'GET',
        path: `/syllabus/lessons/${encodeURIComponent(slug)}`,
        query,
        signal,
      }),
      lessonResponseSchema,
    ).data;

    validateLocalizedContent(data, query?.contentLocale);

    return data;
  }

  async getNextQuiz(slug: string, signal?: AbortSignal) {
    const query = this.locale?.contentQuery;
    const data = readHttpResponse(
      await this.http.request({
        method: 'POST',
        path: '/practice/lesson-post-study/next',
        body: { lessonSlug: slug, ...query },
        signal,
      }),
      nextQuizResponseSchema,
    ).data;

    validateLocalizedContent(data.question, query?.contentLocale);

    if (query?.contentFormat && (!data.deliveryId || !data.expiresAt))
      throw new ClientException(
        'contract',
        'The lesson delivery could not be read. Please try again.',
      );

    if (data.lessonSlug !== slug)
      throw new ClientException(
        'contract',
        'The lesson quiz response could not be read. Please try again.',
      );

    return data;
  }
}
