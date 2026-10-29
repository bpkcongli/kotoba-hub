import { BookOpen, Settings } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/frontend/shared/helpers/cn';
import { APP_NAVIGATION, isNavigationActive, type AppNavigationItem } from './navigation';

export interface AppNavigationProps {
  pathname: string;
  items?: readonly AppNavigationItem[];
}

export function AppSidebar({ pathname, items = APP_NAVIGATION }: AppNavigationProps) {
  return (
    <aside className="sticky top-0 hidden h-svh w-64 flex-col overflow-y-auto bg-primary px-4 py-6 text-primary-foreground lg:flex">
      <Link
        href="/dashboard"
        className="mb-8 inline-flex min-h-11 items-center gap-3 rounded-md px-3 font-bold focus-visible:focus-ring">
        <BookOpen aria-hidden="true" className="size-6 shrink-0" />
        <span className="text-h3">KotobaHub</span>
      </Link>

      <nav aria-label="Primary navigation">
        <ul className="space-y-2">
          {items.map(({ href, label, icon: Icon, available }) => {
            const active = available && isNavigationActive(pathname, href);

            const content = (
              <>
                <Icon aria-hidden="true" className="size-5 shrink-0" />
                <span className="min-w-0 wrap-break-word">{label}</span>
              </>
            );

            return (
              <li key={href}>
                {available ? (
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex min-h-12 items-center gap-3 rounded-md border-l-4 px-3 py-3 text-body-sm font-medium transition-colors duration-fast focus-visible:focus-ring',
                      active
                        ? 'border-brand-accent bg-card font-semibold text-foreground'
                        : 'border-transparent hover:bg-surface-strong',
                    )}>
                    {content}
                  </Link>
                ) : (
                  <span
                    aria-disabled="true"
                    className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1 rounded-md border-l-4 border-transparent px-3 py-3 text-body-sm">
                    {content}
                    <span className="ml-8 w-full text-caption">Not available yet</span>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto border-t border-brand-secondary pt-6">
        <span
          aria-disabled="true"
          className="flex min-h-11 flex-wrap items-center gap-x-3 px-4 text-body-sm">
          <Settings aria-hidden="true" className="size-5 shrink-0" />
          <span>Settings</span>
          <span className="ml-8 w-full text-caption">Not available yet</span>
        </span>
      </div>
    </aside>
  );
}
