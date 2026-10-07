import { ApplicationStatusCode } from '@/backend/shared/interface/primary/rest/api-status';
import { apiResponse } from '@/backend/shared/interface/primary/rest/response';

export function requireSameOrigin(request: Request): Response | null {
  const origin = request.headers.get('origin');
  const requestUrl = new URL(request.url);
  const host = request.headers.get('host');

  let originUrl: URL | null = null;
  try {
    if (origin) originUrl = new URL(origin);
  } catch {
    return apiResponse(ApplicationStatusCode.ORIGIN_NOT_ALLOWED);
  }

  const validOrigin = originUrl?.origin === origin;
  const matchesRequestUrl = validOrigin && origin === requestUrl.origin;
  const matchesHost =
    validOrigin &&
    originUrl !== null &&
    !!host &&
    originUrl.host === host &&
    originUrl.protocol === requestUrl.protocol;

  if (!matchesRequestUrl && !matchesHost) {
    return apiResponse(ApplicationStatusCode.ORIGIN_NOT_ALLOWED);
  }

  return null;
}
