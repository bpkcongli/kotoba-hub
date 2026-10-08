import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getSessionSnapshot } from '@/backend/auth/infrastructure/di';

export default async function AppReadyLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();
  const session = await getSessionSnapshot(requestHeaders.get('cookie'));

  if (session.authorization.appAccess === 'ONBOARDING_REQUIRED') redirect('/onboarding');

  return children;
}
