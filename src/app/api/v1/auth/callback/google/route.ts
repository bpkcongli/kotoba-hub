import type { NextRequest } from 'next/server';
import { handlers } from '@/backend/auth/infrastructure/config/auth';
import { readAuthEnv } from '@/backend/auth/infrastructure/config/auth-env';
import { readGoogleCallbackRequest } from '@/backend/auth/interface/primary/rest/dto/google-callback.request.dto';
import {
  ApplicationStatusCode,
  applicationErrorDetailMessage,
} from '@/backend/shared/interface/primary/rest/api-status';
import { apiResponse } from '@/backend/shared/interface/primary/rest/response';

export async function GET(request: NextRequest) {
  const callback = readGoogleCallbackRequest(request.nextUrl.searchParams);

  if (callback.error !== null) {
    return apiResponse(ApplicationStatusCode.GOOGLE_AUTHENTICATION_FAILED);
  }

  if (!callback.code || !callback.state) {
    return apiResponse(ApplicationStatusCode.INVALID_OAUTH_CALLBACK, undefined, [
      {
        field: !callback.state ? 'state' : 'code',
        message: applicationErrorDetailMessage[ApplicationStatusCode.INVALID_OAUTH_CALLBACK],
      },
    ]);
  }

  readAuthEnv();

  const response = await handlers.GET(request);
  const location = response.headers.get('location');

  if (location && /[?&]error=/.test(location)) {
    const errorResponse = apiResponse(ApplicationStatusCode.GOOGLE_AUTHENTICATION_FAILED);

    for (const cookie of response.headers.getSetCookie()) {
      errorResponse.headers.append('set-cookie', cookie);
    }

    return errorResponse;
  }

  return response;
}
