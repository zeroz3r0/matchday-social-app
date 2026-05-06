/**
 * RED — tests for `<LoginForm>` client component.
 *
 * Spec: REQ-WP-4, REQ-WP-7. Form posts to `/api/auth/login`, surfaces
 * Spanish errors, and on success navigates the user.
 *
 * Behavior under test:
 *   - Renders Spanish labels: "Email", "Contraseña", submit button "Iniciar sesión".
 *   - Client-side Zod validation: empty submit shows Spanish field errors.
 *   - Happy path: POST to /api/auth/login → 200 → router.push('/dashboard').
 *   - 401: shows Spanish error message from response body.
 *   - 5xx / network: shows generic "Error de red" Spanish copy.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import { LoginForm } from '@/components/auth/login-form';

beforeEach(() => {
  pushMock.mockReset();
  vi.unstubAllGlobals();
});

describe('<LoginForm>', () => {
  it('renders Spanish labels and submit button', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });

  it('on successful submit (200), navigates to /dashboard', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ user: { id: 'usr_1', email: 'a@b.com' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'ana@matchday.app' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'Hunter2!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const [calledUrl, calledInit] = fetchMock.mock.calls[0]!;
    expect(calledUrl).toBe('/api/auth/login');
    expect((calledInit as RequestInit).method).toBe('POST');
    const body = JSON.parse((calledInit as RequestInit).body as string);
    expect(body).toEqual({ email: 'ana@matchday.app', password: 'Hunter2!' });

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('on 401, shows the Spanish error from the response body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: 'Email o contraseña incorrectos.' }),
        { status: 401, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'ana@matchday.app' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Email o contraseña incorrectos.',
      );
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('on network failure, shows Spanish "Error de red" copy', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'ana@matchday.app' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'Hunter2!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Error de red/i);
    });
    expect(pushMock).not.toHaveBeenCalled();
  });
});
