import { z } from 'zod';
import type { HttpClient } from '@/frontend/shared/adapters/http-client';
import { readHttpResponse } from '@/frontend/shared/adapters/http-client/helpers';
import { apiStatusSchema } from '@/frontend/shared/interfaces/responses';
import type { ILocaleService } from '@/frontend/shared/services/external/ILocaleService';
import { localeSchema, type UserPreferences } from '@/shared/locale';

const response = z.object({
  status: apiStatusSchema.extend({ code: z.literal(120002000) }),
  data: z.object({ contentLocale: localeSchema, uiLocale: localeSchema }),
});

export class LocaleService implements ILocaleService {
  constructor(private readonly http: HttpClient) {}

  async get(signal?: AbortSignal) {
    return readHttpResponse(
      await this.http.request({ method: 'GET', path: '/user-profile/preferences', signal }),
      response,
    ).data;
  }

  async patch(value: Partial<UserPreferences>, signal?: AbortSignal) {
    return readHttpResponse(
      await this.http.request({
        method: 'PATCH',
        path: '/user-profile/preferences',
        body: value,
        signal,
      }),
      response,
    ).data;
  }
}
