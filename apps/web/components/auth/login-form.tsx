/**
 * LoginForm — client component used by /login server page.
 *
 * Spec: REQ-WP-4, REQ-WP-7, REQ-WP-11.
 *
 * Submission flow:
 *   1. Client-side Zod validation via the same `loginSchema` the BFF uses.
 *   2. POST to `/api/auth/login` with `{ email, password }`.
 *   3. On 200: `router.push(redirectTarget)` where `redirectTarget` is the
 *      sanitized `?redirect=` query param (must be a same-origin path) or
 *      `/dashboard` by default.
 *   4. On 4xx: surface the Spanish `error` field from the response body
 *      via the `<AuthFormError>` alert.
 *   5. On 5xx / network: show "Error de red. Inténtalo de nuevo."
 *
 * Uses native HTML form elements wired to react-hook-form for ergonomics
 * (no shadcn `Form` wrapper here — it adds bundle weight and the form is
 * trivial). Zod errors flow through `setError`.
 */
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginSchema, type LoginInput } from '@/lib/schemas/auth';

const NETWORK_ERROR_MESSAGE = 'Error de red. Inténtalo de nuevo.';

/**
 * Sanitize the `?redirect=` query value: only allow same-origin paths
 * (start with `/`, no protocol, no double-slash that browsers treat as
 * protocol-relative).
 */
function sanitizeRedirect(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith('/')) return null;
  if (value.startsWith('//')) return null;
  return value;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginInput) {
    setSubmitError(null);
    let response: Response;
    try {
      response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(values),
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
        // ignore parse error
      }
      if (response.status >= 500) {
        setSubmitError(message ?? NETWORK_ERROR_MESSAGE);
      } else {
        setSubmitError(message ?? NETWORK_ERROR_MESSAGE);
      }
      return;
    }

    const target =
      sanitizeRedirect(searchParams.get('redirect')) ?? '/dashboard';
    router.push(target);
    router.refresh();
  }

  const emailError = form.formState.errors.email?.message;
  const passwordError = form.formState.errors.password?.message;

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          aria-invalid={emailError ? true : undefined}
          {...form.register('email')}
        />
        {emailError ? (
          <p className="text-sm font-medium text-red-600" role="alert">
            {emailError}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="login-password">Contraseña</Label>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          aria-invalid={passwordError ? true : undefined}
          {...form.register('password')}
        />
        {passwordError ? (
          <p className="text-sm font-medium text-red-600" role="alert">
            {passwordError}
          </p>
        ) : null}
      </div>

      {submitError ? (
        <p
          className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700"
          role="alert"
        >
          {submitError}
        </p>
      ) : null}

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Iniciando…' : 'Iniciar sesión'}
      </Button>
    </form>
  );
}
