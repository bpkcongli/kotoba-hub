import type { ComponentProps } from 'react';
import { cn } from '@/frontend/shared/helpers/cn';

type ProgressProps = Omit<ComponentProps<'div'>, 'children'> & {
  value?: number | null;
  max?: number;
  label: string;
};

function Progress({ className, value, max = 100, label, ...props }: ProgressProps) {
  const maximum = Number.isFinite(max) && max > 0 ? max : 100;
  const current =
    typeof value === 'number' && Number.isFinite(value)
      ? Math.min(maximum, Math.max(0, value))
      : undefined;

  return (
    <div
      {...props}
      data-slot="progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={maximum}
      aria-valuenow={current}
      className={cn('h-2 overflow-hidden rounded-full bg-secondary', className)}>
      <div
        aria-hidden="true"
        className={cn(
          'h-full rounded-full bg-primary transition-[width] duration-fast ease-standard',
          current === undefined && 'w-1/3 motion-safe:animate-pulse',
        )}
        style={current === undefined ? undefined : { width: `${(current / maximum) * 100}%` }}
      />
    </div>
  );
}

export { Progress };
export type { ProgressProps };
