import { cookies } from 'next/headers';
import { readSessionToken } from '@/backend/auth/application/services/session';
import { signOut } from '@/backend/auth/infrastructure/config/auth';
import { SESSION_COOKIE_NAME } from '@/backend/auth/infrastructure/config/auth-cookie';
import { readAuthEnv } from '@/backend/auth/infrastructure/config/auth-env';
import { revokeSession } from '@/backend/auth/infrastructure/di/session';
import { requireSameOrigin } from '@/backend/auth/interface/primary/rest/origin';
import { ApplicationStatusCode } from '@/backend/shared/interface/primary/rest/api-status';
import { apiResponse } from '@/backend/shared/interface/primary/rest/response';

export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  try {
    readAuthEnv();

    const token = readSessionToken(request.headers.get('cookie'));
    if (token) {
      await revokeSession(token);
    }

    await signOut({ redirect: false });
    (await cookies()).set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0,
    });
  } catch {
    return apiResponse(ApplicationStatusCode.UNHANDLED_AUTH_EXCEPTION);
  }

  return apiResponse(ApplicationStatusCode.SUCCESS);
}
