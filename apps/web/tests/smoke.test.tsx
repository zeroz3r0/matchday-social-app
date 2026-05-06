/**
 * Smoke test — proves Vitest + RTL + happy-dom + jest-dom matchers are all
 * wired correctly. Per spec REQ-WA-9.
 *
 * This is a smoke test ON PURPOSE: it verifies the test infrastructure, not
 * a behavior under test. The cn() test (`tests/lib/cn.test.ts`) is the real
 * RED-first TDD evidence for Phase 1 — see strict-tdd.md "Smoke Test Rule".
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('test infra smoke', () => {
  it('renders a trivial component and finds its text', () => {
    render(<div data-testid="hello">ok</div>);
    expect(screen.getByTestId('hello')).toHaveTextContent('ok');
  });
});
