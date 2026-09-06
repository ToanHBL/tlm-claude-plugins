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
│   │   └── plugin-pr.mjs            # review the rule diff, then PR it upstream
│   ├── project-setup/           # config + rules copy + the system's other repos → one form
│   │   └── ecosystem.mjs            # register / clone / index the sibling repos
│   ├── figma-to-code/           # Figma design → screen (hard-stops without the design)
│   ├── ticket-workflow/         # ticket → branch → plan → implement → sync back
│   ├── ba-ticket/               # BA/PO: requirement/bug in chat → ONE templated ClickUp ticket
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
| **project-setup** | "setup config", "add repo", a skill reporting missing config, or an outdated config schema | — |
| **rule-capture** | corrective feedback with a reason attached | — |
| **figma-to-code** | a figma.com link | Framelink MCP (**hard-stops** without it) |
| **ticket-workflow** | `TLM-1234`, a ticket URL, "work on task" | ticket tracker MCP |
| **ba-ticket** | a requirement/bug described in chat + "tạo ticket", "log bug", "create a ticket" | ClickUp MCP |
| **mobile-release-notes** | a commit range, "release notes" | tracker + Slack; mobile projects only |
| **deployment-checklist** | "release check", "deployment checklist" | ticket tracker |
| **spec-driven** | "openspec", "spec-driven", `/opsx:*`, an `openspec/` dir | OpenSpec CLI via `npx` (Node ≥ 20.19) |

They're tracker-agnostic — ClickUp, Jira, Linear, Azure DevOps or GitHub Issues, resolved from config.

## Two things every project gets

### The rules live in your repo

`/project-setup` installs the plugin's `skills/ ai/ hooks/ setup/` into **`.claude/tlm-plugin/`**
(committed) and **that copy is what the project runs on**:

> **Rules root** = `<project>/.claude/tlm-plugin/` if present, else `${CLAUDE_PLUGIN_ROOT}`.

The skills read their rules from that root and the installed hooks delegate to the hooks there — so a rule
you change is enforced from the next turn, in this repo, without waiting for anything. `${CLAUDE_PLUGIN_ROOT}`
stays the delivery channel and the fallback; it is a managed clone `/plugin marketplace update` overwrites,
so it is never edited in place.

Sharing a rule with the team is a **review-then-PR**, both driven by `rule-capture`:

```bash
node .claude/tlm-plugin/skills/rule-capture/plugin-pr.mjs diff        # what a PR would change upstream
node .claude/tlm-plugin/skills/rule-capture/plugin-pr.mjs open <slug> # branch, version bump, push, PR (gh)
```

`diff` is the review gate — it writes nothing and pushes nothing, and Claude shows it to you before
`open`. Everyone else picks the rule up on their next `/plugin marketplace update`.

### The other repos of your system

A screen calls an API owned by another repo; a type comes from a shared package; a mobile flow mirrors a
web one. **Guessing those contracts is the failure this prevents** — a plausible endpoint shape passes
review and breaks at runtime.

`/project-setup` asks once for the repos this project depends on, as a **folder path** or a **git URL**
(cloned into a shared `~/tlm-ecosystem/`, shallow), then writes **`.claude/ecosystem-map.md`**: each
repo's stack, layout, where its contracts live, and which of its own rule files govern it. `fe-coding`
reads that map before assuming anything cross-repo, then opens the real file.

```bash
node .claude/tlm-plugin/skills/project-setup/ecosystem.mjs add ~/Projects/tlm-api --role backend
node .claude/tlm-plugin/skills/project-setup/ecosystem.mjs add git@github.com:acme/tlm-web.git --role web
node .claude/tlm-plugin/skills/project-setup/ecosystem.mjs sync && … ecosystem.mjs index
```

Registered **per project**, so an unrelated repo never lands in context. The siblings are **read-only
reference**: Claude opens files in them and never edits, commits or runs anything there.

## Install & set up

### Prerequisites

Exactly two things to install by hand, and they are the same on every platform:

