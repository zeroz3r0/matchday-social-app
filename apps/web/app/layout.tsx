/**
 * Root layout — RSC, Spanish lang.
 *
 * Per spec REQ-WP-7 every public page MUST be in Spanish; the `<html>` tag
 * declares `lang="es"` so screen readers + browser UI behave correctly.
 *
 * The site `<Header>` is a server component that reads `getSession()` and
 * conditionally renders the logged-in/anonymous nav. It lives in the root
 * layout so every page (public + auth + dashboard) gets it for free.
 */
import type { Metadata } from 'next';

import './globals.css';
import { Header } from '@/components/header';

export const metadata: Metadata = {
  title: { default: 'Matchday', template: '%s | Matchday' },
  description: 'Red social deportiva para gestionar partidos, ligas y torneos de fútbol amateur.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)]">
        <Header />
        <div className="min-h-[calc(100vh-3.5rem)]">{children}</div>
      </body>
    </html>
  );
}
