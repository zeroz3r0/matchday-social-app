# Project Context — matchday-social-app

> **topic_key**: `sdd-init/matchday-social-app` (+ `sdd/matchday-social-app/testing-capabilities` + `skill-registry`)
> **type**: `architecture` / `config`
> **status**: `active`
> **last synced**: 2026-04-29 from merge `354957b` (PR #12)

Red social deportiva para gestionar partidos, ligas y torneos de fútbol amateur (F5, F7, F11).

---

## Stack

Monorepo via **npm workspaces**. Node 20 (`.nvmrc`).

| Workspace         | Stack                                                                |
| ----------------- | -------------------------------------------------------------------- |
| `apps/api`        | Node + Express + TypeScript + Prisma 5 + PostgreSQL/PostGIS + Vitest |
| `apps/mobile`     | React Native 0.73 + Expo 50 (SDK 55) + React Navigation 6            |
| `packages/shared` | TypeScript shared types/constants/validations + Vitest               |

Auxiliary: JWT (jsonwebtoken) + bcrypt 6, Zod validation, Expo Push (was FCM), Google Maps + react-native-maps, node-cron 4.

TypeScript **strict**. ESLint + Prettier across the monorepo.

---

## Conventions (enforced)

### Code

- **TypeScript strict**. No new `any` in production paths. Existing `apps/mobile/src/services/mockApi.ts` is accepted tech debt — do not extend it.
- **No `useCallback` / `useMemo` / `forwardRef`** in NEW mobile components (intentional convention).
- **All user-facing UI strings in Spanish**.
- **Zod** for runtime validation, **Prisma** for DB access.

### Testing

- **Strict TDD on backend (`apps/api`) and `packages/shared`**: RED commit before GREEN, evidence in git log. Applies to **new behavior**. Pure dep bumps with no behavioral delta use "tests stay green across the bump" as evidence — RED-before-GREEN is not required for those.
- **Mobile has no test runner** — strict TDD does not apply there, but `any` and other code rules still do. Mobile test coverage is accepted tech debt.

### Git / PRs

- **Conventional commits** (lowercase verbs, no emoji): `feat:`, `chore:`, `fix:`, `test:`, `refactor:`, `docs:`, `ci:`.
- **Squash-merge** with `(#N)` suffix in the squash commit message.
- **Commit author**: `zeroz3r0 <119344894+zeroz3r0@users.noreply.github.com>`.
- **Never** add `Co-Authored-By` or AI attribution lines to commits or PR bodies.
- **Never** run `git config` or rewrite history unless explicitly asked.
- `.engram/` and `.atl/` are gitignored — those are per-machine. `.sdd/` (this folder) is committed.

### SDD

- Persistence backend: **Engram** locally, **`.sdd/`** as the cross-machine source of truth.
- Execution mode: **automatic** (sub-agents do not pause for confirmation between phases).
- Re-running a phase **overwrites** the previous artifact in Engram (topic_key upsert) — in `.sdd/`, the file is overwritten and git history preserves prior versions.

---

## Test commands & baselines

| Workspace         | Command                        | Baseline                                     |
| ----------------- | ------------------------------ | -------------------------------------------- |
| `packages/shared` | `npm run test:shared`          | 53/53 (Vitest)                               |
| `apps/api`        | `npm run test:api`             | 130/130 (Vitest with mocks — no DB needed)   |
| `apps/mobile`     | —                              | N/A (no test runner configured)              |
| Lint              | `npm run lint`                 | 0 errors, **196 warnings** (= max threshold) |
| Format            | `npm run format:check`         | clean                                        |
| Typecheck         | `npm run typecheck`            | 3 workspaces clean (`tsc --noEmit` ×3)       |
| Audit gate (CI)   | `npm audit --audit-level=high` | exit 0 (master @ `354957b`)                  |

Per-commit gate (apply phase): `npm install && npm run shared:build && npm run test:shared && npm run test:api && npm run typecheck`.

**Lint baseline policy**: warning count must not increase. 196 is the cap, not the target.

**No live DB required** — API tests use mocks. Don't provision PostgreSQL during apply/verify.

---

## CI

`.github/workflows/ci.yml` includes:

1. `npm ci`
2. **`npm audit --audit-level=high`** (hard fail on regressions, no `continue-on-error`) — added in PR #12
3. `prisma generate`
4. test, lint-and-typecheck, api-build jobs

The audit gate is at `high+`. Tightening to `moderate` is a separate proposal (see `follow-ups/post-sprint1-audit.md` item 3).

---

## Skill registry (autoload triggers)

Internal SDD skills used in this project:

| Skill          | Trigger                                                     |
| -------------- | ----------------------------------------------------------- |
| `sdd-explore`  | Investigating an idea before committing to a change         |
| `sdd-propose`  | Drafting a change proposal (intent, scope, approach)        |
| `sdd-spec`     | Writing/updating delta specs (Given/When/Then + RFC 2119)   |
| `sdd-design`   | Architecture decisions, sequence diagrams, technical design |
| `sdd-tasks`    | Breaking a change into a hierarchical task checklist        |
| `sdd-apply`    | Implementing tasks with TDD discipline                      |
| `sdd-verify`   | Validating impl matches spec/design/tasks                   |
| `sdd-archive`  | Syncing delta into main spec and archiving completed change |
| `branch-pr`    | Creating PRs (issue-first enforcement)                      |
| `judgment-day` | Parallel adversarial review (two blind judges)              |

`go-testing` is **not applicable** here — this is a TS project.

---

## Known operational gotchas (per-machine)

1. **Engram cwd-resolution**: on a machine where the engram MCP runs from a parent dir of multiple repos, observations get auto-routed to the wrong project at write time even when you pass `project: matchday-social-app` explicitly. Workaround: always run engram-touching commands from inside `C:\…\matchday-social-app\` (or your local equivalent), AND use unique `topic_key`s — cross-project search via `mem_search` recovers them. **This `.sdd/` folder eliminates the cross-machine consequences of this bug.**
2. **`gh` CLI**: not always installed by default. `winget install GitHub.cli` (Windows) / `brew install gh` (macOS) / `apt install gh` (Linux). Auth via the cached token in Git Credential Manager works (`GH_TOKEN=$(git credential fill ...)`).
3. **Node version drift**: `.nvmrc` says 20. Node 24 has been observed to work without breakage on this codebase (verified on master `2100e7f` and `354957b`).
4. **bcrypt 6 native binary on Windows local dev**: prebuilds exist for Linux/macOS/Windows on Node 18/20/22. If `npm install` doesn't pick up a binary, run `npm rebuild bcrypt` or use WSL. CI is Linux, never affected.
5. **npm 11 + workspaces + nested overrides**: incremental install can silently ignore nested overrides for workspace-child deps. Fix: `rm package-lock.json && npm install`. Prefer flat or range-scoped override syntax for workspace-child deps. See `discoveries/npm-overrides-workspaces.md`.

---

## Where past changes live

- **Closed Sprint 1** is fully described by PRs #1–#12 (squash commits visible on master).
- **Active specs** for capabilities touched by closed changes: `.sdd/active-specs/`.
- **Detailed change archives** (explore + proposal + spec + design + tasks + apply + verify): `.sdd/archive/<change-name>/`.
- **Reusable lessons across changes**: `.sdd/discoveries/`.
- **Pending follow-ups not yet opened as issues**: `.sdd/follow-ups/`.