- **Node.js** — runs the plugin's hooks, the rules-PR and ecosystem scripts, the MCP launcher (context7,
  Framelink Figma) and the OpenSpec CLI. Use **≥ 20.19** if you'll touch the `spec-driven` skill.
  Windows: the [official installer](https://nodejs.org) or `winget install OpenJS.NodeJS`.
- **git** — the `settings.local.json` gitignore safety check, the rules PR, cloning the sibling repos of
  your system, and the ticket discovery the release skills do over commit ranges. Windows: [Git for Windows](https://git-scm.com).

Plus **Claude Code** itself, obviously.

### Platform support

| | Windows | macOS | Linux |
|---|---|---|---|
| Hooks (config check, rule lint, vendor watch) | ✅ | ✅ | ✅ |
| Bundled MCP servers (context7, Framelink Figma) | ✅ | ✅ | ✅ |
| Rules PR (`plugin-pr.mjs`) · ecosystem clone/index (`ecosystem.mjs`) | ✅ | ✅ | ✅ |

Everything is Node ESM invoked in **exec form**, so there is **no `jq`, `bash`, `sed`, `grep` or `rsync`
dependency** — none of which ship on Windows. Shell-form `.sh` hooks are a known breakage there (Git Bash
mangles backslash paths, `.sh` opens in an editor instead of running, `bash` is often off PATH), and a
bare `npx` MCP command fails with `spawn npx ENOENT`; `mcp/launch.mjs` resolves npm's own `npx-cli.js`
and runs it with `node` to sidestep that.

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
**token** (`env.FIGMA_ACCESS_TOKEN`), optionally a context7 API key (`env.CONTEXT7_API_KEY` — context7
runs fine without one; a key only raises rate limits), and connect the OAuth connectors that can't be
bundled (ClickUp / GitHub / Slack, at claude.ai → Connectors). Both bundled servers read their key from
your local `env` via a `${…:-}` reference, so the secret stays in your gitignored settings, never in the
plugin. Full walkthrough and troubleshooting: [`setup/SETUP-CHECKLIST.md`](setup/SETUP-CHECKLIST.md).

#### Onboarding a teammate: hand the answers over, don't ask for them again

Which tracker, which status names, which base branch, which release channel, which sibling repos — those
are decided **once per project**. Asking each new teammate to answer them again is how two people end up
with two different `inReview` statuses. So the lead sends an **init doc** with the init command:

```bash
# lead, in a project that already works — reads .claude/settings.local.json,
# leaves secrets out, strips per-machine paths, prints the message to send with it
node <rulesRoot>/skills/project-setup/init.mjs template --from-current --out ~/tlm-init.json
```

```
# teammate
1. save it into the project as .claude/tlm-init.json
2. /project-setup init
```

Every value in the doc is applied without a question; you're asked only for what a file cannot carry —
your own Figma token, and clicking Connect on the connectors. It does **not** skip verification, the
local rules copy, or cloning the sibling repos: the doc carries their git URLs, not their clones.

Guardrails, because a config file arriving over chat is a trust boundary: a `<<FILL: …>>` placeholder
counts as unanswered, per-user secrets and per-machine paths already on your machine win over the file,
`permissions` / `hooks` / `enabledPlugins` are **refused** on import, and the doc is gitignored then
deleted once applied (`init.mjs consume`). Template: [`setup/tlm-init.template.json`](setup/tlm-init.template.json).

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

**1b. Cross-repo — after `/project-setup` has registered the siblings.** Ask for a screen that talks to
another system — *"add the vehicle list, it comes from the fleet API"* — and `fe-coding` reads
`.claude/ecosystem-map.md`, opens the real DTO/route in that repo, and types the client off it. If the
repo isn't registered it says so and offers to add it, instead of inventing a plausible payload.

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

A house rule is written into **this project's rules copy** (`.claude/tlm-plugin/`), so it is in effect
here from the next turn — the skills read that copy and the hooks delegate to it. Sharing it is a
separate, deliberate step: `plugin-pr.mjs diff` shows you exactly what would change upstream, and only
after you approve does `open <slug>` branch, bump the version in lockstep, push and open the PR. The rule
reaches the rest of the team on their next `/plugin marketplace update`. The installed plugin under
`${CLAUDE_PLUGIN_ROOT}` is never edited in place — a marketplace update overwrites it. See
[`CLAUDE.md`](CLAUDE.md) → *Where the rules live*.
