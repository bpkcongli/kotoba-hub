import type { SyllabusTrack } from '@/frontend/onboarding/interfaces/entities';
import type {
  AssessmentRequest,
  ConfirmAssessmentRequest,
} from '@/frontend/onboarding/interfaces/requests';
import {
  assessmentResponseSchema,
  confirmationResponseSchema,
  syllabusTracksResponseSchema,
  userProfileResponseSchema,
} from '@/frontend/onboarding/interfaces/responses';
import type { IOnboardingService } from '@/frontend/onboarding/services/external/IOnboardingService';
import type { HttpClient } from '@/frontend/shared/adapters/http-client';
import { readHttpResponse } from '@/frontend/shared/adapters/http-client/helpers';
import { ClientException } from '@/frontend/shared/exceptions';

export class OnboardingService implements IOnboardingService {
  constructor(private readonly http: HttpClient) {}

  async getProfile(signal?: AbortSignal) {
    return readHttpResponse(
      await this.http.request({ method: 'GET', path: '/user-profile/me', signal }),
      userProfileResponseSchema,
    ).data;
  }

  async getTracks(signal?: AbortSignal): Promise<SyllabusTrack[]> {
    const tracks: SyllabusTrack[] = [];
    let total = 0;

    do {
      const response = readHttpResponse(
        await this.http.request({
          method: 'GET',
          path: '/syllabus',
          query: { offset: tracks.length, limit: 100 },
          signal,
        }),
        syllabusTracksResponseSchema,
      );

      total = response.metadata.pagination.totalRecords;

      if (response.data.tracks.length === 0 && tracks.length < total) {
        throw new ClientException(
          'contract',
          'The syllabus response could not be read. Please try again.',
        );
      }

      tracks.push(...response.data.tracks);
    } while (tracks.length < total);

    return tracks.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async assess(body: AssessmentRequest, signal?: AbortSignal) {
    return readHttpResponse(
      await this.http.request({
        method: 'POST',
        path: '/personalization/assessment',
        body,
        signal,
      }),
      assessmentResponseSchema,
    ).data;
  }

  async confirm(body: ConfirmAssessmentRequest, signal?: AbortSignal) {
    return readHttpResponse(
      await this.http.request({
        method: 'POST',
        path: '/personalization/assessment/confirm',
        body,
        signal,
      }),
      confirmationResponseSchema,
    ).data;
  }
}
