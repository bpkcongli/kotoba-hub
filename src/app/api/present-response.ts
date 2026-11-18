import { getSessionSnapshot } from '@/backend/auth/infrastructure/di';
import { ApplicationStatusCode } from '@/backend/shared/interface/primary/rest/api-status';
import { localizeApiResponse } from '@/backend/shared/interface/primary/rest/localize-response';
import { userPreferencesService } from '@/backend/users/infrastructure/di';
import { localeSchema, uiLocaleCookie, type Locale } from '@/shared/locale';

export async function requestUiLocale(request: Request): Promise<Locale> {
  const explicit = localeSchema.safeParse(request.headers.get('X-UI-Locale'));
  if (explicit.success) return explicit.data;

  const cookie = request.headers.get('cookie');
  if (!cookie) return 'en';

  try {
    const session = await getSessionSnapshot(cookie);
    if (session.user) return (await userPreferencesService.get(session.user.id)).uiLocale;

    return uiLocaleCookie(cookie);
  } catch {
    console.error('API UI locale could not be resolved; using English.');

    return 'en';
  }
}

export async function presentResponse(request: Request, response: Response | Promise<Response>) {
  const result = await response;
  if (!result.headers.get('content-type')?.includes('application/json')) return result;

  const body = await result
    .clone()
    .json()
    .catch(() => null);
  const originDenied = [
    ApplicationStatusCode.ORIGIN_NOT_ALLOWED,
    ApplicationStatusCode.USER_PROFILE_ORIGIN_NOT_ALLOWED,
  ].some((code) => code === body?.status?.code);

  if (result.status === 401 || originDenied) {
    const explicit = localeSchema.safeParse(request.headers.get('X-UI-Locale'));

    return localizeApiResponse(
      result,
      explicit.success ? explicit.data : uiLocaleCookie(request.headers.get('cookie')),
    );
  }

  return localizeApiResponse(result, await requestUiLocale(request));
}
