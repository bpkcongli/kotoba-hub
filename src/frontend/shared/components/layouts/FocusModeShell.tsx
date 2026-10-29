import type { ReactNode } from 'react';
import { AppHeader } from './AppHeader';
import { AppShell } from './AppShell';

export function FocusModeShell({
  title,
  exitAction,
  progress,
  children,
}: {
  title: string;
  exitAction: ReactNode;
  progress?: ReactNode;
  children: ReactNode;
}) {
  return (
    <AppShell variant="focus" header={<AppHeader title={title} actions={exitAction} />}>
      <div className="space-y-6">
        {progress}
        {children}
      </div>
    </AppShell>
  );
}
