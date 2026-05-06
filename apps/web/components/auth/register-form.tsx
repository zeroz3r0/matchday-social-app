/**
 * RegisterForm — client component used by /registro server page.
 *
 * Spec: REQ-WP-4, REQ-WP-7, REQ-WP-11.
 *
 * Posts to `/api/auth/register` with the full registration shape required
 * by the upstream API (`apps/api/src/routes/auth.ts`):
 *   - email, password, nickname, position
 *   - acceptedTosVersion, acceptedPrivacyVersion (server-injected; current
 *     versions are read by the parent server page from /api/legal/* and
 *     passed in as props)
 *
 * Optional fields (`bio`, `avatarUrl`, `latitude`, `longitude`, `city`)
 * are NOT collected in the Sprint 2 form to keep the surface minimal.
 * They can be added in a profile-edit flow later.
 *
 * Submission flow + error handling mirror LoginForm.
 */
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const NETWORK_ERROR_MESSAGE = 'Error de red. Inténtalo de nuevo.';

// Form-level schema — pared-down version of the upstream registerSchema.
// Strict mirror of the API's required core; legal versions are added by the
// component before posting (they're not user-controlled fields).
const formSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  nickname: z
    .string()
    .min(3, 'Mínimo 3 caracteres')
    .max(24, 'Máximo 24 caracteres')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Solo letras, números, puntos, guiones y guiones bajos'),
  position: z.enum(['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD'], {
    errorMap: () => ({ message: 'Elegí una posición' }),
  }),
  acceptedLegal: z.literal(true, {
    errorMap: () => ({ message: 'Debes aceptar los Términos y la Política de Privacidad' }),
  }),
});

type FormValues = z.infer<typeof formSchema>;

function sanitizeRedirect(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith('/')) return null;
  if (value.startsWith('//')) return null;
  return value;
}

export type RegisterFormProps = {
  /** Current ToS version (read on the server from `/api/legal/tos`). */
  tosVersion: string;
  /** Current Privacy version (read on the server from `/api/legal/privacy`). */
  privacyVersion: string;
};

export function RegisterForm({ tosVersion, privacyVersion }: RegisterFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      nickname: '',
      position: 'MIDFIELDER',
      acceptedLegal: false as unknown as true,
    },
  });

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    const payload = {
      email: values.email,
      password: values.password,
      nickname: values.nickname,
      position: values.position,
      acceptedTosVersion: tosVersion,
      acceptedPrivacyVersion: privacyVersion,
    };

    let response: Response;
    try {
      response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      setSubmitError(NETWORK_ERROR_MESSAGE);
      return;
    }

    if (!response.ok) {
      let message: string | null = null;
      try {
        const body = (await response.json()) as { error?: unknown };
        if (typeof body.error === 'string') message = body.error;
      } catch {
        // ignore
      }
      setSubmitError(message ?? NETWORK_ERROR_MESSAGE);
      return;
    }

    const target = sanitizeRedirect(searchParams.get('redirect')) ?? '/dashboard';
    router.push(target);
    router.refresh();
  }

  const errors = form.formState.errors;

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="register-email">Email</Label>
        <Input
          id="register-email"
          type="email"
          autoComplete="email"
          aria-invalid={errors.email ? true : undefined}
          {...form.register('email')}
        />
        {errors.email ? (
          <p className="text-sm font-medium text-red-600" role="alert">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="register-password">Contraseña</Label>
        <Input
          id="register-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.password ? true : undefined}
          {...form.register('password')}
        />
        {errors.password ? (
          <p className="text-sm font-medium text-red-600" role="alert">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="register-nickname">Apodo</Label>
        <Input
          id="register-nickname"
          type="text"
          autoComplete="username"
          aria-invalid={errors.nickname ? true : undefined}
          {...form.register('nickname')}
        />
        {errors.nickname ? (
          <p className="text-sm font-medium text-red-600" role="alert">
            {errors.nickname.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="register-position">Posición</Label>
        <select
          id="register-position"
          aria-invalid={errors.position ? true : undefined}
          className="flex h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2"
          {...form.register('position')}
        >
          <option value="GOALKEEPER">Portero</option>
          <option value="DEFENDER">Defensa</option>
          <option value="MIDFIELDER">Centrocampista</option>
          <option value="FORWARD">Delantero</option>
        </select>
        {errors.position ? (
          <p className="text-sm font-medium text-red-600" role="alert">
            {errors.position.message}
          </p>
        ) : null}
      </div>

      <label
        htmlFor="register-legal"
        className="flex items-start gap-2 text-sm text-neutral-700"
      >
        <input
          id="register-legal"
          type="checkbox"
          className="mt-0.5"
          {...form.register('acceptedLegal')}
        />
        <span>Acepto los Términos y la Política de Privacidad.</span>
      </label>
      {errors.acceptedLegal ? (
        <p className="text-sm font-medium text-red-600" role="alert">
          {errors.acceptedLegal.message as string}
        </p>
      ) : null}

      {submitError ? (
        <p
          className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700"
          role="alert"
        >
          {submitError}
        </p>
      ) : null}

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}
      </Button>
    </form>
  );
}
