# tlm-claude-plugins

Claude Code skills that make one team's frontend work come out the same in every repo — the house
architecture, naming and validation conventions for Next.js and React Native, plus the workflow that
surrounds the code: tickets, Figma designs, releases and deployment checks.

Install once and it applies in all your projects. Each project then keeps its **own committed copy of
the rules** under `.claude/tlm-plugin/`, so a rule you change is live in that repo from the next turn,
and sharing it with the team is a deliberate, reviewed PR rather than a silent edit.

Every skill is prefixed **`tlm-`** so it is easy to find among your other skills — type `/tlm-` to list
them all.

## Skills

| Skill | What it does | Triggers on |
|---|---|---|
| **`/tlm-fe-coding`** | The one coding skill. Detects the stack (Next.js App/Page Router, React Native Expo/CLI, Next.js API + Prisma), applies the `_modules/` architecture, component hierarchy, `Link`-only navigation, function minimalism, visible empty states and Zod-first contracts, then layers that stack's hard rules on top. | any frontend work — automatic, no config |
| **`/tlm-project-setup`** | Scans what's detectable, asks the gating questions in one round, then shows one form for everything you must supply. Installs the project's live rules copy, and registers the *other* repos of your system so cross-repo contracts are read from the real files instead of guessed. | "setup config", "add repo", or a skill reporting missing config |
| **`/tlm-rule-capture`** | You correct Claude with a reason; it classifies that as a new rule, a gap, a contradiction or a one-off, and asks whether to persist it — so the fix and the rule land together. | corrective feedback with a reason attached |
| **`/tlm-figma-to-code`** | Figma design → screen, in your actual stack and conventions. **Hard-stops rather than guessing** when it cannot read the design. | a figma.com link |
| **`/tlm-ticket-workflow`** | Ticket → branch → plan file → implement → non-technical summary synced back → moved to review. Tracker-agnostic. | `TLM-1234`, a ticket URL, "work on task" |
| **`/tlm-ba-ticket`** | A requirement or bug described in chat → ONE well-formed ticket in the team's template. | "create a ticket", "log bug", "tạo ticket" |
| **`/tlm-mobile-release-notes`** | A commit range → plain-language build notes for testers, posted as a draft. Mobile only. | a commit range, "release notes" |
| **`/tlm-deployment-checklist`** | Compares your branch against a base, finds every ticket in scope, enriches each from the tracker, and lists the services to deploy and migrations to run. | "release check", "deployment checklist" |
| **`/tlm-spec-driven`** | Agrees the spec before any code, driving OpenSpec's propose → apply → archive loop. Offered per ticket, never forced. | "openspec", `/opsx:*`, an `openspec/` directory |

The workflow skills are **tracker-agnostic** — ClickUp, Jira, Linear, Azure DevOps or GitHub Issues,
resolved from your config. The coding skills need no configuration at all.

Deep reference the skills load on demand lives in [`ai/`](ai/); the setup contract lives in
[`setup/SETUP-CHECKLIST.md`](setup/SETUP-CHECKLIST.md).

## Install

Needs **Node.js** (≥ 20.19 if you'll use `tlm-spec-driven`) and **git**. Everything is Node ESM in exec
form — no `jq`, `bash` or `sed` dependency — so Windows, macOS and Linux all work the same way.

This repo is both the plugin and its marketplace, so you add it once and install from it.

### Claude Code CLI

Inside a Claude Code session:

```
/plugin marketplace add https://github.com/ToanHBL/tlm-claude-plugins
/plugin install tlm-claude-plugins@tlm-claude-plugins
```

Accept the trust prompt, then restart the session.

### Claude Desktop

The `/plugin` dialog needs an interactive terminal, so from the desktop app use the non-interactive CLI
in any terminal instead — it writes the same config the dialog does:

```bash
claude plugin marketplace add https://github.com/ToanHBL/tlm-claude-plugins
```

```bash
claude plugin install tlm-claude-plugins@tlm-claude-plugins
```

Then restart Claude Desktop. Verify with `claude plugin list`.

> A local path works in place of the git URL for trying changes before you push:
> `claude plugin marketplace add /absolute/path/to/tlm-claude-plugins`.
> Pass `--scope project` to install for one repo rather than for you globally.

### Then

```
/tlm-project-setup
```

Only the workflow skills need it — coding works immediately. It collects the project facts and tokens in
one form and writes them to `.claude/settings.local.json` (gitignored). The context7 and Framelink Figma
MCP servers ship with the plugin and load on install; you supply only the Figma token.

**Updating:** `/plugin marketplace update tlm-claude-plugins`, or `claude plugin update
tlm-claude-plugins`. Restart to apply.
