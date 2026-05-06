/**
 * Web auth Zod schemas — used by `/api/auth/login` and `/api/auth/register`
 * BFF route handlers AND the client-side LoginForm/RegisterForm components.
 *
 * **Inline duplication of `apps/api/src/routes/auth.ts:22-44`** per design O-Q1.
 * The API is the source of truth for validation; the BFF re-validates to:
 *   1. Reject malformed bodies BEFORE making an upstream HTTP call (cheap).
 *   2. Surface Spanish field-level errors to the form without a round-trip.
 *
 * Follow-up `shared-auth-schemas` change will extract these to
 * `@matchday/shared` so api + web import the same source.
 *
 * Spanish messages match the API verbatim where possible (REQ-WP-7,
 * REQ-WB-3) so a user gets the same copy whether validation fires on
 * the BFF or the upstream API.
 */
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  nickname: z
    .string()
    .min(3, 'Minimo 3 caracteres')
    .max(24, 'Maximo 24 caracteres')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Solo letras, numeros, puntos, guiones y guiones bajos'),
  position: z.enum(['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD']),
  bio: z.string().max(280).optional(),
  avatarUrl: z.string().url().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  city: z.string().max(100).optional(),
  acceptedTosVersion: z.string().min(1, 'Debes aceptar los Términos de Servicio'),
  acceptedPrivacyVersion: z.string().min(1, 'Debes aceptar la Política de Privacidad'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
