import { BaseException } from './BaseException';

export type ClientFailureKind = 'network' | 'timeout' | 'cancelled' | 'contract' | 'unexpected';

export class ClientException extends BaseException {
  constructor(
    readonly kind: ClientFailureKind,
    message: string,
    cause?: unknown,
  ) {
    super(message, cause);
  }
}
