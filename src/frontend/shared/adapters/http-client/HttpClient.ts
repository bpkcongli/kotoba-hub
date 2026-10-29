export interface HttpRequest<TBody = unknown> {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  query?: Readonly<Record<string, string | number | boolean | undefined>>;
  body?: TBody;
  headers?: Readonly<Record<string, string>>;
  signal?: AbortSignal;
}

export interface HttpResponse {
  httpStatus: number;
  body: unknown;
}

export interface HttpClient {
  request<TBody = unknown>(request: HttpRequest<TBody>): Promise<HttpResponse>;
}
