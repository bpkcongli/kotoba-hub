import axios, { type AxiosInstance } from 'axios';
import { normalizeHttpError } from '@/frontend/shared/adapters/http-client/helpers';
import type {
  HttpClient,
  HttpRequest,
  HttpResponse,
} from '@/frontend/shared/adapters/http-client/HttpClient';
import { ClientException } from '@/frontend/shared/exceptions';
import type { FrontendContainerOptions } from '@/frontend/shared/interfaces';

export class AxiosHttpClient implements HttpClient {
  private readonly client: AxiosInstance;

  constructor(options: Pick<FrontendContainerOptions, 'apiBasePath' | 'requestTimeoutMs'>) {
    if (!Number.isFinite(options.requestTimeoutMs) || options.requestTimeoutMs <= 0) {
      throw new ClientException('unexpected', 'Request configuration is invalid.');
    }

    this.client = axios.create({
      baseURL: options.apiBasePath,
      timeout: options.requestTimeoutMs,
      withCredentials: true,
      headers: { Accept: 'application/json' },
    });
  }

  async request<TBody = unknown>(request: HttpRequest<TBody>): Promise<HttpResponse> {
    if (!request.path.startsWith('/') || request.path.startsWith('//')) {
      throw new ClientException('unexpected', 'Request configuration is invalid.');
    }

    try {
      const response = await this.client.request<unknown>({
        url: request.path,
        method: request.method,
        params: request.query,
        data: request.body,
        headers: request.headers,
        signal: request.signal,
      });

      return { httpStatus: response.status, body: response.data };
    } catch (error: unknown) {
      throw normalizeHttpError(error);
    }
  }
}
