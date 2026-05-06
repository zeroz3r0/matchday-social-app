/**
 * shadcn-ui Card — React 19 ref-as-prop pattern.
 */
import * as React from 'react';

import { cn } from '@/lib/cn';

type DivProps = React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> };

export function Card({ className, ref, ...props }: DivProps) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] shadow-sm',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ref, ...props }: DivProps) {
  return <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />;
}

export function CardTitle({ className, ref, ...props }: DivProps) {
  return (
    <div
      ref={ref}
      className={cn('text-2xl font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ref, ...props }: DivProps) {
  return <div ref={ref} className={cn('text-sm text-neutral-500', className)} {...props} />;
}

export function CardContent({ className, ref, ...props }: DivProps) {
  return <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />;
}

export function CardFooter({ className, ref, ...props }: DivProps) {
  return <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />;
}
