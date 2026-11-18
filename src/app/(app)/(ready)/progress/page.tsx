import type { Metadata } from 'next';
import { pageMetadata } from '@/app/page-metadata';
import { ProgressDashboard } from '@/frontend/progress/features';
import { ProgressContainerProvider } from '@/frontend/progress/providers';

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata('SHARED:APP_NAVIGATION.PROGRESS_LINK.LABEL');
}

export default function ProgressPage() {
  return (
    <ProgressContainerProvider>
      <ProgressDashboard />
    </ProgressContainerProvider>
  );
}
