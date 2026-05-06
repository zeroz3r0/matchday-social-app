import type { NextConfig } from 'next';

/**
 * Next.js 15 config for @matchday/web.
 *
 * Decisions (per design #33 §2):
 * - NO `transpilePackages` for `@matchday/shared` — the package ships built
 *   `dist/` and is consumed via the workspace symlink (REQ-WA-3).
 * - `reactStrictMode: true` — surface React 19 issues early in dev.
 * - `experimental.typedRoutes` — low-risk DX win for typed `<Link>` hrefs.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Promoted out of `experimental` in Next 15.5+.
  typedRoutes: true,
};

export default nextConfig;
