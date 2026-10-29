import axios from 'axios';
import {
  ApiException,
  BaseException,
  ClientException,
  ServerException,
  type ApiFailure,
} from '@/frontend/shared/exceptions';
import { errorEnvelopeSchema } from '@/frontend/shared/interfaces/responses';

export function normalizeHttpError(error: unknown): BaseException {
  if (error instanceof BaseException) return error;

  if (axios.isCancel(error)) {
    return new ClientException('cancelled', 'Request cancelled.', error);
  }

  if (!axios.isAxiosError(error)) {
    return new ClientException('unexpected', 'Could not complete the request.', error);
  }

  if (error.response) {
    const parsed = errorEnvelopeSchema.safeParse(error.response.data);
    const status = parsed.success ? parsed.data.status : null;

    const failure: ApiFailure = {
      httpStatus: error.response.status,
      code: status?.code ?? null,
      traceId: status?.traceId ?? null,
      errorDetails: status?.errorDetails ?? [],
    };
    const message = status?.message ?? 'Could not complete the request. Please try again.';

    return failure.httpStatus >= 500
      ? new ServerException(message, failure, error)
      : new ApiException(message, failure, error);
  }

  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return new ClientException('timeout', 'The request timed out. Please try again.', error);
  }

  if (error.code === 'ERR_NETWORK' || error.request) {
    return new ClientException(
      'network',
      'Could not connect. Check your connection and try again.',
      error,
    );
  }

  return new ClientException('unexpected', 'Could not complete the request.', error);
}
