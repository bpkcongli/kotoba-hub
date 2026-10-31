import type { Metadata } from 'next';
import { Dashboard } from '@/frontend/dashboard/features';
import { ProgressContainerProvider } from '@/frontend/progress/providers';

export const metadata: Metadata = { title: 'Dashboard' };

export default function DashboardPage() {
  return (
    <ProgressContainerProvider scopeKey="dashboard">
      <Dashboard />
    </ProgressContainerProvider>
  );
}
