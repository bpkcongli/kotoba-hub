import type { StoreError } from '@/frontend/shared/interfaces';
import type { UiMessageKey, UiTranslator } from '@/shared/i18n';

const clientMessageKeys: Record<string, UiMessageKey> = {
  network: 'SHARED:CLIENT_ERRORS.NETWORK_ERROR.MESSAGE',
  timeout: 'SHARED:CLIENT_ERRORS.TIMEOUT_ERROR.MESSAGE',
  contract: 'SHARED:CLIENT_ERRORS.CONTRACT_ERROR.MESSAGE',
  cancelled: 'SHARED:CLIENT_ERRORS.CANCELLATION_ERROR.MESSAGE',
  unexpected: 'SHARED:CLIENT_ERRORS.REQUEST_ERROR.MESSAGE',
};

export function errorMessage(error: StoreError, t: UiTranslator): string {
  if (typeof error.code === 'number') return error.message;

  return t(
    clientMessageKeys[error.code ?? 'unexpected'] ?? 'SHARED:CLIENT_ERRORS.REQUEST_ERROR.MESSAGE',
  );
}

export function validationMessage(message: string, t: UiTranslator): string {
  return message.startsWith('ONBOARDING:ASSESSMENT_FORM.') &&
    message.endsWith('.VALIDATION_MESSAGE') &&
    t.has(message)
    ? t(message)
    : message;
}
