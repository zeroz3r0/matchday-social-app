/**
 * Standard shadcn-ui class-name helper.
 *
 * Composes `clsx` (handles arrays, conditionals, falsy values) and
 * `tailwind-merge` (deduplicates conflicting Tailwind classes so the LAST
 * declaration wins — e.g. `cn('p-2','p-4') === 'p-4'`).
 *
 * Test contract: see `tests/lib/cn.test.ts`.
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
