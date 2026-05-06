/**
 * Tests for `apps/web/lib/errors.ts` — maps API error codes/HTTP statuses to
 * Spanish user-facing messages (design §3 Spanish error mapping table).
 *
 * The API (verified by reading `apps/api/src/routes/auth.ts`) emits these
 * codes: `INVALID_CREDENTIALS`, `TOS_VERSION_MISMATCH`, `PRIVACY_VERSION_MISMATCH`,
 * `RATE_LIMIT`, `INVALID_TOKEN`, `NOT_FOUND`, `EXPORT_RATE_LIMIT`, plus the
 * generic `VALIDATION_ERROR` from the global error handler. A Prisma unique
 * constraint violation on register surfaces as a 409 — we map it ourselves.
 */
import { describe, expect, it } from 'vitest';
import { getSpanishErrorMessage } from '@/lib/errors';

describe('getSpanishErrorMessage', () => {
  it('maps INVALID_CREDENTIALS to wrong email/password message', () => {
    expect(getSpanishErrorMessage('INVALID_CREDENTIALS')).toBe('Email o contraseña incorrectos.');
  });

  it('maps EMAIL_TAKEN / DUPLICATE_ENTRY to email-already-registered message', () => {
    expect(getSpanishErrorMessage('EMAIL_TAKEN')).toBe('Este correo ya está registrado.');
    expect(getSpanishErrorMessage('DUPLICATE_ENTRY')).toBe('Ya existe una cuenta con esos datos.');
  });

  it('maps VALIDATION_ERROR to revisá-los-datos message', () => {
    expect(getSpanishErrorMessage('VALIDATION_ERROR')).toBe('Revisá los datos ingresados.');
  });

  it('maps TOS_VERSION_MISMATCH and PRIVACY_VERSION_MISMATCH to a prompt to accept latest version', () => {
    expect(getSpanishErrorMessage('TOS_VERSION_MISMATCH')).toBe(
      'Tenés que aceptar la última versión de los Términos.',
    );
    expect(getSpanishErrorMessage('PRIVACY_VERSION_MISMATCH')).toBe(
      'Tenés que aceptar la última versión de la Política de Privacidad.',
    );
  });

  it('maps RATE_LIMIT to a wait message', () => {
    expect(getSpanishErrorMessage('RATE_LIMIT')).toBe('Demasiados intentos. Esperá unos minutos.');
  });

  it('maps numeric 502 / SERVICE_UNAVAILABLE to upstream-down message', () => {
    expect(getSpanishErrorMessage('SERVICE_UNAVAILABLE')).toBe(
      'Servicio no disponible. Intentá nuevamente.',
    );
    expect(getSpanishErrorMessage(502)).toBe('Servicio no disponible. Intentá nuevamente.');
  });

  it('maps INVALID_BODY / 400 to malformed-body message', () => {
    expect(getSpanishErrorMessage('INVALID_BODY')).toBe('Cuerpo de la solicitud inválido.');
  });

  it('returns the default fallback for unknown codes', () => {
    expect(getSpanishErrorMessage('SOMETHING_WEIRD')).toBe(
      'Ha ocurrido un error inesperado. Inténtalo de nuevo más tarde.',
    );
    expect(getSpanishErrorMessage(999)).toBe(
      'Ha ocurrido un error inesperado. Inténtalo de nuevo más tarde.',
    );
  });

  it('is case-insensitive on string codes (defensive)', () => {
    expect(getSpanishErrorMessage('invalid_credentials')).toBe('Email o contraseña incorrectos.');
  });
});
