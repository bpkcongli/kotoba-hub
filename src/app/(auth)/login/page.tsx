import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { RedirectPath } from '@/backend/auth/domain/value-objects/redirect-path';
import { readAuthOrigin } from '@/backend/auth/infrastructure/config/auth-origin';
import { getSessionSnapshot } from '@/backend/auth/infrastructure/di';
import { toSessionResponseDto } from '@/backend/auth/interface/primary/rest/dto/session.response.dto';
import { Login } from '@/frontend/auth/features';
import { AppSessionBootstrap } from '@/frontend/shared/providers';

export const metadata: Metadata = { title: 'Sign in | KotobaHub' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string | string[]; error?: string | string[] }>;
}) {
  const query = await searchParams;
  const requestHeaders = await headers();

  const requested = typeof query.redirectTo === 'string' ? query.redirectTo : '/dashboard';
  const safePath = RedirectPath.create(requested)?.value ?? '/dashboard';
  const pathname = new URL(safePath, readAuthOrigin()).pathname;
  const destination = ['/login', '/onboarding'].includes(pathname.replace(/\/$/, ''))
    ? '/dashboard'
    : safePath;

  const session = await getSessionSnapshot(requestHeaders.get('cookie'));
  if (session.authorization.appAccess === 'ONBOARDING_REQUIRED') redirect('/onboarding');
  if (session.authorization.appAccess === 'APP_READY') redirect(destination);

  return (
    <AppSessionBootstrap session={toSessionResponseDto(session)}>
      <Login redirectTo={destination} hasError={Boolean(query.error)} />
    </AppSessionBootstrap>
  );
}
