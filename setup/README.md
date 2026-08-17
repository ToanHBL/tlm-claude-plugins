# `setup/` — the integration contract, portable to any project

The `fe-coding` skill needs nothing but the repo it's invoked in. The **workflow** skills reach outside it — Figma, a ticket tracker, Slack — and
those need credentials and project facts that differ per project.

This folder is the template for that. It **ships with the plugin**, so once the plugin is installed
anywhere, Claude can read it from `${CLAUDE_PLUGIN_ROOT}/setup/` and walk you through setting that
project up — or tell you exactly what's missing when a skill can't run.

| File | Role |
|------|------|
| **`SETUP-CHECKLIST.md`** | The walkthrough. What to set up, in what order, gated by four questions. Read this when something breaks. |
| **`tlm-config.reference.json`** | The machine-readable schema. Every key: what it means, which skill reads it, whether it's a secret, how to obtain it. **This is what Claude consults.** |
| **`settings.local.example.json`** | Fillable template to copy into a project. |

## Using it in a new project

```
/project-setup
```

That's the whole thing. It asks only the questions your project actually needs, verifies each
integration with a real call, and writes `.claude/settings.local.json`. The files here are its
reference; nothing needs to be copied by hand.

You'll also be told when something's missing without asking: a workflow skill that hits an
unconfigured integration asks for the value inline while planning, and the SessionStart hook flags a
config that's half-finished.

## Where config lives at runtime

In the **consuming project**, never in this plugin repo. Everything goes in that project's
`.claude/settings.local.json` — the Claude Code convention for machine-local, gitignored config:

```jsonc
{
  "mcpServers": { /* MCP servers, e.g. context7, framelink-figma */ },
  "env":        { /* secrets: FIGMA_ACCESS_TOKEN, … */ },
  "tlm":        { /* non-secret project config: ticket system, channels, base branch, … */ }
}
```

If a Claude Code version strips the unknown `tlm` key, move that block alone to
`.claude/tlm.local.json` — skills read `settings.local.json` first and fall back to that.

## Rules the skills follow

1. **Secrets only in `settings.local.json`.** Never in a committed file, never echoed back to the user,
   never in a commit message or ticket comment.
2. **Missing values are asked for inline, at planning time** — never silently defaulted, never a hard
   stop before any work is delivered.
3. **Persist after asking**, so the next run doesn't ask again.
4. **Verify with one real call** before relying on an integration — "listed in `/mcp`" isn't working.

## Adding a new integration

When a skill starts needing something new:

1. Add its entry to `tlm-config.reference.json` — under `mcpServers` (how to install and detect it)
   and/or `tlm` (the config keys), plus a line in `skillRequirements` saying what to do when it's absent.
2. Add a gated step to `SETUP-CHECKLIST.md`.
3. Add the shape to `settings.local.example.json`.
4. Add a collect-and-verify block to `skills/project-setup/SKILL.md` PHASE 2.

Keep it gated by a question. A project that doesn't use Figma should never be asked for a Figma token.
