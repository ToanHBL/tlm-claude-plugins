# tlm-claude-plugins

Claude Code skills for **coding** frontends in a consistent house style, and for the **workflow** around
that code — tickets, designs, releases.

Install once → Claude follows the same architecture, navigation and validation conventions across
Next.js and React Native, and drives your ticket tracker, Figma and Slack the same way in every repo.

```
tlm-claude-plugins/
├── .claude-plugin/
│   ├── plugin.json          # Plugin manifest
│   └── marketplace.json     # Self-hosted marketplace
├── skills/
│   ├── fe-coding/               # ← the one coding skill; detects the stack, applies the rules
│   ├── rule-capture/            # corrective feedback → offer to persist it as a rule
│   ├── project-setup/           # scan missing config → one form → write settings.local.json
│   ├── figma-to-code/           # Figma design → screen (hard-stops without the design)
│   ├── ticket-workflow/         # ticket → branch → plan → implement → sync back
│   ├── mobile-release-notes/    # commits → plain-language build notes → Slack draft (mobile only)
│   ├── deployment-checklist/    # release check: tickets, services, migrations
│   └── spec-driven/             # drives OpenSpec (propose→apply→archive); offered per ticket
├── setup/                   # integration contract — ships with the plugin, used from ANY project
│   ├── SETUP-CHECKLIST.md       # the walkthrough
│   ├── tlm-config.reference.json# machine-readable schema Claude consults
│   └── settings.local.example.json
├── ai/                      # knowledge base — deep reference, loaded on demand
│   ├── shared-fe/ 01–08         # cross-stack rules
│   ├── templates/               # requirement-intake templates
│   ├── nextjs/{app,page}-router/# + 06-hard-rules.md each
│   └── reactnative/             # + 06-hard-rules.md
├── hooks/                   # SessionStart: config completeness check · PostToolUse: fe-coding hard-rule lint
└── tests/                   # one generated project per stack, from one shared spec
```

## The coding skill

**`fe-coding`** is the single entry point for all frontend work. It:

1. **Detects the stack** — `tlm.project.type` in `.claude/settings.local.json` → auto-detect from the
   repo → ask (then offer to persist).
2. **Applies the shared base** — `_modules/` architecture, component hierarchy, Link-only navigation,
   function minimalism, visible empty states, null-safe display strings, no `as any`, Zod + RHF.
3. **Layers the stack's hard rules** on top, inline so they hold without a second file read.

| Detected stack | Hard rules include | Deep reference |
|---|---|---|
| `nextjs-page-router` (**default**) | thin `pages/`, `useQuery` not `getServerSideProps`, pick Mode A or B | `ai/nextjs/page-router/` |
| `nextjs-app-router` | Server-first, `'use client'` at leaves, no `Date.now()` in render, auth-checked Server Actions | `ai/nextjs/app-router/` |
| `nextjs-api-prisma` (Page Router Mode B) | thin `route.ts`, Prisma singleton, `await params`, server-only imports | `ai/nextjs/page-router/05-…` |
| `react-native-expo` | `router.navigate` not `push`, `FlatList` for data lists, `scale()` on fixed dimensions | `ai/reactnative/` |
| `react-native-cli` | same, with React Navigation | `ai/reactnative/06-hard-rules.md` |

**Team policy: Page Router by default.** App Router is for public, SEO-facing pages or when SSR/RSC is
genuinely needed — not for modernness.

## The workflow skills

| Skill | Triggers on | Needs |
|-------|-------------|-------|
| **project-setup** | "setup config", a skill reporting missing config | — |
| **rule-capture** | corrective feedback with a reason attached | — |
| **figma-to-code** | a figma.com link | Framelink MCP (**hard-stops** without it) |
| **ticket-workflow** | `TLM-1234`, a ticket URL, "work on task" | ticket tracker MCP |
| **mobile-release-notes** | a commit range, "release notes" | tracker + Slack; mobile projects only |
| **deployment-checklist** | "release check", "deployment checklist" | ticket tracker |
| **spec-driven** | "openspec", "spec-driven", `/opsx:*`, an `openspec/` dir | OpenSpec CLI via `npx` (Node ≥ 20.19) |

They're tracker-agnostic — ClickUp, Jira, Linear, Azure DevOps or GitHub Issues, resolved from config.

## Install & set up

### Prerequisites

