import { BaseException } from './BaseException';

export interface ApiFailure {
  httpStatus: number;
  code: number | null;
  traceId: string | null;
  errorDetails: readonly { field: string; message: string }[];
}

export class ApiException extends BaseException {
  constructor(
    message: string,
    readonly failure: ApiFailure,
    cause?: unknown,
  ) {
    super(message, cause);
  }
}
