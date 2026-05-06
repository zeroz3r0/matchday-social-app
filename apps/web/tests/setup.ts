/**
 * Vitest setup file.
 *
 * Imported once per test process via `vitest.config.ts#test.setupFiles`.
 * Registers `@testing-library/jest-dom`'s custom matchers (`toBeInTheDocument`,
 * `toHaveTextContent`, etc.) on Vitest's `expect`.
 */
import '@testing-library/jest-dom/vitest';
