import { RedirectPath } from '@/backend/auth/domain/value-objects/redirect-path';
import { signIn } from '@/backend/auth/infrastructure/config/auth';
import { readAuthEnv } from '@/backend/auth/infrastructure/config/auth-env';
import { readStartGoogleRequest } from '@/backend/auth/interface/primary/rest/dto/start-google.request.dto';
import { requireSameOrigin } from '@/backend/auth/interface/primary/rest/origin';
import {
  ApplicationStatusCode,
  HttpStatusCode,
  applicationErrorDetailMessage,
} from '@/backend/shared/interface/primary/rest/api-status';
import { apiResponse } from '@/backend/shared/interface/primary/rest/response';

export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const { redirectTo: requestedRedirectTo } = readStartGoogleRequest(request);
  const redirectTo = requestedRedirectTo ?? '/dashboard';
  const redirectPath = RedirectPath.create(redirectTo);
  if (!redirectPath) {
    return apiResponse(ApplicationStatusCode.INVALID_REDIRECT_TO, undefined, [
      {
        field: 'redirectTo',
        message: applicationErrorDetailMessage[ApplicationStatusCode.INVALID_REDIRECT_TO],
      },
    ]);
  }

  readAuthEnv();
  const location = await signIn('google', { redirect: false, redirectTo: redirectPath.value });

  return new Response(null, { status: HttpStatusCode.FOUND, headers: { Location: location } });
}