- **Claude Code** + **git**.
- **Node.js** — for the `npx`-based MCP servers (context7, Framelink Figma). Use **≥ 20.19** if you'll
  touch the `spec-driven` skill (OpenSpec's CLI requires it).
- **`jq`** — both hooks (`SessionStart` config check, `PostToolUse` lint) need it. Without `jq` they exit
  **silently**: no config warnings, **no rule linting**, and nothing tells you enforcement is off.
  `brew install jq` (macOS) / `apt install jq` (Debian/Ubuntu).

### Install

This repo is both a **plugin** and a **marketplace**:

```bash
# 1. Add as a marketplace — a git URL or a local path.
#    NOT a direct URL to marketplace.json: source:"./" only resolves against a cloned / local copy.
/plugin marketplace add <git-url-or-local-path>

# 2. Install — available in ALL your projects afterward
/plugin install tlm-claude-plugins@tlm-claude-plugins

# 3. Accept the trust prompt, then verify
/help          # the skills appear; fe-coding triggers automatically on frontend work
```

Update after changes: `/plugin marketplace update tlm-claude-plugins`. The version is bumped on every
release, so updates aren't served from a stale cache.

### Configure — only for the workflow skills

The coding skills need **nothing** — just start coding. The workflow skills need credentials and project
facts:

```
/project-setup
```

It scans what's detectable, asks the gating questions in **one** round, then shows **one** form for
everything you must supply — each row with instructions on where to get it. Config lands in
`.claude/settings.local.json` (gitignored): `env` for secrets and a `tlm` block for non-secret project
facts.

**The context7 and Framelink Figma MCP servers ship with the plugin** (bundled `mcpServers`), so they
load automatically on install — no per-project `mcpServers` entry needed. You only supply the Figma
**token** (`env.FIGMA_ACCESS_TOKEN`) and connect the OAuth connectors that can't be bundled (ClickUp /
Slack, at claude.ai → Connectors). Full walkthrough and troubleshooting:
[`setup/SETUP-CHECKLIST.md`](setup/SETUP-CHECKLIST.md).

### Alternative: personal skills

```bash
mkdir -p ~/.claude/skills
ln -s "$(pwd)/skills/"* ~/.claude/skills/     # or cp -R
```

Instant, but not versioned or shareable — and `${CLAUDE_PLUGIN_ROOT}` won't resolve, so the skills fall
back to their inline schemas.

## Usage context — when each part kicks in

Three ways the plugin shows up, by how much you've set up:

**1. Pure coding — zero config.** Open any frontend repo and ask for work: *"Create a product list
screen."* `fe-coding` auto-detects the stack, then places logic in
`_modules/pages/Product/ProductListScreen.tsx`, uses `Col`/`Row`/`TextPrimary`, navigates with `Link`
(or `router.navigate` on RN), fetches via a `useQuery` hook or a Server Component, renders a visible
empty state, and skips pre-optimized handlers. The `PostToolUse` hook lints each edit and feeds any
violation back so Claude self-corrects the same turn. **No input needed.** Correct Claude with a reason
— *"use `navigate`, `push` duplicates the screen on a spam tap"* — and `rule-capture` offers to persist
it (see below).

**2. Workflow — run `/project-setup` once per repo.** Triggered by a ticket id (`TLM-1234`), a
figma.com link, a commit range, or "release check". The first time, `/project-setup` collects — in one
form — the project type (auto-detected) and, depending on what you enable: a Figma token, a
ticket-tracker connector + one ticket URL + its statuses, a Slack channel id. Everything is remembered
afterward. **Each capability is all-or-nothing**: if you enable it, its companion (tracker connector,
Slack, Figma MCP) must be connected *and* verified — otherwise the skill stops and asks you to finish
`/project-setup` or turn that capability off, rather than limping along half-configured. Single values
within a connected capability are still asked inline. **Figma is the hardest stop** (no UI code from a
guessed design).

**3. Spec-driven (OpenSpec) — per ticket, opt-in.** In a repo with an `openspec/` directory, the
SessionStart hook reminds Claude the repo can run spec-first. On a new capability or behaviour change it
asks once: *apply OpenSpec for this one?* **Yes** → it drives `propose → apply → sync → archive`
(bootstrapping via `npx openspec init` the first time; needs Node ≥ 20.19), announcing each CLI command
so you see what's triggered. **No** → the normal coding skills run. Trivial fixes are never gated.

Each `tests/*` folder is a real project generated from one shared User-CRUD spec, with a
`PROJECT-NOTES.md` mapping every file back to the rule it follows. See [`tests/README.md`](tests/README.md).

## Keeping the rules alive

When you correct Claude's output with a reason — *"use `navigate`, `push` duplicates the screen on a
spam tap"* — **`rule-capture`** classifies it (new rule / gap / contradicts an existing rule / one-off),
checks what's already written down, and asks whether to persist it as a **plugin rule** (all projects),
this repo's `CLAUDE.md` (this project), or memory (how you want to be worked with). The correction and
the rule land together, so the same fix isn't needed again next week.

Because the plugin installs read-only (a managed clone `/plugin marketplace update` overwrites), a
**plugin rule is contributed back via a PR, not an in-place edit**. Opt in during `/project-setup` and it
**vendors** an editable copy of the rules into `.claude/tlm-plugin/`; `rule-capture` then edits that copy
and `skills/rule-capture/plugin-pr.sh` opens a PR to the upstream (bumping the version in lockstep and
printing a GitHub compare URL). The rule reaches the whole team on the next `/plugin marketplace update`.
See [`CLAUDE.md`](CLAUDE.md) → *Contributing rules back*.
