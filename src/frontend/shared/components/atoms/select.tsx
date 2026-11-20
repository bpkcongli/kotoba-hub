import { ChevronDown } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/frontend/shared/helpers/cn';

export type SelectProps = Omit<ComponentProps<'select'>, 'multiple' | 'size'> & {
  containerClassName?: string;
};

export function Select({ className, containerClassName, children, ...props }: SelectProps) {
  return (
    <span className={cn('relative inline-flex w-full min-w-0', containerClassName)}>
      <select
        className={cn(
          'peer min-h-11 w-full min-w-0 appearance-none rounded-md border border-input bg-card py-2 pr-10 pl-3 text-body text-foreground outline-none focus-visible:focus-ring disabled:opacity-50',
          className,
        )}
        {...props}>
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-foreground peer-disabled:opacity-50"
      />
    </span>
  );
}
