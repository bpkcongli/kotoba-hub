import type { HttpClient } from '@/frontend/shared/adapters/http-client';
import { readHttpResponse } from '@/frontend/shared/adapters/http-client/helpers';
import { ClientException } from '@/frontend/shared/exceptions';
import type { SyllabusTrack } from '@/frontend/syllabus/interfaces/entities';
import {
  tracksResponseSchema,
  unitResponseSchema,
  lessonResponseSchema,
  nextQuizResponseSchema,
} from '@/frontend/syllabus/interfaces/responses';
import type { ISyllabusService } from '@/frontend/syllabus/services/external/ISyllabusService';

export class SyllabusService implements ISyllabusService {
  constructor(private readonly http: HttpClient) {}

  async getTracks(signal?: AbortSignal) {
    const tracks: SyllabusTrack[] = [];
    let total = 0;

    do {
      const response = readHttpResponse(
        await this.http.request({
          method: 'GET',
          path: '/syllabus',
          query: { includeUnits: true, offset: tracks.length, limit: 100 },
          signal,
        }),
        tracksResponseSchema,
      );

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
    return readHttpResponse(
      await this.http.request({
        method: 'GET',
        path: `/syllabus/units/${encodeURIComponent(slug)}`,
        signal,
      }),
      unitResponseSchema,
    ).data;
  }

  async getLesson(slug: string, signal?: AbortSignal) {
    return readHttpResponse(
      await this.http.request({
        method: 'GET',
        path: `/syllabus/lessons/${encodeURIComponent(slug)}`,
        signal,
      }),
      lessonResponseSchema,
    ).data;
  }

  async getNextQuiz(slug: string, signal?: AbortSignal) {
    const data = readHttpResponse(
      await this.http.request({
        method: 'POST',
        path: '/practice/lesson-post-study/next',
        body: { lessonSlug: slug },
        signal,
      }),
      nextQuizResponseSchema,
    ).data;

    if (data.lessonSlug !== slug)
      throw new ClientException(
        'contract',
        'The lesson quiz response could not be read. Please try again.',
      );

    return data;
  }
}
