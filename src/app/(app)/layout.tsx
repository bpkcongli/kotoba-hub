import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getSessionSnapshot } from '@/backend/auth/infrastructure/di/session';

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();
  const session = await getSessionSnapshot(requestHeaders.get('cookie'));

  if (!session.isAuthenticated) redirect('/');

  return children;
}
