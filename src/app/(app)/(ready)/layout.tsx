import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getSessionSnapshot } from '@/backend/auth/infrastructure/di';
import { toSessionResponseDto } from '@/backend/auth/interface/primary/rest/dto/session.response.dto';
import { FlashcardRouteScope } from '@/frontend/flashcards/providers';
import { PracticeRouteScope } from '@/frontend/practice/providers';
import { AppWorkspace } from '@/frontend/shared/components/layouts';
import { AppSessionBootstrap } from '@/frontend/shared/providers';

export default async function AppReadyLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();

  const session = await getSessionSnapshot(requestHeaders.get('cookie'));
  if (!session.isAuthenticated) redirect('/login');
  if (session.authorization.appAccess === 'ONBOARDING_REQUIRED') redirect('/onboarding');

  return (
    <AppSessionBootstrap session={toSessionResponseDto(session)}>
      <FlashcardRouteScope>
        <PracticeRouteScope>
          <AppWorkspace>{children}</AppWorkspace>
        </PracticeRouteScope>
      </FlashcardRouteScope>
    </AppSessionBootstrap>
  );
}
