# Setup Checklist — Walkthrough

Everything a project must configure before the workflow skills (`figma-to-code`, `ticket-workflow`,
`mobile-release-notes`, `deployment-checklist`) can run.

This ships with the plugin, so it applies to **any** project you install it into — not just this repo.

**Don't work through this by hand.** Run `/project-setup` — it scans what it can detect, asks the
gating questions in **one** round, then shows **one** form with every value you still need to supply
(each with instructions), verifies each integration with a real call, and writes the config for you.
This file is the reference it follows, and the thing to read when something breaks.

> **Almost nothing here is a hard gate.** A skill that hits a missing value asks for it *inline, during
> planning*, then offers to persist it. You never get stopped at step one with nothing delivered.
>
> **The one exception is Figma** (Step 2). If the design can't be fetched, `figma-to-code` **stops** and
> writes no UI code rather than approximating the design — see that step for why.

---

## Where things live

| What | Where | Committed? |
|------|-------|-----------|
| API keys, tokens, secrets | `.claude/settings.local.json` → `env` | ❌ gitignored |
| MCP server definitions | `.claude/settings.local.json` → `mcpServers` | ❌ gitignored |
| Project config (ticket system, channels, branch…) | `.claude/settings.local.json` → `tlm` | ❌ gitignored |
| What every key *means* | `${CLAUDE_PLUGIN_ROOT}/setup/tlm-config.reference.json` | ✅ ships with the plugin |
| Fillable template | `${CLAUDE_PLUGIN_ROOT}/setup/settings.local.example.json` | ✅ ships with the plugin |

Confirm `.claude/settings.local.json` is ignored before writing a token into it:

```bash
git check-ignore -v .claude/settings.local.json
```

If that prints nothing, add `.claude/settings.local.json` to `.gitignore` **first**.

---

## Step 0 — Answer four questions

`/project-setup` asks these. They decide which of the steps below apply to you.

1. **Project type?** — Next.js Page Router / App Router / React Native Expo / RN CLI / Flutter *(auto-detected, you confirm)*
2. **Build screens from Figma designs?** → gates Step 2
3. **Which ticket system?** — ClickUp / Jira / Linear / Azure DevOps / GitHub Issues / none → gates Step 3
4. **Announce releases in Slack?** → gates Step 4

---

## Step 1 — context7 MCP  · ALWAYS REQUIRED

Fetches current library docs so answers don't come from stale training data. Every skill leans on it.

- [ ] Installed

```bash
claude mcp add context7 -- npx -y @upstash/context7-mcp@latest
```

- [ ] **Verify** — `/mcp` lists `context7`, and `resolve-library-id` returns a hit for a known library.

<details><summary>Manual settings.local.json entry</summary>

```json
"mcpServers": {
  "context7": { "command": "npx", "args": ["-y", "@upstash/context7-mcp@latest"] }
}
```
</details>

---

## Step 2 — Framelink Figma MCP  · only if you build from designs

Needed by **`figma-to-code`** — and it is a **hard requirement**, not a nice-to-have. Without a working
design fetch that skill **stops and writes no UI code**. It will not approximate the screen from a frame
name, a screenshot, or your description: a guessed screen *looks* finished, so nobody re-checks it, and
every wrong spacing, color and hierarchy then gets reviewed as if it were the design.

- [ ] **Get a Figma token** — Figma → avatar → *Settings* → *Security* → *Personal access tokens* →
      *Generate new token*. Scope: **File content (read)**. Starts with `figd_`.
- [ ] **Store the token** in `.claude/settings.local.json` → `env.FIGMA_ACCESS_TOKEN`
- [ ] **Add the server**, referencing the env key rather than inlining the token:

```json
"mcpServers": {
  "framelink-figma": {
    "command": "npx",
    "args": ["-y", "figma-developer-mcp", "--figma-api-key=${FIGMA_ACCESS_TOKEN}", "--stdio"]
  }
}
```

- [ ] **Verify** — paste any Figma file URL and confirm the file metadata comes back.

