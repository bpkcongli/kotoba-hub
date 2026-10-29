import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSessionSnapshot } from '@/backend/auth/infrastructure/di';
import { toSessionResponseDto } from '@/backend/auth/interface/primary/rest/dto/session.response.dto';
import { OnboardingWorkspace } from '@/frontend/auth/components/organisms';
import { Onboarding } from '@/frontend/onboarding/features';
import { AppSessionBootstrap } from '@/frontend/shared/providers';

export const metadata: Metadata = { title: 'Your learning profile | KotobaHub' };

export default async function OnboardingPage() {
  const requestHeaders = await headers();
  const session = await getSessionSnapshot(requestHeaders.get('cookie'));

  if (!session.isAuthenticated) redirect('/login');

  if (session.authorization.appAccess === 'APP_READY') redirect('/dashboard');

  return (
    <AppSessionBootstrap session={toSessionResponseDto(session)}>
      <OnboardingWorkspace>
        <Onboarding />
      </OnboardingWorkspace>
    </AppSessionBootstrap>
  );
}
