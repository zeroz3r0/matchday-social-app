# Capability Spec: cron-scheduling

> **topic_key**: `spec/cron-scheduling`
> **type**: `architecture`
> **status**: `active`
> **last synced**: 2026-04-29 from `354957b` (PR #12)

## Purpose

Time-based triggers for the API (match reminders, MVP auto-close, voting auto-close, stats auto-confirm, legal data cleanup).

Behavioral specs for what each schedule does live in earlier change artifacts (PRs #1–#11). This entry tracks **library-compatibility invariants** for the underlying cron runner.

## Compatibility Invariants

### Requirement: All existing schedules continue to fire across node-cron major bumps

Every cron schedule registered in `apps/api/src/jobs/scheduler.ts` and `apps/api/src/jobs/legalCronJobs.ts` MUST continue to fire at its declared expression with the same handler across node-cron major version bumps. The public surface used (`cron.schedule(expr, fn)` and the `ScheduledTask` type) MUST resolve under the current major.

As of `354957b` the lockfile resolves to `node-cron@^4.2.1`.

### Active schedules (registered at app boot)

| File:Line                                | Expression     | Handler                      |
| ---------------------------------------- | -------------- | ---------------------------- |
| `apps/api/src/jobs/legalCronJobs.ts:95`  | `0 3 * * *`    | hardDelete (daily 03:00 UTC) |
| `apps/api/src/jobs/legalCronJobs.ts:103` | `0 * * * *`    | exportSweep (hourly)         |
| `apps/api/src/jobs/scheduler.ts:94`      | `*/5 * * * *`  | auto-confirm stats           |
| `apps/api/src/jobs/scheduler.ts:115`     | `*/5 * * * *`  | auto-close voting + MVP      |
| `apps/api/src/jobs/scheduler.ts:231`     | `*/30 * * * *` | T-2h match reminder          |

#### Scenario: T-2h match reminder cron fires on schedule

- GIVEN the T-2h reminder schedule is registered at app boot under the current node-cron major
- WHEN its cron expression matches the current time
- THEN the registered handler is invoked exactly once per matching tick

#### Scenario: MVP auto-close cron fires on schedule

- GIVEN the MVP auto-close schedule is registered at app boot under the current node-cron major
- WHEN its cron expression matches the current time
- THEN the registered handler is invoked exactly once per matching tick

#### Scenario: Legal cleanup crons fire on schedule

- GIVEN the legal data cleanup schedules in `legalCronJobs.ts` are registered under the current node-cron major
- WHEN their cron expressions match the current time
- THEN each registered handler is invoked exactly once per matching tick
- AND the `ScheduledTask` type assigned at `legalCronJobs.ts` resolves at typecheck time

## Implementation notes

- `import cron, { ScheduledTask } from 'node-cron'` resolves under v4.
- v4 **auto-starts on `cron.schedule()`** (verified at `node_modules/node-cron/dist/cjs/node-cron.js`). Explicit `.start()` calls in `scheduler.ts:86-87` are idempotent no-ops; cleanup is tracked in follow-up #1 (`.sdd/follow-ups/post-sprint1-audit.md`).
- `{ scheduled: false }` TaskOption was removed when bumping to v4 (option dropped in v4 API).
- Tests register schedules behind `NODE_ENV !== 'test'` guards to avoid pollution.

## Change history

- `354957b` (PR #12, merged 2026-04-29) — invariant added when bumping node-cron 3 → 4. No behavior delta.
