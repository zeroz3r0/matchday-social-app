/**
 * Spanish error message mapping — design §3 (REQ-WB-7, REQ-WB-9, REQ-WP-7).
 *
 * Maps an API error `code` (string from `error.code`) OR an HTTP status
 * (number) to a user-facing Spanish message. Anything not recognised falls
 * back to a generic apologetic message — never leak raw API error text to
 * the user.
 *
 * The API codes are extracted by reading `apps/api/src/routes/auth.ts` and
 * the `errorHandler` middleware. New codes added on the API MUST be mirrored
 * here when they become user-visible.
 *
 * Pure function — no I/O, no side effects.
 */

const FALLBACK = 'Ha ocurrido un error inesperado. Inténtalo de nuevo más tarde.';

const STRING_MESSAGES: Record<string, string> = {
  // Login
  INVALID_CREDENTIALS: 'Email o contraseña incorrectos.',

  // Register / unique-constraint
  EMAIL_TAKEN: 'Este correo ya está registrado.',
  DUPLICATE_ENTRY: 'Ya existe una cuenta con esos datos.',

  // Generic validation surfaced by the API errorHandler
  VALIDATION_ERROR: 'Revisá los datos ingresados.',

  // Legal version mismatches (REQ from api auth.ts)
  TOS_VERSION_MISMATCH: 'Tenés que aceptar la última versión de los Términos.',
  PRIVACY_VERSION_MISMATCH:
    'Tenés que aceptar la última versión de la Política de Privacidad.',

  // Rate-limit (forgot-password limiter + future limiters)
  RATE_LIMIT: 'Demasiados intentos. Esperá unos minutos.',

  // BFF-emitted codes (this layer, not API)
  INVALID_BODY: 'Cuerpo de la solicitud inválido.',
  SERVICE_UNAVAILABLE: 'Servicio no disponible. Intentá nuevamente.',
};

const NUMERIC_MESSAGES: Record<number, string> = {
  502: 'Servicio no disponible. Intentá nuevamente.',
  503: 'Servicio no disponible. Intentá nuevamente.',
};

/**
 * Resolve a Spanish error message for a given API error code or HTTP status.
 *
 * @param code - Either the `error.code` string from the upstream envelope
 *               (`{ success: false, error: { code, message } }`) or an HTTP
 *               status number. Strings are matched case-insensitively to
 *               survive minor casing drift between API and BFF.
 * @returns A Spanish, user-facing message safe to render in any UI surface.
 */
export function getSpanishErrorMessage(code: string | number): string {
  if (typeof code === 'number') {
    return NUMERIC_MESSAGES[code] ?? FALLBACK;
  }
  const normalized = code.toUpperCase();
  return STRING_MESSAGES[normalized] ?? FALLBACK;
}
