/**
 * RED-first test for `lib/cn.ts` — task T-WA-1.5.
 *
 * `cn()` is the standard shadcn-ui helper: it composes class names with
 * `clsx()` (handles falsy values + conditionals) and then deduplicates
 * conflicting Tailwind classes via `tailwind-merge` (so `cn('p-2','p-4')`
 * collapses to `'p-4'` instead of leaving both classes in the output).
 *
 * Three triangulation cases per strict-tdd.md:
 *  1. Happy path: simple concatenation.
 *  2. Tailwind conflict: tailwind-merge MUST win.
 *  3. Conditional + undefined: clsx MUST drop falsy values.
 */
import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/cn';

describe('cn()', () => {
  it('joins simple class names with a single space', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('collapses conflicting tailwind classes — last wins', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('drops falsy values and undefined inputs', () => {
    expect(cn('a', false && 'b', undefined, 'c')).toBe('a c');
  });
});
