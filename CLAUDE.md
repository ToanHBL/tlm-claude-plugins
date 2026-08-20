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

| Layer | Path | Role | Length discipline |
|-------|------|------|-------------------|
| **Skills** | `skills/*/SKILL.md` | Orchestration prose Claude loads when a skill triggers. The *inline* short form of the most critical rules, so they hold **without a second file read**. | Must stay short — only CRITICAL rules go inline. |
| **Knowledge base** | `ai/**` | Deep reference, read **on demand** when a task needs the depth. Full rule + **why** (the failure it prevents) + ❌/✅ examples + exceptions. | Verbose is fine; this is where depth belongs. |
| **Hooks** | `hooks/*.sh` | Mechanical enforcement. `lint-fe.sh` re-checks the subset of hard rules that are grep-detectable and feeds hits back to Claude. | Only rules with a low false-positive rate. |
| **Config contract** | `setup/**` | The `tlm` config schema that skills read from a *consuming* project. Documentation, not live config. | — |

`fe-coding/SKILL.md` is the canonical example: STEP 2 is the shared base (every stack), STEP 3 the
per-stack hard rules, each ending in `→ ai/<stack>/…` pointers to the deep layer.

### Consequence for editing rules — keep the layers in sync

When you add or change a hard rule, propagate it across the layers it belongs to (this is what the
`rule-capture` skill formalizes):

1. **Deep rule → `ai/`** — `ai/shared-fe/` if cross-stack, else `ai/<stack>/06-hard-rules.md`. Match the
   neighbours' shape: rule, why, wrong/correct examples, exceptions. **Always include the reason** — the
   failure story is what makes a rule stick.
2. **Inline short form → the matching section of `skills/fe-coding/SKILL.md`** — *only* if it's critical
   enough to need to hold without a second read. Be strict; that file is useful only while it's short.
3. **Mechanical check → `hooks/lint-fe.sh`** — only if it's reliably grep-detectable (see the existing
   `scan` calls and their per-file exemptions).
4. **Checklist line → `ai/shared-fe/07-ai-workflow-integration.md` §9** if it's checkable.

A **CORRECTION** (feedback that contradicts an existing rule) is the case that gets missed: edit the
contradicting rule too, don't leave both versions standing.

## The skills

`fe-coding` is the **single entry point for all frontend coding** — it detects the stack (config →
auto-detect → ask), applies the shared `_modules/` base, then layers the stack's hard rules. The rest
are workflow skills, tracker-agnostic (ClickUp / Jira / Linear / Azure DevOps / GitHub, resolved from
config):

- `project-setup` — scans missing config, one form, writes `.claude/settings.local.json`. Also scans the
  project's **own** rules/specs (`CLAUDE.md`, `.cursorrules`, `.claude/rules`, `openspec/`, lint/tsconfig)
  and catalogs them into `.claude/codebase-map.md` — the house rules **defer to an explicit project rule
  where they conflict**, never silently override it (persistent overrides go through `rule-capture`).
- `rule-capture` — corrective feedback → classify (NEW / GAP / CORRECTION / ONE-OFF) → ask → persist.
- `figma-to-code` — Figma link → screen; **hard-stops** if the Framelink MCP is missing/unauthorized
  (never approximates a design from a frame name or screenshot).
- `ticket-workflow` — ticket → branch → plan → implement → sync.
- `mobile-release-notes` — commit range → plain-language notes → Slack draft (mobile projects only).
- `deployment-checklist` — release check: tickets, services, migrations.
- `spec-driven` — drives **OpenSpec** (external `npx` CLI, needs Node ≥ 20.19) for spec-first work:
  bootstraps `openspec/` + `/opsx:*` commands, then runs propose → apply → sync → archive, enriching
  `design.md` onto the `_modules/` architecture. **Offered per ticket** (SessionStart hook detects
  `openspec/` and reminds Claude to ask); applied only if the user agrees, else the normal skills run.
  Every OpenSpec CLI command is announced first for transparency. Degrades to `fe-coding`, never a
  hard stop. Config: `tlm.specDriven` in `setup/tlm-config.reference.json`.

