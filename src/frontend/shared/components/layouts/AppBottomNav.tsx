import Link from 'next/link';
import { cn } from '@/frontend/shared/helpers/cn';
import type { AppNavigationProps } from './AppSidebar';
import { APP_NAVIGATION, isNavigationActive } from './navigation';

export function AppBottomNav({ pathname, items = APP_NAVIGATION }: AppNavigationProps) {
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
      <ul className="mx-auto grid max-w-2xl grid-cols-5 gap-1">
        {items.map(({ href, label, icon: Icon, available }) => {
          const active = available && isNavigationActive(pathname, href);

          const className = cn(
            'flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-md border-t-2 py-2 text-center text-caption',
            active
              ? 'border-primary bg-secondary font-semibold text-foreground'
              : 'border-transparent text-muted-foreground',
          );

          const content = (
            <>
              <Icon aria-hidden="true" className="size-5 shrink-0" />
              <span className="max-w-full wrap-anywhere">{label}</span>
              {!available && <span className="text-caption">Soon</span>}
            </>
          );

          return (
            <li key={href} className="min-w-0">
              {available ? (
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    className,
                    'transition-colors duration-fast hover:bg-secondary focus-visible:focus-ring',
                  )}>
                  {content}
                </Link>
              ) : (
                <span aria-disabled="true" className={className}>
                  {content}
                  <span className="sr-only">Not available yet</span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
