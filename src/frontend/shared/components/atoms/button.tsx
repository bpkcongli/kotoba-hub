import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/frontend/shared/helpers/cn';

const buttonVariants = cva(
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 py-3 text-body-sm font-semibold transition-colors duration-fast ease-standard focus-visible:focus-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-surface-strong active:bg-primary',
        secondary:
          'border border-border bg-secondary text-secondary-foreground hover:bg-card active:bg-secondary',
        ghost: 'text-foreground hover:bg-secondary active:bg-background',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

function Button({ className, variant, asChild = false, type, ...props }: ButtonProps) {
  const Component = asChild ? Slot : 'button';

  return (
    <Component
      data-slot="button"
      className={cn(buttonVariants({ variant, className }))}
      type={asChild ? undefined : (type ?? 'button')}
      {...props}
    />
  );
}

export { Button, buttonVariants };
export type { ButtonProps };
