# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

`tlm-claude-plugins` is a **Claude Code plugin that is also its own marketplace**. It ships no
application code — its "source" is prose and shell: skill definitions, a knowledge base, enforcement
hooks, and a config contract. Installed once, it makes Claude follow one house style for frontend code
(Next.js App/Page Router, React Native Expo/CLI, Next.js API + Prisma) and drive the surrounding
workflow (tickets, Figma, releases) the same way in every repo.

Both roles live in `.claude-plugin/`: `plugin.json` (the plugin manifest) and `marketplace.json` (the
self-hosted marketplace listing it). `source: "./"` in the marketplace means the repo root **is** the
plugin.

## The four layers — and why a rule lives in more than one

Understanding any change means knowing which layer owns it. A single hard rule (e.g. "navigate, don't
push") is deliberately expressed in up to three places, each with a different job:

> **Rules root.** All four layers are read from `<project>/.claude/tlm-plugin/` when that directory
> exists, else from `${CLAUDE_PLUGIN_ROOT}`. The first is a consuming project's committed, **live** copy
> of this plugin; the second is the installed plugin. `resolveRulesRoot()` in `hooks/lib/hook-io.mjs` is
> the executable form, and the installed hooks re-exec the vendored ones so enforcement follows the same
> order. Paths below are relative to that root.

| Layer | Path | Role | Length discipline |
|-------|------|------|-------------------|
| **Skills** | `skills/*/SKILL.md` | Orchestration prose Claude loads when a skill triggers. The *inline* short form of the most critical rules, so they hold **without a second file read**. | Must stay short — only CRITICAL rules go inline. |
| **Knowledge base** | `ai/**` | Deep reference, read **on demand** when a task needs the depth. Full rule + **why** (the failure it prevents) + ❌/✅ examples + exceptions. | Verbose is fine; this is where depth belongs. |
| **Hooks** | `hooks/*.mjs` | Mechanical enforcement. `lint-fe.mjs` re-checks the subset of hard rules that are pattern-detectable and feeds hits back to Claude; the installed hooks delegate to a project's vendored copies. | Only rules with a low false-positive rate. |
| **Config contract** | `setup/**` | The `tlm` config schema that skills read from a *consuming* project. Documentation, not live config. | — |

`tlm-fe-coding/SKILL.md` is the canonical example: STEP 2 is the shared base (every stack), STEP 3 the
per-stack hard rules, each ending in `→ ai/<stack>/…` pointers to the deep layer.

### Consequence for editing rules — keep the layers in sync

When you add or change a hard rule, propagate it across the layers it belongs to (this is what the
`tlm-rule-capture` skill formalizes):

1. **Deep rule → `ai/`** — `ai/shared-fe/` if cross-stack, else `ai/<stack>/06-hard-rules.md`. Match the
   neighbours' shape: rule, why, wrong/correct examples, exceptions. **Always include the reason** — the
   failure story is what makes a rule stick.
2. **Inline short form → the matching section of `skills/tlm-fe-coding/SKILL.md`** — *only* if it's critical
   enough to need to hold without a second read. Be strict; that file is useful only while it's short.
3. **Mechanical check → `hooks/lint-fe.mjs`** — only if it is reliably pattern-detectable (see the existing
   `scan` calls and their per-file exemptions). In a consuming project this lands in its vendored copy and
   takes effect immediately, because the installed hook delegates there.
4. **Checklist line → `ai/shared-fe/07-ai-workflow-integration.md` §9** if it's checkable.

A **CORRECTION** (feedback that contradicts an existing rule) is the case that gets missed: edit the
contradicting rule too, don't leave both versions standing.

## The skills

`tlm-fe-coding` is the **single entry point for all frontend coding** — it detects the stack (config →
auto-detect → ask), applies the shared `_modules/` base, then layers the stack's hard rules. STEP 1.5 is
the cross-repo gate: when the task touches another repo of the system it reads `.claude/ecosystem-map.md`
and opens the real contract there rather than inventing one. The rest
are workflow skills, tracker-agnostic (ClickUp / Jira / Linear / Azure DevOps / GitHub, resolved from
config):

- `tlm-project-setup` — scans missing config, one form, writes `.claude/settings.local.json`. Also: applies a
  handed-over **init doc** when there is one (PHASE 0.5, see below), offers the **Turborepo starter** on
  an empty repo (PHASE 0.8 → `ai/shared-fe/16-monorepo-turborepo.md`: `apps/*` + `packages/contracts` +
  `turbo.json`), installs
  the project's **live rules copy** (PHASE 1.5, see below), **registers the other repos of the system**
  (PHASE 1.6 → `ecosystem.mjs` → `.claude/ecosystem-map.md`), and scans the project's **own** rules/specs
  (`CLAUDE.md`, `.cursorrules`, `.claude/rules`, `openspec/`, lint/tsconfig), cataloguing them into
  `.claude/codebase-map.md` — the house rules **defer to an explicit project rule where they conflict**,
  never silently override it (persistent overrides go through `tlm-rule-capture`).
- `tlm-rule-capture` — corrective feedback → classify (NEW / GAP / CORRECTION / ONE-OFF) → ask → persist.
  A house rule is written into the project's **live rules copy** — in effect immediately — then
  **reviewed (`plugin-pr.mjs diff`) and shipped by PR** (see "Where the rules live" below).
- `tlm-figma-to-code` — Figma link → screen; **hard-stops** if the Framelink MCP is missing/unauthorized
  (never approximates a design from a frame name or screenshot).
- `tlm-ticket-workflow` — ticket → branch → plan → implement → sync.
- `tlm-ba-ticket` — BA/PO writing pass: requirement or bug described in chat → **one** ClickUp ticket
  following the team's task/bug templates (`tlm.tickets.baTemplates`). Fills the business sections
  (user story, description, reproduce steps, test scenarios); technical sections (codebase
  exploration, migration/database) stay as placeholders for the dev. Links related/parent tickets
  the user names, **never invents subtasks** — the ticket it creates is the single source of truth.
- `tlm-mobile-release-notes` — commit range → plain-language notes → Slack draft (mobile projects only).
- `tlm-deployment-checklist` — release check: tickets, services, migrations.
- `tlm-spec-driven` — drives **OpenSpec** (external `npx` CLI, needs Node ≥ 20.19) for spec-first work:
  bootstraps `openspec/` + `/opsx:*` commands, then runs propose → apply → sync → archive, enriching
  `design.md` onto the `_modules/` architecture. **Offered per ticket** (SessionStart hook detects
  `openspec/` and reminds Claude to ask); applied only if the user agrees, else the normal skills run.
  Every OpenSpec CLI command is announced first for transparency. Degrades to `tlm-fe-coding`, never a
  hard stop. Config: `tlm.specDriven` in `setup/tlm-config.reference.json`.

## The `tlm` config contract

Skills read per-project config from a **consuming** repo's `.claude/settings.local.json` (gitignored;
fallback `.claude/tlm.local.json`) — never from this repo. The authoritative schema for every key
(meaning, which skill consumes it, whether it's a secret, how to obtain it) is
`setup/tlm-config.reference.json`. **Read that file before touching anything config-related** — the
setup skill, the hooks, and `SETUP-CHECKLIST.md` must all agree with it. `skillRequirements` in that
file is the reverse index: what each skill needs before it can run. The `companions` block is the
authoritative dependency contract and its **enforcement rule**: a **baseline** (context7, `node`, `git`)
is always expected, and each capability's companions are **required-by-capability** — a capability is
**all-or-nothing**, either `enabled:true` with every companion installed *and* verified, or
`enabled:false`. A workflow skill does **not** run a half-configured capability: it stops and points the
user to `/tlm-project-setup` to finish setup or turn the capability off — no degraded "local-only" mode.
Coding skills (`tlm-fe-coding`, `tlm-rule-capture`) have no capability companions and always run, even with zero
config. `tlm-figma-to-code` is the hardest stop (no deliverable without the design); `tlm-spec-driven` is the
one that still degrades (opt-in per ticket, falls back to `tlm-fe-coding`).

## Where the rules live (vendored copy = live source)

The plugin installs read-only under `${CLAUDE_PLUGIN_ROOT}` — a Claude Code **managed clone that
`/plugin marketplace update` overwrites**. Editing a rule there is a dead end: lost on the next update,
never seen by the team. So since **v2.5.0** a consuming project keeps its own copy and runs on it:

1. **Install** — `tlm-project-setup` (PHASE 1.5, done by default) copies the plugin's editable subtrees
   (`skills/ ai/ hooks/ setup/`) into the consuming repo at `.claude/tlm-plugin/` (committed) and records
   `tlm.pluginRepo`. Deliberately **not** `.claude/skills/` — that path would double-register skill names
   against the installed plugin.
2. **It is the live source, not staging.** Skills resolve their rules root to it first; the installed
   hooks **delegate** to the hooks there (`delegateToVendored()` in `hooks/lib/hook-io.mjs`, guarded by
   `TLM_HOOK_VENDORED` against recursion). A rule added there — including a new `scan()` in `lint-fe.mjs`
   — is enforced from the next turn, in that repo only.
3. **Edit** — `tlm-rule-capture` (house-rule scope) writes into the copy, same layering as always
   (`ai/` deep rule + optional `tlm-fe-coding/SKILL.md` short form + checklist line + optional lint rule).
4. **Detect** — the `vendor-watch.mjs` PostToolUse hook notices any edit under `.claude/tlm-plugin/` and
   reminds Claude to commit it *and* offer to ship it.
5. **Review** — `node <rulesRoot>/skills/tlm-rule-capture/plugin-pr.mjs diff` mirrors the copy onto a fresh
   checkout of upstream and prints the diff. No writes, no push. This output goes to the user, and their
   go-ahead is required before step 6 — it is the only gate between a stray edit and the whole team.
6. **Ship** — `plugin-pr.mjs open <slug>` clones the upstream (`tlm.pluginRepo`), mirrors the subtrees
   onto `rule/<slug>`, **bumps the version in lockstep** across the three manifest fields, pushes, and
   opens the PR with `gh` (`prMode` default; falls back to printing a compare URL). Upstream and base
   default to `ToanHBL/tlm-claude-plugins` / `develop`. It never touches `${CLAUDE_PLUGIN_ROOT}`.

The config contract is `tlm.pluginRepo` in `setup/tlm-config.reference.json`.

> The default `upstreamRemote` is an **SSH host alias** (`git@github.com-hbl:…`) that only resolves on a
> machine whose `~/.ssh/config` defines it. On any other machine `plugin-pr.mjs preflight` fails at the
> clone — the fix is to store the working URL in that project's `tlm.pluginRepo.upstreamRemote`.

## The init doc (handover into `tlm-project-setup`)

Most of what `tlm-project-setup` asks is a **team decision made once**: the tracker, its real status
vocabulary, the base branch, the release channel, the sibling repos. Re-asking the next teammate is not
just slow — each re-answer is a chance to answer it differently, and a wrong status name moves tickets
into a status the board doesn't have. So the lead fills one doc and sends it with the init command.

- **Template** — `setup/tlm-init.template.json`. Its shape **is** a `settings.local.json` (`env` + `tlm`)
  plus a `$tlmInit` meta block, deliberately not a second schema: `tlm-config.reference.json` stays the
  only place a key is defined.
- **Script** — `skills/tlm-project-setup/init.mjs`: `template [--from-current] [--with-secrets] | detect |
  apply [--dry-run] [--prefer-local] | consume`. `--from-current` is the real authoring path — a working
  project is the answer key. Only `apply` writes, and only to `.claude/settings.local.json` + `.gitignore`.
- **Consumed by** `tlm-project-setup` PHASE 0.5 (before any question: its `answered` list kills the PHASE 1
  gating questions, its `still needed` list *is* the PHASE 2 form) and surfaced by `setup-check.mjs` —
  an init doc present is the one case where the SessionStart hook speaks in a repo with **no** config.
- **Trust boundary.** A doc arrives over chat, so: a placeholder (`<<FILL: …>>`) counts as unanswered and
  is never imported; per-user secrets (`env.*`) and per-machine paths (`ecosystem.workspaceRoot`, a
  sibling's `path`, `pluginRepo.upstreamRemote`) keep the value the machine already has; `permissions` /
  `hooks` / `enabledPlugins` are **refused**; `notes` / `howToUse` are text shown to the user, never
  executed. A doc never replaces PHASE 3 verification, PHASE 1.5's rules copy, or the local clones.
- **Single-use.** Gitignored on import, deleted by `consume`, stale the moment the config changes — an
  outdated doc is replaced, not edited. Contract: `initDoc` in `setup/tlm-config.reference.json`.

## The ecosystem registry (other repos of the same system)

Most consuming projects are one piece of a larger system, and the contract they need most often — an
endpoint shape, a shared type, a status vocabulary — is **owned by another repo**. A guessed contract
looks right and fails at runtime, so the rule is: read the real file, never infer the shape.

- **Config** — `tlm.ecosystem` (per project, `configVersion` 2): `enabled`, `workspaceRoot`
  (default `~/tlm-ecosystem`, one shared clone location per machine), `indexFile`, and `repos[]` with
  `{ name, role, path, gitUrl, ref, depth, notes }`. Registered per project so an unrelated repo is
  never pulled into context.
- **Script** — `skills/tlm-project-setup/ecosystem.mjs`: `preflight | list | add <path | clone-url |
  browse-url> | sync | index`. `add` writes only the `tlm.ecosystem` block back and **normalizes a pasted
  browse URL** (a GitHub/GitLab `…/tree/<branch>` page, an Azure DevOps `…/_git/<repo>?version=GB<branch>`
  page) into a real clone URL + `ref`, so the URL a user copies from their browser is cloneable as-is;
  `sync` clones what is missing (shallow) and fetches what is there; `index` writes
  `.claude/ecosystem-map.md` — per repo the stack, top-level layout, contract paths worth opening and the
  sibling's own rule files, plus a **"How these repos relate" section** (repos grouped by role + any
  detected shared-package dependency). That map is the cross-project relationship file.
- **Consumed by** `tlm-fe-coding` STEP 1.5 and reported on by `setup-check.mjs` (a registered repo that has
  gone missing from disk is flagged, since the map then names a source that cannot be opened).
- **Read-only.** Nothing in this plugin writes to, commits in, or runs anything inside a sibling repo.

## Hooks

Declared in `hooks/hooks.json`, invoked via `${CLAUDE_PLUGIN_ROOT}`:

- **SessionStart → `session-brief.mjs`** — the pre-work brief: plugin version (installed vs the
  vendored copy, with a drift note when they differ), the rules root and which `ai/` packs + skills
  apply to this project's stack, and the ecosystem repos already included (with an on-disk check).
  Speaks **only** in a project that runs on the plugin (a `.claude/tlm-plugin/` copy or a `tlm`
  config block exists); silent in every plain repo.
- **SessionStart → `setup-check.mjs`** — reports incomplete `tlm` config so a workflow skill doesn't fail
  mid-task. **Silent** when there's no config at all (a plain coding repo) or when it's complete; only
  speaks when config exists *and* is incomplete. Also flags the security case where
  `settings.local.json` is not gitignored. The **one** thing that breaks the no-config silence is a
  handed-over **init doc** (`.claude/tlm-init.json`) — it *is* the config, so the hook points at
  `/tlm-project-setup` and flags the doc if it isn't gitignored.
- **PostToolUse (Edit|Write|MultiEdit) → `lint-fe.mjs`** — advisory (runs *after* the write, cannot undo
  it). Emits `hookSpecificOutput.additionalContext` so Claude self-corrects the same turn. Silent unless
  it finds a violation.
- **PostToolUse (Edit|Write|MultiEdit) → `vendor-watch.mjs`** — fires only when the edited path is under a
  `.claude/tlm-plugin/` (the project's live rules copy) and reminds Claude to commit it and offer the
  review→PR. Silent everywhere else.

**All of them delegate.** Before doing any work each hook looks for the same hook inside the target
project's `.claude/tlm-plugin/hooks/`, and if it finds one, re-execs it with the identical stdin payload
and exits with its status (`delegateToVendored()`; `TLM_HOOK_VENDORED=1` stops the recursion, and a
vendored copy that fails to start falls through to the installed one). Without this, a rule added to a
project's rules copy would bind the skills but not the linter that enforces it.

All three are Node ESM and `hooks.json` invokes them in **exec form** (`"command": "node"`, `"args":
["${CLAUDE_PLUGIN_ROOT}/hooks/<name>.mjs"]`). They need **no companion tool but Node itself** — no `jq`,
no `bash`. That is deliberate: shell-form `.sh` hooks are broken on Windows (Git Bash mangles backslash
paths, `.sh` falls through to the file-association handler, `bash` is often off PATH), while `node` is a
real executable everywhere. Same reason the bundled MCP servers go through `mcp/launch.mjs` instead of
a bare `npx` command, which fails on Windows with `spawn npx ENOENT`.

The `.sh` originals are **gone** as of v2.6.0. They had stopped tracking the v2.5.0 changes (delegation,
the new checks), so diffing a `.mjs` against one no longer proved anything — it only sent readers to a
file that was wrong. If you ever need the pre-port behaviour, it is in the history:
`git log --diff-filter=D --oneline -- hooks/lint-fe.sh` then `git show <sha>^:hooks/lint-fe.sh`
(the repo carries no tags, so a `v2.5.0:` ref will not resolve).

**The `SessionStart` matcher covers all five sources** — `startup|resume|clear|compact|fork`. `compact`
is the load-bearing one: without it the config/init-doc/OpenSpec context is injected once at startup and
then silently lost the first time a long session compacts.

## tests/ — fixtures, not runnable apps

Each `tests/<stack>/` is one minimal project generated by applying a skill to a **shared User-CRUD
spec**, proving the rules produce consistent code. They are fixtures: `node_modules/` and build output
are gitignored and not committed, so there is no install/run step here. Each has a `PROJECT-NOTES.md`
with a *file → rule* table and a *RULES FEEDBACK* section (how rule contradictions get surfaced). Read
`tests/README.md` §"Known drift" before trusting the two web fixtures — they predate the
`Text`→`TextPrimary` / `Toast`→`BaseToast` rename and the thin-`page.tsx` decision. Verify a regenerated
fixture with `tsc --noEmit` (and `next build` for the Next.js ones).

## Working on the plugin

There is no root `package.json`, build, or test runner — content is markdown plus a few Node scripts.
Everything runs on `node` + `git` alone, on Windows, macOS and Linux alike. The dev loop is:

```bash
# Verify a hook by piping it the payload shape it expects (all read stdin JSON):
echo '{"cwd":"/path/to/some/project"}' | node hooks/setup-check.mjs
echo '{"cwd":"/path/to/some/project"}' | node hooks/session-brief.mjs   # silent unless the project runs on the plugin
echo '{"tool_input":{"file_path":"/abs/path/to/File.tsx"}}' | node hooks/lint-fe.mjs
echo '{"tool_input":{"file_path":"/abs/repo/.claude/tlm-plugin/ai/x.md"}}' | node hooks/vendor-watch.mjs
# ...and with a handed-over init doc in place, setup-check must speak even with zero config:
touch /path/to/project/.claude/tlm-init.json && echo '{"cwd":"/path/to/project"}' | node hooks/setup-check.mjs

# A hook must stay SILENT when it has nothing to say — that is the property that keeps it
# installed. Any stdout at all on a clean file is a bug:
echo '{"tool_input":{"file_path":"'"$PWD"'/README.md"}}' | node hooks/lint-fe.mjs | wc -c   # expect 0

# The rules-PR script, without writing anything:
node skills/tlm-rule-capture/plugin-pr.mjs preflight
node skills/tlm-rule-capture/plugin-pr.mjs diff        # review: what a PR would change upstream

# The init/handover script (TLM_PROJECT_DIR points it at a consuming project):
node skills/tlm-project-setup/init.mjs template --out /tmp/tlm-init.json      # blank annotated doc
TLM_PROJECT_DIR=/path/to/project node skills/tlm-project-setup/init.mjs template --from-current --out /tmp/h.json
TLM_PROJECT_DIR=/path/to/project node skills/tlm-project-setup/init.mjs detect            # no writes
TLM_PROJECT_DIR=/path/to/project node skills/tlm-project-setup/init.mjs apply --dry-run   # merge preview
cat /tmp/h.json | TLM_PROJECT_DIR=/path/to/project node skills/tlm-project-setup/init.mjs detect --path - --json

# The ecosystem script (TLM_PROJECT_DIR points it at a consuming project):
TLM_PROJECT_DIR=/path/to/project node skills/tlm-project-setup/ecosystem.mjs preflight
TLM_PROJECT_DIR=/path/to/project node skills/tlm-project-setup/ecosystem.mjs list

# Install / update this repo as a marketplace to test end-to-end:
/plugin marketplace add <git-url-or-local-path>
/plugin install tlm-claude-plugins@tlm-claude-plugins
/plugin marketplace update tlm-claude-plugins      # after committing changes
```

**Version bumps must stay in lockstep** across all three fields:
`.claude-plugin/plugin.json` `version`, and both `metadata.version` and `plugins[0].version` in
`.claude-plugin/marketplace.json`.

## Conventions enforced on the frontend code this plugin generates

These are the *product* of the plugin, not rules for editing the plugin — but you'll reference them
constantly. The full set is in `skills/tlm-fe-coding/SKILL.md`; the load-bearing ones:

- Business logic in `_modules/`; routing files (`pages/`, `app/`) thin (≤5 lines, import a Screen).
- Component hierarchy Basic → Base → Common → Domain → Screen; **never raw HTML** (`Col`/`Row`/
  `TextPrimary`), only `Base*` primitives may render raw/semantic DOM.
- Navigate with `<Link>` (web) / `router.navigate` (RN) — **never** `onClick`+`push`; `push`/`replace`
  are for post-action redirects only.
- No `as any` / `@ts-ignore`; no hardcoded hex (design tokens); i18n via `t()`; null-safe display via
  `safeString` / `joinText` / `joinWith`; Zod + React Hook Form (`register`-first).
- **Zod contract-first**: schemas are the source of truth (`z.infer` for types); consumed responses are
  **parsed at the service boundary, never `res.json() as T`**; fixtures pinned with `satisfies`
  (`ai/shared-fe/15`). Multi-app products are Turborepo monorepos with `packages/contracts`
  (`ai/shared-fe/16`).
- **Backend decision before router choice** (`ai/nextjs/00-backend-decision.md`): an existing backend in
  the ecosystem ⇒ Next.js is a BFF only; a standalone product ⇒ backend-first in-app (Server Actions +
  route handlers + Prisma).
- **Team policy: Next.js Page Router is the default.** App Router only for public/SEO pages or when
  SSR/RSC is genuinely needed — not for modernness.
