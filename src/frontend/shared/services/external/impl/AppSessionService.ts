import type { HttpClient } from '@/frontend/shared/adapters/http-client';
import { readHttpResponse } from '@/frontend/shared/adapters/http-client/helpers';
import type { AppSession } from '@/frontend/shared/interfaces/entities';
import {
  appSessionResponseSchema,
  signOutResponseSchema,
} from '@/frontend/shared/interfaces/responses';
import type { IAppSessionService } from '@/frontend/shared/services/external/IAppSessionService';

export class AppSessionService implements IAppSessionService {
  constructor(private readonly http: HttpClient) {}

  async getSession(signal?: AbortSignal): Promise<AppSession> {
    return readHttpResponse(
      await this.http.request({ method: 'GET', path: '/auth/session', signal }),
      appSessionResponseSchema,
    ).data;
  }

  async signOut(signal?: AbortSignal): Promise<void> {
    readHttpResponse(
      await this.http.request({ method: 'POST', path: '/auth/sign-out', signal }),
      signOutResponseSchema,
    );
  }
}
