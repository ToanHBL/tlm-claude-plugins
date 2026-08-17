# ask-project-anything

Onboard **any** codebase and ask the AI about its **business logic** in 3 steps. A thin, guided
Claude Code plugin that delegates deep analysis to the
[understand-anything](https://github.com/Egonex-AI/Understand-Anything) plugin.

## Flow

1. **Install** this plugin.
2. **`/ask-project-init`** — the AI interviews you, verifies SSH access, SSH-clones the git source as a
   sibling folder next to your workspace, remembers its path in Claude memory, and kicks off analysis
   (`/understand` + `/understand-domain` from understand-anything).
3. **`/ask-project <question>`** — ask about the app's business: domains, user flows, core rules. The
   answer is grounded in the cloned source and cited as `path:line`.

## Skills

| Command | What it does |
|---|---|
| `/ask-project-init` | Interview → verify SSH → clone source (sibling) → save to memory → build knowledge graph |
| `/ask-project` | Load remembered source → ensure analyzed → answer a business-logic question, cited |

## Requirements

- **SSH access** to the git host of the repo you want to analyze.
- The **understand-anything** plugin (for deep analysis) — **auto-installed for you**. This plugin:
  - declares it as a cross-marketplace dependency in `plugin.json`
    (`allowCrossMarketplaceDependenciesOn` is set in the marketplace), and
  - ships a **SessionStart hook** (`hooks/ensure-understand-anything.sh`) that registers the
    `Egonex-AI/Understand-Anything` marketplace and installs the plugin if either is missing —
    idempotent and non-blocking.

  So after installing `ask-project-anything`, just **restart Claude Code once**: the backend is
  registered + installed automatically. If the machine was offline at that moment, the hook prints a
  one-line fallback command; and `/ask-project` still works via a lighter built-in scan meanwhile.

## Install (from the tlm-claude-plugins marketplace)

```bash
claude plugin marketplace add /Users/Apple/Documents/Projects/poc/rules   # or the pushed git URL
claude plugin install ask-project-anything@tlm-claude-plugins
```

Restart Claude Code (or start a new session) so the commands load.

## Notes

- Sources are cloned as **siblings** of your current workspace and remembered per-workspace in Claude
  memory, so later sessions don't re-ask.
- For heavy Q&A in Claude Code desktop, opening the cloned source folder directly as the workspace
  gives understand-anything the best context.
