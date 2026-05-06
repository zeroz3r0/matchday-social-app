# Security Policy

## Reporting a vulnerability

Please open a private security advisory via GitHub:
**https://github.com/zeroz3r0/matchday-social-app/security/advisories/new**

Do **not** open public issues for security reports. We aim to acknowledge new
advisories within 72 hours.

---

## Supply chain — `npm audit` policy

CI runs `npm audit --audit-level=high` after `npm ci` and **fails the build on
any high or critical vulnerability** at the root workspace (see
`.github/workflows/ci.yml`). Moderate-and-below advisories do not block merges
but are tracked.

The current accepted-risk moderates at HEAD are documented in
`.sdd/follow-ups/post-sprint1-audit.md`.

---

## Root `overrides` — syntax notes

The root `package.json` contains an `overrides` block used to pin transitive
dependencies that surfaced in `npm audit`. The choice of override syntax for
each entry is **deliberate**, because npm 11 + npm workspaces treats the three
override forms differently:

```json
"overrides": {
  "svix": "^1.92.2",
  "xcode": { "uuid": "^14" },
  "postcss@<8.5.10": "^8.5.10"
}
```

| Entry             | Form                 | Why this form                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `svix`            | **Flat** (top-level) | npm 11 silently ignores nested overrides for workspace-child deps on incremental install. The chain `apps/api → resend → svix` is two levels deep across a workspace boundary, where the nested form `"resend": { "svix": "..." }` did **not** apply. The flat form replaces every `svix` install in the tree — acceptable here because `resend` is currently the only direct consumer. If a second consumer ever pins a different range, switch to a per-parent nested override and verify with `npm ls svix`. |
| `xcode > uuid`    | **Nested**           | Single-hop transitive (`apps/mobile → xcode → uuid`). One-level chains within a workspace work reliably with the nested form. Verified applied via `npm ls uuid`.                                                                                                                                                                                                                                                                                                                                               |
| `postcss@<8.5.10` | **Range-scoped**     | Precise: only `postcss` resolutions matching `<8.5.10` get rewritten. Dependencies that already pull a safe `postcss` version are untouched, minimizing blast radius. Use this form whenever the advisory has a clear "fixed in" version.                                                                                                                                                                                                                                                                       |

### Adding a new override

1. Identify the consumer chain (`npm ls <pkg>` from the workspace root).
2. Pick the most precise form that works:
   - **Range-scoped** if there's a clear minimum safe version → preferred.
   - **Nested** if the chain is one level deep and stays inside one workspace.
   - **Flat** as fallback for cross-workspace chains where nested fails.
3. Force re-resolution: `rm package-lock.json && npm install`.
   Incremental install will silently miss new overrides.
4. Verify with `npm ls <pkg>` and `npm audit`.
5. Document the choice with one line in the table above (form + why).

`npm ls` will report overridden versions as `invalid` against the parent's
declared range. **This is expected behavior, not an error** — it's how npm
signals that an override took effect.

### Reference

- Discovery: `.sdd/discoveries/npm-overrides-workspaces.md`
- Source change: PR #12 (`chore(security): post-Sprint-1 dependency hardening`)
- Spec: `.sdd/active-specs/cicd.md`
