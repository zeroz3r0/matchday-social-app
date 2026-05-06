import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/**
 * Vitest config for @matchday/web.
 *
 * Per design #33 §6:
 * - `happy-dom` for DOM-touching tests (cheaper than jsdom).
 * - Setup file registers `@testing-library/jest-dom` matchers.
 * - `@/` alias mirrors the tsconfig path so test imports match prod imports.
 *
 * Per spec REQ-WA-9: a smoke test exists; per testing-capabilities #8 the
 * runner is the same Vitest used by shared + api.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}', 'app/**/*.test.{ts,tsx}', 'lib/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