> ⚠️ **Never inline a `figd_` token into a committed file.** A token pasted directly into
> `mcpServers.args` in a tracked `settings.json` is a leaked credential the moment it's pushed — this
> has happened before in a real repo. Keep the value in `env`, keep the file gitignored, and rotate the
> token in Figma if it ever lands in git history.

---

## Step 3 — Ticket system  · only if the project tracks tickets

Needed by **`ticket-workflow`**, **`mobile-release-notes`**, **`deployment-checklist`**.

### 3a. Connect the tool

- [ ] **ClickUp** — claude.ai → *Settings* → *Connectors* → ClickUp → **Connect** (OAuth, no token stored)
- [ ] **Jira** — Atlassian MCP/connector. Needs site URL `https://<org>.atlassian.net`, account email,
      and an API token from id.atlassian.com → *Security* → *API tokens*
- [ ] **Linear** — `claude mcp add --transport sse linear https://mcp.linear.app/sse`, then authenticate
- [ ] **Azure DevOps** — Azure DevOps MCP, or `az login` + `az devops configure`
- [ ] **GitHub Issues** — no MCP; `gh auth login`

### 3b. Record the project specifics

- [ ] **Ticket id pattern** — auto-detected from history, confirm it:

```bash
git log --oneline -80 | grep -oiE '[A-Z]{2,}-[0-9]+' \
  | sed -E 's/-[0-9]+//' | tr '[:lower:]' '[:upper:]' | sort | uniq -c | sort -rn | head
```

- [ ] **Workspace id + URL template** — from any ticket URL you already have.
      ClickUp: `https://app.clickup.com/t/<workspaceId>/<TICKET>` → template `.../{id}`
- [ ] **Statuses** — fetch one real ticket to see the actual vocabulary, then map:
      `inProgress` (set when work starts) · `inReview` (set when submitted) ·
      `ready[]` (safe to ship; anything else gets flagged at release time)
- [ ] **Deployment ticket?** — does one release ticket's notes list what ships?
- [ ] **Base branch** — `develop` / `main` / `master`

- [ ] **Verify** — fetch one real ticket by its id and get back its name + status.

---

## Step 4 — Slack  · only if you announce releases

Needed by **`mobile-release-notes`**.

- [ ] **Connect** — claude.ai → *Settings* → *Connectors* → Slack → **Connect**
- [ ] **Channel id per app** — Slack → channel → *View channel details* → id at the bottom (`C…`).
      Monorepo: one entry per app, `app` matching a `project.apps[].name`.
- [ ] **Send mode** — leave at **`draft`**.

> Drafts are the default on purpose. Release channels are often Slack Connect / externally shared,
> where a direct send is blocked anyway — and a human should read the note before customers do.
> `send` requires explicit confirmation on every run.

- [ ] **Verify** — create a throwaway draft in the channel and confirm it appears.

---

## Step 5 — Confirm and finish

- [ ] `.claude/settings.local.json` exists and is gitignored
- [ ] `tlm.version` is `1`; every `REPLACE_ME` is gone
- [ ] `/mcp` lists every server your answers require
- [ ] Each integration verified with one real call — not just "it's listed"

Then run any workflow skill. If something is still missing it will ask you at planning time — except a
failed Figma fetch, which stops rather than guessing.

---

## Troubleshooting

| Symptom | Likely cause |
|---------|-------------|
| Skill says config not found | No `tlm` block, or JSON is invalid — `python3 -m json.tool .claude/settings.local.json` |
| `tlm` block disappears after edits | Your Claude Code version strips unknown settings keys → move the block to `.claude/tlm.local.json` (skills read it as a fallback) |
| MCP listed but every call fails | OAuth expired — reconnect the connector, then `/mcp` |
| Figma returns 403 | Token lacks *File content* scope, or the file is in a team you can't access |
| Ticket fetch returns "not found" for a valid id | Custom ids not enabled on the workspace — try the numeric id, or set `workspaceId` |
| Slack post rejected | Channel is externally shared — that's exactly why `sendMode` is `draft` |
