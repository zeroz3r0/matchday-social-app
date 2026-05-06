# @matchday/web

Next.js 15 (App Router, RSC) web app for Matchday — Spanish-first sports social network for amateur football.

> **Status**: Phase 1 bootstrap (workspace skeleton + 5 shadcn components + Vitest). Real pages, BFF auth, and production deploy land in Phases 3 and 4 of the `web-bootstrap` change.

## Stack

| Layer        | Choice                                               |
| ------------ | ---------------------------------------------------- |
| Framework    | Next 15 (App Router, RSC)                            |
| Runtime      | React 19.2.0                                         |
| Styling      | Tailwind v4 (CSS-first config) + shadcn-ui (neutral) |
| Components   | Button, Card, Input, Label, Form (initial set)       |
| Tests        | Vitest 4 + @testing-library/react + happy-dom        |
| Type checker | TS 5.x strict (extends `tsconfig.base.json`)         |
| Lint         | `next lint` (web-scoped) + root ESLint               |

The workspace consumes `@matchday/shared` via the npm-workspaces symlink — `transpilePackages` is intentionally **not** used (REQ-WA-3 in the spec).

## Conventions (non-negotiable)

### 1. Spanish copy

All user-visible strings are in **Spanish** (Rioplatense or neutral). shadcn-ui ships English defaults; whenever you instantiate a primitive that exposes copy (placeholders, button labels, validation messages), you MUST override it. Dynamic API errors get translated through `lib/spanish-errors.ts` (added in Phase 3).

### 2. React 19 conventions — NO `useCallback`, `useMemo`, or `forwardRef`

Project rule: NEW components must NOT use these. React 19 + the React Compiler handle memoization automatically, and `ref` is forwardable as a regular prop. Existing shadcn templates have already been adapted to the ref-as-prop pattern.

### 3. Server Components first

Default every component to a server component. Add `'use client'` only when you need: state, effects, browser APIs, event handlers other than `<form action>`. RSC is the win — don't undo it.

### 4. Strict TDD on `apps/web`

This workspace follows the same TDD discipline as `apps/api` and `packages/shared` (see project [`testing-capabilities`](../../README.md#testing) cache):

- A **RED commit** lands BEFORE its **GREEN commit**.
- The RED commit's tests must FAIL when run; the GREEN commit makes them pass.
- Each task with code logic gets at least 2 test cases (happy path + edge) — see strict-tdd.md "Triangulation".
- Smoke tests (just-renders, no behavioral assertion) do NOT count as TDD coverage.

### 5. `predev` rebuilds `@matchday/shared`

The root scripts wrap web commands so shared rebuilds first:

```bash
npm run web:dev    # = shared:build && next dev -p 3001
npm run web:build  # = shared:build && next build
```

Run `npm run web:dev` from the repo root, not from `apps/web/` directly, unless you've already built shared in this session. Otherwise you'll hit "Cannot find module '@matchday/shared'".

## Local dev

```bash
# From the repo root, with Node 20:
nvm use
npm install               # one-time per machine
npm run web:dev           # http://localhost:3001
```

## Tests

```bash
npm run test:web          # Vitest, full web suite
npm run web:test          # alias of the above
```

Tests live in:

- `apps/web/tests/**/*.test.{ts,tsx}` — colocated by domain (`tests/lib/cn.test.ts`).
- `apps/web/lib/**/*.test.ts` and `apps/web/app/**/*.test.tsx` — Phase 3+4 will colocate route-handler / page tests next to the source.

## Build + production preview

```bash
npm run web:build         # produces apps/web/.next/
npm run web:start         # serves the built app on :3001
```

## Env vars

`.env.local` is gitignored. Copy `.env.example` to `.env.local` and fill in:

- `API_BASE_URL` — server-side URL of the upstream `apps/api` (e.g. `http://localhost:3000`).
- `NEXT_PUBLIC_SITE_URL` — public URL of the web app (used for canonical links + OG metadata).

In production these are set in the Vercel project, not committed.

## Vercel deploy notes (Phase 4)

- Vercel project Root Directory = `apps/web`.
- Build Command: Vercel auto-detects Next.js — leave blank.
- Install Command: `npm ci` from repo root.
- **Preview deployments hit the production API by default** (R-design-4). If a PR's tests mutate auth or competitions, they touch prod data. Until per-branch `API_BASE_URL` overrides land, treat preview mutations as production mutations.

## CI lanes (visible on every PR)

Three parallel lanes run in `.github/workflows/ci.yml`:

| Lane                     | Runs                                                              |
| ------------------------ | ----------------------------------------------------------------- |
| `web-test`               | `prisma generate` + `shared:build` + `vitest run`                 |
| `web-build`              | `prisma generate` + `shared:build` + `next build`                 |
| `web-lint-and-typecheck` | `prisma generate` + `shared:build` + `next lint` + `tsc --noEmit` |

The 196-warning ESLint baseline tracked in `apps/api` + `apps/mobile` does NOT include `apps/web` — new web warnings are accepted in Phase 1 but should be minimized.

## Where things go

```
apps/web/
├── app/                   # App Router pages, layouts, route handlers
│   ├── layout.tsx         # RSC root (lang="es", globals.css)
│   ├── page.tsx           # Phase 1 placeholder; real landing in T-WP-4.4
│   └── globals.css        # Tailwind v4 + 6 theme tokens
├── components/
│   └── ui/                # shadcn primitives (do not edit; regenerate via shadcn CLI when upgrading)
├── lib/
│   └── cn.ts              # clsx + tailwind-merge helper
├── tests/                 # Vitest setup + smoke + cross-cutting unit tests
└── public/                # static assets (none yet)
```

## Phase roadmap (engram observation #34)

1. ✅ **Phase 1**: workspace bootstrap + CI lanes (this PR).
2. ⏳ **Phase 2**: API production deploy on Fly + Neon (no web work).
3. ⏳ **Phase 3**: BFF auth route handlers (`/api/auth/{login,register,logout,me}`) + `lib/auth.ts`.
4. ⏳ **Phase 4**: public pages (`/`, `/login`, `/registro`, `/competiciones`, `/competiciones/[id]`) + Vercel deploy + DNS cutover.