## The `tlm` config contract

Skills read per-project config from a **consuming** repo's `.claude/settings.local.json` (gitignored;
fallback `.claude/tlm.local.json`) — never from this repo. The authoritative schema for every key
(meaning, which skill consumes it, whether it's a secret, how to obtain it) is
`setup/tlm-config.reference.json`. **Read that file before touching anything config-related** — the
setup skill, the hooks, and `SETUP-CHECKLIST.md` must all agree with it. `skillRequirements` in that
file is the reverse index: what each skill needs before it can run. The `companions` block is the
authoritative dependency contract and its **enforcement rule**: a **baseline** (context7, `jq`, `node`)
is always expected, and each capability's companions are **required-by-capability** — a capability is
**all-or-nothing**, either `enabled:true` with every companion installed *and* verified, or
`enabled:false`. A workflow skill does **not** run a half-configured capability: it stops and points the
user to `/project-setup` to finish setup or turn the capability off — no degraded "local-only" mode.
Coding skills (`fe-coding`, `rule-capture`) have no capability companions and always run, even with zero
config. `figma-to-code` is the hardest stop (no deliverable without the design); `spec-driven` is the
one that still degrades (opt-in per ticket, falls back to `fe-coding`).

## Hooks

Declared in `hooks/hooks.json`, both invoked via `${CLAUDE_PLUGIN_ROOT}`:

- **SessionStart → `setup-check.sh`** — reports incomplete `tlm` config so a workflow skill doesn't fail
  mid-task. **Silent** when there's no config at all (a plain coding repo) or when it's complete; only
  speaks when config exists *and* is incomplete. Also flags the security case where
  `settings.local.json` is not gitignored.
- **PostToolUse (Edit|Write|MultiEdit) → `lint-fe.sh`** — advisory (runs *after* the write, cannot undo
  it). Emits `hookSpecificOutput.additionalContext` so Claude self-corrects the same turn. Silent unless
  it finds a violation. Both scripts require `jq` and exit silently without it.

## tests/ — fixtures, not runnable apps

Each `tests/<stack>/` is one minimal project generated by applying a skill to a **shared User-CRUD
spec**, proving the rules produce consistent code. They are fixtures: `node_modules/` and build output
are gitignored and not committed, so there is no install/run step here. Each has a `PROJECT-NOTES.md`
with a *file → rule* table and a *RULES FEEDBACK* section (how rule contradictions get surfaced). Read
`tests/README.md` §"Known drift" before trusting the two web fixtures — they predate the
`Text`→`TextPrimary` / `Toast`→`BaseToast` rename and the thin-`page.tsx` decision. Verify a regenerated
fixture with `tsc --noEmit` (and `next build` for the Next.js ones).

## Working on the plugin

There is no root `package.json`, build, or test runner — content is markdown + bash. The dev loop is:

```bash
# Verify a hook by piping it the payload shape it expects (both read stdin JSON):
echo '{"cwd":"/path/to/some/project"}' | bash hooks/setup-check.sh
echo '{"tool_input":{"file_path":"/abs/path/to/File.tsx"}}' | bash hooks/lint-fe.sh

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
constantly. The full set is in `skills/fe-coding/SKILL.md`; the load-bearing ones:

- Business logic in `_modules/`; routing files (`pages/`, `app/`) thin (≤5 lines, import a Screen).
- Component hierarchy Basic → Base → Common → Domain → Screen; **never raw HTML** (`Col`/`Row`/
  `TextPrimary`), only `Base*` primitives may render raw/semantic DOM.
- Navigate with `<Link>` (web) / `router.navigate` (RN) — **never** `onClick`+`push`; `push`/`replace`
  are for post-action redirects only.
- No `as any` / `@ts-ignore`; no hardcoded hex (design tokens); i18n via `t()`; null-safe display via
  `safeString` / `joinText` / `joinWith`; Zod + React Hook Form (`register`-first).
- **Team policy: Next.js Page Router is the default.** App Router only for public/SEO pages or when
  SSR/RSC is genuinely needed — not for modernness.
