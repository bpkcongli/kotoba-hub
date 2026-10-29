import type { HttpClient, HttpResponse } from '@/frontend/shared/adapters/http-client';
import { ClientException } from '@/frontend/shared/exceptions';
import type { AppSession } from '@/frontend/shared/interfaces/entities';
import {
  appSessionResponseSchema,
  signOutResponseSchema,
} from '@/frontend/shared/interfaces/responses';
import type { IAppSessionService } from '@/frontend/shared/services/external/IAppSessionService';

function requireSuccess(response: HttpResponse): void {
  if (response.httpStatus !== 200) {
    throw new ClientException('contract', 'The response could not be read. Please try again.');
  }
}

export class AppSessionService implements IAppSessionService {
  constructor(private readonly http: HttpClient) {}

  async getSession(signal?: AbortSignal): Promise<AppSession> {
    const response = await this.http.request({ method: 'GET', path: '/auth/session', signal });

    requireSuccess(response);

    const parsed = appSessionResponseSchema.safeParse(response.body);
    if (!parsed.success) {
      throw new ClientException('contract', 'The response could not be read. Please try again.');
    }

    return parsed.data.data;
  }

  async signOut(signal?: AbortSignal): Promise<void> {
    const response = await this.http.request({ method: 'POST', path: '/auth/sign-out', signal });

    requireSuccess(response);

    if (!signOutResponseSchema.safeParse(response.body).success) {
      throw new ClientException('contract', 'The response could not be read. Please try again.');
    }
  }
}
