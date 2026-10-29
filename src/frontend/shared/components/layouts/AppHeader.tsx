import { BookOpen } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

export interface AppHeaderProps {
  title: string;
  breadcrumbs?: ReactNode;
  actions?: ReactNode;
  accountMenu?: ReactNode;
}

export function AppHeader({ title, breadcrumbs, actions, accountMenu }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border-subtle bg-card">
      <div className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6 lg:px-8">
        <div className="min-w-0 flex-[1_1_12rem]">
          {breadcrumbs}
          <p className="text-h3 font-semibold wrap-break-word">{title}</p>
        </div>

        {(actions || accountMenu) && (
          <div className="flex flex-wrap items-center gap-3">
            {actions}
            {accountMenu}
          </div>
        )}
      </div>
    </header>
  );
}

export function PublicHeader({ actions }: { actions?: ReactNode }) {
  return (
    <header className="border-b border-border-subtle bg-card">
      <div className="mx-auto flex min-h-20 max-w-public flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-3 rounded-md font-bold tracking-tight focus-visible:focus-ring">
          <BookOpen aria-hidden="true" className="size-6 text-primary" />
          <span className="text-h3">KotobaHub</span>
        </Link>

        {actions}
      </div>
    </header>
  );
}
