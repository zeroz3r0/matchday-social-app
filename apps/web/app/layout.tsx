/**
 * Root layout — RSC, Spanish lang.
 *
 * Per spec REQ-WP-7 every public page MUST be in Spanish; the `<html>` tag
 * declares `lang="es"` so screen readers + browser UI behave correctly.
 *
 * Real metadata, fonts, providers, and global navigation come in Phase 4
 * (see tasks T-WP-4.* in observation #34). This file is the minimum needed
 * for `next dev` and `next build` to succeed in Phase 1.
 */
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Matchday',
  description: 'Red social deportiva para gestionar partidos, ligas y torneos de fútbol amateur.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
