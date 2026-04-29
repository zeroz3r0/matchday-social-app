# `.sdd/` — Spec-Driven Development context (multi-machine sync)

> **Why this folder exists.** SDD artifacts (proposals, specs, designs, tasks, verify reports, follow-ups, discoveries) live in **Engram**, which is a per-machine local SQLite DB. Engram does NOT sync across machines. Without this folder, switching computers means re-bootstrapping context from PR bodies + code.
>
> This folder is the **canonical, machine-portable mirror** of the project's SDD context. It is committed to git and travels with the repo.

---

## Authority

**Source of truth precedence (read in this order on a fresh machine):**

1. This folder (`.sdd/`) — committed, always current as of the last merged commit
2. PR bodies on GitHub — committed history, never rewritten
3. Engram local DB — only valid for the machine that wrote it; treat as cache, never as source of truth across machines

When you start work on a new machine, **`.sdd/` is what you read**. You then optionally hydrate it into your local Engram for faster lookup during the session, but `.sdd/` remains the authority.

---

## Layout

```
.sdd/
├── README.md                            # this file
├── project-context.md                   # stack, conventions, testing capabilities, skill registry
├── active-specs/                        # source-of-truth specs per capability (current state)
│   ├── auth.md
│   ├── cicd.md
│   └── cron-scheduling.md
├── discoveries/                         # reusable lessons (independent of any single change)
│   └── npm-overrides-workspaces.md
├── follow-ups/                          # work identified but not yet planned/opened
│   └── post-sprint1-audit.md
├── archive/                             # closed changes (immutable trail)
│   └── post-sprint1-audit-hardening/
│       ├── 00-archive-report.md         # entry point — read this first
│       ├── 10-explore.md
│       ├── 20-proposal.md
│       ├── 30-spec.md
│       ├── 40-design.md
│       ├── 50-tasks.md
│       ├── 60-apply-progress.md
│       └── 70-verify-report.md
└── sessions/                            # narrative session summaries
    └── 2026-04-29-recovery-and-pr11-12.md
```

---

## Protocol per machine

### First time on a machine

1. `git pull` — get the latest `.sdd/`
2. Read `project-context.md` end to end
3. Skim `active-specs/` (each is short — only invariants + new requirements)
4. Skim the most recent session under `sessions/` to know the immediate "where were we"
5. Skim `follow-ups/*.md` for known unstarted work
6. (Optional) Hydrate Engram: open each `.md` and `mem_save` it under the original `topic_key` annotated at the top of every file. This is OPTIONAL. The files themselves are sufficient context.

### During a session

- New SDD artifacts go to Engram as usual via the SDD subagents.
- **Before ending the session, mirror the new artifacts to `.sdd/`** (see "Sync rules" below). Commit and push.
- The PR for the change itself can include the `.sdd/` updates in the same commit or a follow-up commit — either is fine.

### Ending a change (post-merge)

1. The `sdd-archive` subagent (or you manually) writes `archive-report` to Engram.
2. Mirror to `.sdd/archive/<change-name>/00-archive-report.md` plus all phase artifacts.
3. Move/update any active spec deltas into `.sdd/active-specs/<capability>.md` (the archive report's "Spec sync" section tells you which capabilities to update).
4. Commit `.sdd/` updates. Convention: include them in the change's own PR if possible; otherwise a follow-up `chore(sdd): mirror <change-name> archive` PR.

---

## Sync rules (Engram ↔ `.sdd/`)

| When you...                    | Do this                                                                                                                             |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Save an SDD artifact to Engram | Within the same session, write a matching file under `.sdd/` (path per the layout above).                                           |
| Update a topic_key (upsert)    | Overwrite the corresponding `.sdd/` file. The git history preserves the prior version.                                              |
| Archive a change               | Move the `.sdd/changes/<name>/` folder (if you used a working-folder convention) to `.sdd/archive/<name>/`. Add the archive report. |
| Add a discovery                | New file under `.sdd/discoveries/`. These rarely change.                                                                            |
| Add a follow-up                | Append to or create a file under `.sdd/follow-ups/`. Remove the entry once it's opened as an issue or change.                       |
| End the session                | Write a session summary under `.sdd/sessions/YYYY-MM-DD-<slug>.md`. Commit + push.                                                  |

---

## File header convention

Every `.sdd/` file starts with this YAML-ish block so you can map it back to Engram (and so future tools can re-import):

```markdown
> **topic_key**: `sdd/<change>/<phase>` or `spec/<capability>` or `discovery/<slug>`
> **type**: `architecture` | `discovery` | `decision` | `config` | `session_summary`
> **status**: `active` | `archived`
> **last synced**: YYYY-MM-DD from <merge SHA or session id>
```

---

## What does NOT belong here

- **Secrets** — never. Use `.env.example` and the existing env conventions.
- **Generated docs / API references** — those go to README, code comments, or dedicated `docs/` if added later.
- **Per-machine config** — that's `.atl/` and `.engram/` (both gitignored), or `.vscode/` user settings.
- **Behavioral specs already covered by tests** — only invariants and architectural decisions go in `active-specs/`. The tests are the executable spec.

---

## Provenance

This folder was bootstrapped 2026-04-29 from a fully-formed Engram session that completed PR #11 (push notifications) and PR #12 (post-Sprint-1 dependency hardening). The original Engram observations were misfiled into project `minibrawlroyale` due to a cwd-resolution gotcha in the engram MCP — the filenames and content here are accurate; only the engram project label was wrong, which is exactly why this folder exists in the first place.
