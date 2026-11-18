import type { Metadata } from 'next';
import { pageMetadata } from '@/app/page-metadata';
import { Dashboard } from '@/frontend/dashboard/features';
import { ProgressContainerProvider } from '@/frontend/progress/providers';

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata('SHARED:APP_NAVIGATION.DASHBOARD_LINK.LABEL');
}

export default function DashboardPage() {
  return (
    <ProgressContainerProvider scopeKey="dashboard">
      <Dashboard />
    </ProgressContainerProvider>
  );
}
