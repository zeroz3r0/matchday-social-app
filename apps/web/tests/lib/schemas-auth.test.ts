/**
 * Tests for `apps/web/lib/schemas/auth.ts`.
 *
 * These schemas mirror the API's inline Zod schemas at
 * `apps/api/src/routes/auth.ts:22-44` (REQ-WB-3 / design §3 "Schema source").
 * Inline duplication is intentional per O-Q1 — extraction to
 * `@matchday/shared` is a follow-up `shared-auth-schemas` change.
 *
 * Spanish error messages are MANDATORY (REQ-WP-7) — assert each message text.
 */
import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from '@/lib/schemas/auth';

describe('loginSchema', () => {
  it('accepts a valid email + non-empty password', () => {
    const result = loginSchema.safeParse({
      email: 'ana@matchday.app',
      password: 'Hunter2!',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email with a Spanish message', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'x' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailIssue = result.error.issues.find((i) => i.path[0] === 'email');
      expect(emailIssue?.message).toBe('Email invalido');
    }
  });

  it('rejects an empty password with a Spanish message', () => {
    const result = loginSchema.safeParse({ email: 'ana@matchday.app', password: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const passwordIssue = result.error.issues.find((i) => i.path[0] === 'password');
      expect(passwordIssue?.message).toBe('Contraseña requerida');
    }
  });
});

describe('registerSchema', () => {
  const validBody = {
    email: 'nueva@matchday.app',
    password: 'Hunter2!8chars',
    nickname: 'ana_2026',
    position: 'MIDFIELDER' as const,
    acceptedTosVersion: '2026-01-01',
    acceptedPrivacyVersion: '2026-01-01',
  };

  it('accepts a valid full registration body', () => {
    const result = registerSchema.safeParse(validBody);
    expect(result.success).toBe(true);
  });

  it('rejects a password shorter than 8 characters with a Spanish message', () => {
    const result = registerSchema.safeParse({ ...validBody, password: 'short' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'password');
      expect(issue?.message).toBe('La contraseña debe tener al menos 8 caracteres');
    }
  });

  it('rejects a nickname with invalid characters with a Spanish message', () => {
    const result = registerSchema.safeParse({ ...validBody, nickname: 'has spaces!' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'nickname');
      expect(issue?.message).toBe('Solo letras, numeros, puntos, guiones y guiones bajos');
    }
  });

  it('rejects an unknown position', () => {
    const result = registerSchema.safeParse({ ...validBody, position: 'COACH' });
    expect(result.success).toBe(false);
  });

  it('requires acceptedTosVersion and acceptedPrivacyVersion', () => {
    const result = registerSchema.safeParse({
      ...validBody,
      acceptedTosVersion: '',
      acceptedPrivacyVersion: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const tos = result.error.issues.find((i) => i.path[0] === 'acceptedTosVersion');
      const privacy = result.error.issues.find((i) => i.path[0] === 'acceptedPrivacyVersion');
      expect(tos?.message).toBe('Debes aceptar los Términos de Servicio');
      expect(privacy?.message).toBe('Debes aceptar la Política de Privacidad');
    }
  });

  it('accepts optional bio, avatarUrl, latitude, longitude, city when present', () => {
    const result = registerSchema.safeParse({
      ...validBody,
      bio: 'Jugador de F5',
      avatarUrl: 'https://cdn.matchday.app/a.jpg',
      latitude: 41.39,
      longitude: 2.16,
      city: 'Barcelona',
    });
    expect(result.success).toBe(true);
  });
});
