/**
 * RED — tests for `<Header />` server component.
 *
 * Spec context: orchestrator brief — header reads `getSession()`, shows
 * different nav for logged-in vs anonymous users. Always shows brand
 * "Matchday" link to "/" and "Competiciones" link.
 *
 * Behavior under test:
 *   - Anonymous (getSession → null): brand link, "Competiciones" link,
 *     "Iniciar sesión" link, "Crear cuenta" link.
 *   - Logged-in (getSession → Session): brand link, "Competiciones" link,
 *     user nickname/email visible, "Cerrar sesión" button.
 *
 * Server components are async; we render the resolved JSX returned by
 * the component (Next 15 RSC).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock the auth module BEFORE importing the component.
vi.mock('@/lib/auth', () => ({
  SESSION_COOKIE_NAME: 'matchday_session',
  getSession: vi.fn(),
}));

import { getSession } from '@/lib/auth';
import { Header } from '@/components/header';

const getSessionMock = vi.mocked(getSession);

beforeEach(() => {
  getSessionMock.mockReset();
});

async function renderAsync(node: Promise<React.ReactElement>) {
  const resolved = await node;
  return render(resolved);
}

describe('<Header /> — anonymous', () => {
  it('renders brand "Matchday" link to /', async () => {
    getSessionMock.mockResolvedValue(null);
    await renderAsync(Header());
    const brand = screen.getByRole('link', { name: 'Matchday' });
    expect(brand).toHaveAttribute('href', '/');
  });

  it('renders "Competiciones" nav link to /competiciones', async () => {
    getSessionMock.mockResolvedValue(null);
    await renderAsync(Header());
    const link = screen.getByRole('link', { name: 'Competiciones' });
    expect(link).toHaveAttribute('href', '/competiciones');
  });

  it('renders "Iniciar sesión" + "Crear cuenta" CTAs when no session', async () => {
    getSessionMock.mockResolvedValue(null);
    await renderAsync(Header());
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute(
      'href',
      '/login',
    );
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute(
      'href',
      '/registro',
    );
  });

  it('does NOT render "Cerrar sesión" when no session', async () => {
    getSessionMock.mockResolvedValue(null);
    await renderAsync(Header());
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).not.toBeInTheDocument();
  });
});

describe('<Header /> — logged-in', () => {
  it('renders user email + "Cerrar sesión" button when session exists', async () => {
    getSessionMock.mockResolvedValue({
      userId: 'usr_1',
      email: 'ana@matchday.app',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    await renderAsync(Header());
    expect(screen.getByText('ana@matchday.app')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
  });

  it('does NOT render "Iniciar sesión" / "Crear cuenta" when logged-in', async () => {
    getSessionMock.mockResolvedValue({
      userId: 'usr_1',
      email: 'ana@matchday.app',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    await renderAsync(Header());
    expect(screen.queryByRole('link', { name: 'Iniciar sesión' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Crear cuenta' })).not.toBeInTheDocument();
  });

  it('always renders the brand + Competiciones link regardless of auth state', async () => {
    getSessionMock.mockResolvedValue({
      userId: 'usr_1',
      email: 'ana@matchday.app',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    await renderAsync(Header());
    expect(screen.getByRole('link', { name: 'Matchday' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Competiciones' })).toHaveAttribute(
      'href',
      '/competiciones',
    );
  });
});
