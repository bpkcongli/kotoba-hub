import type { z } from 'zod';
import type { HttpResponse } from '@/frontend/shared/adapters/http-client/HttpClient';
import { ClientException } from '@/frontend/shared/exceptions';

export function readHttpResponse<T>(
  response: HttpResponse,
  schema: z.ZodType<T>,
  expectedHttpStatus = 200,
): T {
  if (response.httpStatus !== expectedHttpStatus) {
    throw new ClientException('contract', 'The response could not be read. Please try again.');
  }

  const parsed = schema.safeParse(response.body);

  if (!parsed.success) {
    throw new ClientException('contract', 'The response could not be read. Please try again.');
  }

  return parsed.data;
}
