import type { ComponentProps } from 'react';
import { cn } from '@/frontend/shared/helpers/cn';

export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn('rounded-md bg-secondary motion-safe:animate-pulse', className)}
      {...props}
    />
  );
}
