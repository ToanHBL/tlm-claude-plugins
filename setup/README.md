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
| **`tlm-init.template.json`** | The **init doc** — a lead fills it in once and hands it to the team, and `/project-setup` applies it instead of asking. See below. |

## Using it in a new project

```
/project-setup
```

That's the whole thing. It asks only the questions your project actually needs, verifies each
integration with a real call, and writes `.claude/settings.local.json`. The files here are its
reference; nothing needs to be copied by hand.

## The fast path: hand the answers over instead of asking for them

Most of what `/project-setup` asks is a **team decision made once** — which tracker, which status names,
which base branch, which release channel, which sibling repos. The ninth teammate to open the repo
should not be answering those again: each re-answer is a chance to answer it differently, and one wrong
status name is enough to move tickets into a status the board doesn't have.

So the lead sends an **init doc** with the init command.

**Lead — produce it from a project that already works:**

```bash
node <rulesRoot>/skills/project-setup/init.mjs template --from-current --out ~/tlm-init.json --for "installer team"
```

It reads your `.claude/settings.local.json`, leaves secrets out (Figma tokens are per-user), strips
per-machine paths, and prints the two-line message to send with the file. Review it before sending — it
carries your tracker ids, channel ids and repo URLs. `--with-secrets` includes real tokens and turns the
file into a credential; send it like a password, or don't use it.
Starting from scratch instead? `init.mjs template --out ~/tlm-init.json` writes the annotated blank.

**Teammate — two steps:**

```
1. save the file into the project as .claude/tlm-init.json
2. /project-setup init
```

Everything in the doc is applied without a question. You're asked only for what a file cannot carry:
your own Figma token, and clicking Connect on the ClickUp / Slack connectors. What it can't do is skip
verification, the local rules copy, or cloning the sibling repos — those happen on your machine.

The doc is gitignored on import, deleted by `init.mjs consume` once it's applied and verified, and
single-use: it goes stale the moment the team's config changes, so ask for a fresh one rather than
editing an old one. Placeholders (`<<FILL: …>>`) are treated as unanswered, a value already on your
machine wins over the file, and `permissions` / `hooks` in a doc are refused outright — a file that
arrives over chat is not how tool access gets granted. Full contract: `initDoc` in
`tlm-config.reference.json`.

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
5. If it's a **team-wide** value (not a secret, not per-machine), add it to `tlm-init.template.json` too,
   and to the gap checks in `skills/project-setup/init.mjs` (`gaps()`) — otherwise the handover silently
   stops covering it and every teammate gets asked again.

Keep it gated by a question. A project that doesn't use Figma should never be asked for a Figma token.
