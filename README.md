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
│   └── deployment-checklist/    # release check: tickets, services, migrations
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

They're tracker-agnostic — ClickUp, Jira, Linear, Azure DevOps or GitHub Issues, resolved from config.

## Setup

The coding skills need nothing. The workflow skills need credentials and project facts:

```
/project-setup
```

It scans what's detectable, asks the gating questions in **one** round, then shows **one** form for
everything you must supply — each row with instructions on where to get it. Config lands in
`.claude/settings.local.json` (gitignored): `mcpServers`, `env` for secrets, and a `tlm` block for
non-secret project facts.

Full walkthrough and troubleshooting: [`setup/SETUP-CHECKLIST.md`](setup/SETUP-CHECKLIST.md).

## Install

This repo is both a **plugin** and a **marketplace**:

```bash
# 1. Add this repo as a marketplace (git URL, or a local path)
/plugin marketplace add <git-url-or-local-path>

# 2. Install — available in ALL your projects afterward
/plugin install tlm-claude-plugins@tlm-claude-plugins

# 3. Verify
/help          # the skills appear; fe-coding triggers automatically on frontend work
```

Update after changes: `/plugin marketplace update tlm-claude-plugins`.

### Alternative: personal skills

```bash
mkdir -p ~/.claude/skills
ln -s "$(pwd)/skills/"* ~/.claude/skills/     # or cp -R
```

Instant, but not versioned or shareable — and `${CLAUDE_PLUGIN_ROOT}` won't resolve, so the skills fall
back to their inline schemas.

## Verifying it works

Ask Claude, in any project: *"Create a product list screen."* It should place logic in
`_modules/pages/Product/ProductListScreen.tsx`, use `Col`/`Row`/`TextPrimary`, navigate with `Link` (or
`router.navigate` on RN), fetch via a `useQuery` hook or a Server Component, render a visible empty
state, and skip pre-optimized handlers.

Each `tests/*` folder is a real project generated from one shared User-CRUD spec, with a
`PROJECT-NOTES.md` mapping every file back to the rule it follows. See [`tests/README.md`](tests/README.md).

## Keeping the rules alive

When you correct Claude's output with a reason — *"use `navigate`, `push` duplicates the screen on a
spam tap"* — **`rule-capture`** classifies it (new rule / gap / contradicts an existing rule / one-off),
checks what's already written down, and asks whether to persist it to `ai/` (all projects), this repo's
`CLAUDE.md` (this project), or memory (how you want to be worked with). The correction and the rule land
together, so the same fix isn't needed again next week.
