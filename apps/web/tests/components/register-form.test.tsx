/**
 * RED — tests for `<RegisterForm>` client component.
 *
 * Spec: REQ-WP-4, REQ-WP-7. Form posts to `/api/auth/register`.
 *
 * Behavior under test:
 *   - Spanish labels: "Email", "Contraseña", "Apodo", "Posición", submit
 *     button "Crear cuenta".
 *   - Includes the legal acceptance fields (ToS / Privacy) per the API
 *     contract — surfaced as a single checkbox "Acepto los Términos y la
 *     Política de Privacidad."
 *   - Happy path: successful POST → router.push('/dashboard').
 *   - 409 EMAIL_TAKEN → Spanish error visible.
 *   - Network failure → "Error de red" Spanish copy.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import { RegisterForm } from '@/components/auth/register-form';

const VERSIONS = { tosVersion: 'v1', privacyVersion: 'v1' };

beforeEach(() => {
  pushMock.mockReset();
  vi.unstubAllGlobals();
});

function fillValidForm() {
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'nuevo@matchday.app' },
  });
  fireEvent.change(screen.getByLabelText('Contraseña'), {
    target: { value: 'Hunter2!secure' },
  });
  fireEvent.change(screen.getByLabelText('Apodo'), {
    target: { value: 'nuevo_player' },
  });
  fireEvent.change(screen.getByLabelText('Posición'), {
    target: { value: 'MIDFIELDER' },
  });
  fireEvent.click(screen.getByLabelText(/Acepto los Términos/));
}

describe('<RegisterForm>', () => {
  it('renders Spanish labels and submit button', () => {
    render(<RegisterForm {...VERSIONS} />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByLabelText('Apodo')).toBeInTheDocument();
    expect(screen.getByLabelText('Posición')).toBeInTheDocument();
    expect(screen.getByLabelText(/Acepto los Términos/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeInTheDocument();
  });

  it('on successful submit, navigates to /dashboard', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ user: { id: 'usr_1', email: 'nuevo@matchday.app' } }),
        { status: 201, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<RegisterForm {...VERSIONS} />);
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const [calledUrl, calledInit] = fetchMock.mock.calls[0]!;
    expect(calledUrl).toBe('/api/auth/register');
    expect((calledInit as RequestInit).method).toBe('POST');

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('on 409 EMAIL_TAKEN, surfaces the Spanish error', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: 'Este correo ya está registrado.' }),
        { status: 409, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<RegisterForm {...VERSIONS} />);
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Este correo ya está registrado.',
      );
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('on network failure, shows "Error de red" copy', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));

    render(<RegisterForm {...VERSIONS} />);
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Error de red/i);
    });
    expect(pushMock).not.toHaveBeenCalled();
  });
});
