import type { ReactNode } from 'react';

export function AppFooter({ children }: { children?: ReactNode }) {
  return (
    <footer className="border-t border-border-subtle">
      <div className="mx-auto max-w-public px-4 py-6 text-body-sm text-muted-foreground md:px-6 lg:px-8">
        {children ?? 'Your Japanese study space, one step at a time.'}
      </div>
    </footer>
  );
}
