# Discovery: npm overrides + workspaces — nested overrides may need lockfile regen

> **topic_key**: `discovery/npm-overrides-workspaces`
> **type**: `discovery`
> **status**: `active`
> **last synced**: 2026-04-29 from `354957b` (PR #12)

## What

In an npm workspaces monorepo, `overrides` declared in the root `package.json` may be silently ignored on incremental `npm install` for workspace-child deps. The fix: delete `package-lock.json` and run `npm install` to force fresh resolution.

## Why this surfaced

While bumping deps for the post-Sprint-1 hardening PR (#12), three overrides (`resend>svix`, `xcode>uuid`, `@expo/metro-config>postcss`) showed zero effect after `npm install` — the lockfile contained no `overrides` field, and `npm ls` showed the original (vulnerable) transitives. Audit count stayed unchanged.

## Where

`matchday-social-app/package.json` (root) under npm 11.11.0 + Node 24.

## Learned

- **Nested override syntax** `"parent": { "child": "^x.y.z" }` for workspace-child deps is **unreliable** on incremental install.
- **Flat overrides** (`"svix": "^1.92.2"`) work reliably but have broader blast radius.
- **Range-scoped overrides** (`"postcss@<8.5.10": "^8.5.10"`) work and are precise — only versions matching the range get rewritten.
- The `xcode > uuid` nested override DID apply because `xcode` is a transitive of the mobile workspace (one level deep). Two-or-more-level chains misbehave more often.
- After applying overrides, `npm ls postcss svix uuid` will report the overridden versions as `invalid` (vs the parent's declared range). This is **expected** behavior, not an error.
- Always verify with `npm audit --json` AND `npm ls <pkg>` after adding overrides; don't trust audit numbers alone since other deps may shift in semver-range drift.
- Workflow that worked: edit root `package.json` → `rm package-lock.json` → `npm install` → verify with `npm ls` and `npm audit`.

## Reference

Final shipped form in `matchday-social-app` (PR #12, commit `70205eb`):

```json
"overrides": {
  "svix": "^1.92.2",
  "xcode": { "uuid": "^14" },
  "postcss@<8.5.10": "^8.5.10"
}
```

`svix` flat (only `resend` consumes it today). `xcode>uuid` nested (worked). `postcss` range-scoped (only old versions get rewritten).
