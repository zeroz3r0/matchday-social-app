# Explore: post-Sprint-1 dependency security audit

> **topic_key**: `sdd/matchday-post-sprint1-audit/explore`
> **type**: `discovery`
> **status**: `archived`
> **last synced**: 2026-04-29 from `354957b` (PR #12)

Master @ `2100e7f` (HEAD, post-PR-#11). Read-only audit. No installs, no lockfile changes.

## Current State

`npm audit` at repo root: **19 vulnerabilities (0 critical, 2 high, 17 moderate, 0 low)** — confirms PR #11's claim "28 → 19; 0 critical, 2 high".

Per workspace (with `--workspace`):

- `apps/api`: **6** (4 mod, 2 high)
- `apps/mobile`: **14** (14 mod, 0 high)
- `packages/shared`: **0**

PR #11 deferred work — "archiver still pulls some transitive vulns" — is **OBSOLETE**. `archiver@7.0.1` is in the tree (`apps/api → archiver@7.0.1`) but does NOT appear in `npm audit`. No follow-up needed for archiver.

`firebase-admin` is fully gone from the tree (PR #7 cleanup).

## Affected Areas

**API (apps/api):**

- `apps/api/package.json` — `bcrypt ^5.1.1`, `node-cron ^3.0.3`, `resend ^6.12.2`
- `apps/api/src/routes/auth.ts`, `apps/api/src/services/passwordReset.ts` — `import bcrypt from 'bcrypt'` (real call sites)
- `apps/api/src/jobs/scheduler.ts`, `apps/api/src/jobs/legalCronJobs.ts` — `cron.schedule(expr, fn)` (5 call sites)
- `apps/api/src/__tests__/auth.test.ts`, `passwordReset.test.ts` — bcrypt test usage

**Mobile (apps/mobile):**

- `apps/mobile/package.json` — `@expo/ngrok ^4.1.3`, `expo ~55.0.15`, `react-native-markdown-display ^7.0.2`, `@react-native-community/datetimepicker 8.6.0`
- `apps/mobile/src/screens/LegalScreen.tsx` — only consumer of `react-native-markdown-display`

**CI:** `.github/workflows/ci.yml` — currently has NO `npm audit` gate.

## Vuln Inventory (master @ 2100e7f)

| Sev      | Package                                          | Top-level introducer                                                                   | Fix path upstream                                                                         |
| -------- | ------------------------------------------------ | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **high** | `tar <=7.5.10`                                   | `apps/api → bcrypt@5.1.1 → @mapbox/node-pre-gyp@1.0.11 → tar@6.2.1`                    | `tar` 6.x is **not** patched. `bcrypt@6` drops `@mapbox/node-pre-gyp` entirely.           |
| **high** | `@mapbox/node-pre-gyp <=1.0.11`                  | `apps/api → bcrypt@5.1.1`                                                              | Unmaintained. Bumping bcrypt to 6 removes it.                                             |
| mod      | `uuid <14.0.0`                                   | 4 chains: `node-cron`, `svix→resend`, `xcode→@expo/config-plugins→expo`, `@expo/ngrok` | `uuid@14` is the only fixed line.                                                         |
| mod      | `node-cron 3.0.2-3.0.3`                          | `apps/api` direct                                                                      | `node-cron@4.2.1` (major) drops uuid (zero deps).                                         |
| mod      | `svix 1.68.0-1.91.1`                             | `apps/api → resend@6.12.2 → svix@1.90.0`                                               | `svix@1.92.2` published, outside vuln range. Override fixes without bumping resend.       |
| mod      | `resend >=6.2.0-canary.0`                        | `apps/api` direct                                                                      | resend@6.12.2 still bundles vulnerable svix. Override on svix is the clean path.          |
| mod      | `xcode >=0.9.2`                                  | `apps/mobile → expo@55 → @expo/config-plugins@55.0.8 → xcode@3.0.1`                    | xcode unmaintained. Override `xcode > uuid` to ^14. Dev-only.                             |
| mod      | `@expo/ngrok *`                                  | `apps/mobile` direct                                                                   | Dev-only (`expo start --tunnel`). Drop or override.                                       |
| mod      | `markdown-it <12.3.2` ReDoS                      | `apps/mobile → react-native-markdown-display@7.0.2 → markdown-it@10.0.0`               | RNMD pins markdown-it@^10. Only renders trusted internal content.                         |
| mod      | `react-native-markdown-display *`                | `apps/mobile` direct                                                                   | No fix upstream.                                                                          |
| mod      | `@react-native-community/datetimepicker >=8.2.0` | `apps/mobile` direct                                                                   | Audit "fix" = downgrade → REGRESSION. Likely false positive.                              |
| mod      | `postcss <8.5.10` XSS                            | `apps/mobile → expo → @expo/metro-config@55.0.17 → postcss@8.4.49`                     | Override `postcss → ^8.5.10`. Build-time only.                                            |
| mod      | 7 Expo internals                                 | `apps/mobile → expo@55.0.17`                                                           | "fixAvailable: expo@49.0.23 (major)" is BACKWARDS. Audit noise / unfixable until Expo 56. |

## Triaged Options per Top-3 High-Priority Chains

### Chain 1: `tar` + `@mapbox/node-pre-gyp` (BOTH highs — single fix)

| Option | Action                            | Verdict                                                                                                                                                              |
| ------ | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A      | `npm audit fix`                   | Won't work — bcrypt 5→6 is major.                                                                                                                                    |
| B      | `overrides: { tar: "^7.5.11" }`   | `@mapbox/node-pre-gyp@1.0.11` declares `tar@^6.4.0`; tar v7 has breaking changes that likely break bcrypt postinstall. **Risky.**                                    |
| **C**  | **Bump `bcrypt` ^5.1.1 → ^6.0.0** | **Recommended.** Removes both highs. bcrypt 6 uses `node-addon-api` + `node-gyp-build`. API identical. Engines: `node >= 18` (we're on 20). Effort: **S** (~30 min). |
| D      | Accept                            | Vuln is install-time tar extraction. Doesn't help with CI gate.                                                                                                      |

### Chain 2: `node-cron` (uuid transitive)

| Option | Action                                     | Verdict                                                                                                                               |
| ------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| A      | `npm audit fix --force`                    | Forces same node-cron 4 bump (major).                                                                                                 |
| B      | `overrides: { "node-cron > uuid": "^14" }` | uuid 8→14 has API differences. Untested.                                                                                              |
| **C**  | **Bump `node-cron` ^3.0.3 → ^4.2.1**       | **Recommended.** Zero deps. `cron.schedule(expr, fn)` preserved. Verify `ScheduledTask` type still exported. Effort: **S** (~30 min). |

### Chain 3: `svix` / `resend` (uuid transitive)

| Option | Action                                          | Verdict                                                                 |
| ------ | ----------------------------------------------- | ----------------------------------------------------------------------- |
| A      | `npm audit fix`                                 | Suggests downgrading resend → REGRESSION.                               |
| **B**  | **`overrides: { "resend > svix": "^1.92.2" }`** | **Recommended.** svix@1.92.2 outside vuln range. Smoke test in PR body. |
| C      | Replace resend                                  | High effort, out of scope.                                              |

## Lower-Priority

- **`xcode → uuid`**: Override `"xcode > uuid": "^14"`. Dev-only. **Recommended.**
- **`@expo/ngrok`**: Dev-only (`expo start --tunnel`). Investigate usage; if unused → drop the dep.
- **`postcss`**: Override `"@expo/metro-config > postcss": "^8.5.10"`. Build-time only. **Recommended.**
- **`markdown-it` + `react-native-markdown-display`**: ReDoS in markdown parser. Used only in `LegalScreen.tsx` to render OUR OWN ToS / Privacy markdown — **not exploitable in current usage**. Option D (accept) justified.
- **7 Expo internals + datetimepicker**: audit "fixes" are downgrades to Expo 49. **Likely false positives**. Option D + allowlist. Re-audit after Expo SDK 56.

## Recommendation

**Single-PR scope** "hardening pass post-Sprint 1" — should knock 19 → ~3-4:

1. Bump `bcrypt` ^5.1.1 → ^6.0.0 (kills both highs)
2. Bump `node-cron` ^3.0.3 → ^4.2.1 (drops uuid + transitives)
3. Add root `package.json` `overrides`: svix, xcode>uuid, postcss
4. Document accepted risks in PR body
5. Add CI audit gate `npm audit --audit-level=high`

**Total effort estimate**: **2-3h**.

## Open Questions (resolved by orchestrator pre-proposal)

1. ✅ TDD on dep bumps → "tests stay green across the bump" is acceptable evidence
2. ✅ `@expo/ngrok` usage → investigated in proposal phase: zero usages → drop the dep
3. ✅ CI audit gate severity → `high` (clean today after fixes)
4. ✅ Risk doc placement → PR body audit table (existing convention)
5. ✅ resend → svix override → acceptable, smoke-tested via password-reset email

## Out-of-Scope Flags (separate proposals)

- Expo SDK 56 upgrade (resolves 7+ Expo-internal vulns naturally)
- Replacing `react-native-markdown-display` (locked to markdown-it@10; urgent only if user-supplied markdown is rendered)
- `archiver` removal — obsolete (clean per current audit)
- Replacing `bcrypt` with `argon2` / `@node-rs/bcrypt` (perf/maintenance, not security)
- Dependabot / Renovate setup

## Risks (carried forward)

- bcrypt 6 prebuilds: Linux + macOS confirmed; Windows dev binaries need verification (CI is Linux — safe)
- node-cron 4 type export: `ScheduledTask` used in `legalCronJobs.ts` — verify still exported
- svix override compat in resend's webhook signing surface
- npm overrides + workspaces edge cases
- Lockfile churn making review harder
