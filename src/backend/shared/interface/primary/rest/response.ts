import { randomUUID } from 'node:crypto';
import { applicationStatus, type ApplicationStatusCode } from './api-status';
import type { ApiErrorDetailDto, ApiResponseDto } from './dto/api-response.dto';

export function apiResponse<TData = unknown>(
  code: ApplicationStatusCode,
  data?: TData,
  errorDetails: ApiErrorDetailDto[] = [],
): Response {
  const { httpStatus, message } = applicationStatus[code];
  const body: ApiResponseDto<TData> = {
    status: { traceId: randomUUID(), code, message, errorDetails },
    ...(data !== undefined ? { data } : {}),
  };

  return Response.json(body, { status: httpStatus });
}
