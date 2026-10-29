import { ApiException, BaseException, ClientException } from '@/frontend/shared/exceptions';
import type { StoreError } from '@/frontend/shared/interfaces';

export function presentError(error: unknown): StoreError {
  if (error instanceof ApiException) {
    return {
      message: error.message,
      code: error.failure.code,
      traceId: error.failure.traceId,
      fieldErrors: error.failure.httpStatus === 422 ? error.failure.errorDetails : [],
    };
  }

  return {
    message: error instanceof BaseException ? error.message : 'Could not complete the request.',
    code: error instanceof ClientException ? error.kind : null,
    traceId: null,
    fieldErrors: [],
  };
}
