/**
 * Logout button — client component.
 *
 * POSTs to `/api/auth/logout` (BFF clears the cookie) and routes the user
 * back to `/`. Error path: optimistic — on network failure we still
 * navigate home; the cookie will be cleared on the next protected
 * request anyway.
 */
'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';

export function LogoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch {
        // Swallow — navigation below still applies.
      }
      router.push('/');
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={pending}
    >
      {pending ? 'Cerrando sesión…' : 'Cerrar sesión'}
    </Button>
  );
}
