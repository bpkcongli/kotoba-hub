import type { Metadata } from 'next';
import { ProgressDashboard } from '@/frontend/progress/features';
import { ProgressContainerProvider } from '@/frontend/progress/providers';

export const metadata: Metadata = { title: 'Progress' };

export default function ProgressPage() {
  return (
    <ProgressContainerProvider>
      <ProgressDashboard />
    </ProgressContainerProvider>
  );
}
