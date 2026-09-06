---
name: tlm-deployment-checklist
description: Generate a release/deployment checklist for any project. Compares the current branch against a chosen base, discovers all ticket IDs in scope, enriches each from the project's ticket-management tool (ClickUp / Jira / Linear / Azure DevOps / GitHub — resolved dynamically), reconciles against the deployment ticket's release notes, then lists the services to deploy and DB migrations to run based on code changes. TRIGGER whenever the user says "release check", "check release", "deployment check", "deployment checklist", "release checklist", "kiểm tra release", "check deploy", or asks to prepare/verify a release before deploying to production.
---

Build a production deployment checklist end-to-end, **adapting to whatever ticket tool the current
project uses**:
**Load/Bootstrap config → Discover tickets (git) → Enrich (ticket tool) → Reconcile (deployment ticket) → Services & Migrations → Output**

This skill is portable: dropped into any repo, it first learns that project's ticket system + layout
(asking the user + guiding MCP setup), saves the answers to **memory**, and reuses them on every later
run so it never re-asks.

> **Design note — base matters.** Long-lived branches (`master` vs `stage`/`develop`) often diverge
> with merge/cherry-pick noise, so a raw `git log base..HEAD` can over-report already-released
> tickets. Git is the *discovery + cross-check*; the **deployment ticket (Phase 3) is the source of
> truth for scope** when one exists.

---

**Input**: Optionally a deployment ticket ID/URL as the skill argument (e.g. `/tlm-deployment-checklist ABC-3000`).

---

## PHASE 0 — LOAD OR BOOTSTRAP PROJECT CONFIG

### 0.1 Try to load saved config from memory

Compute this project's memory dir and read the config file:

```bash
SLUG=$(pwd | sed 's#/#-#g; s#_#-#g')
MEM_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/projects/$SLUG/memory"
cat "$MEM_DIR/tlm-deployment-checklist-config.md" 2>/dev/null || echo "__NO_CONFIG__"
```

The config file (when present) contains a fenced ```json block — parse it into `config`. If found and
valid → **announce** "Loaded release config for this project ({ticketSystem})" and skip to **PHASE 1**.

If output is `__NO_CONFIG__` (or the JSON is missing/invalid) → run the bootstrap below (0.2 → 0.5).

### 0.2 Ask which ticket-management tool this project uses

Use **AskUserQuestion**:
> "Which ticket-management tool does this project use for release tracking?"

Options: **ClickUp**, **Jira**, **Linear**, **Azure DevOps Boards**, **GitHub Issues** (+ Other via free text).

### 0.3 Ensure the tool is reachable — guide MCP setup if not

Map the chosen tool to how tickets get fetched, then **check availability**. Tools surface as
functions named like `mcp__..._<tool>__...`; use **ToolSearch** to confirm the relevant one exists.

| Tool | Fetch mechanism | If NOT available — guide the user |
|------|-----------------|-----------------------------------|
| ClickUp | MCP `mcp__..._ClickUp__clickup_get_task` (accepts custom IDs like `ABC-123`) | Connect the ClickUp connector on claude.ai (Settings → Connectors), or `claude mcp add` the ClickUp MCP server, then reconnect. |
| Jira | Atlassian MCP `...jira_get_issue` / `...atlassian...` | Add Atlassian's official MCP / connector; needs a Jira site URL + API token. |
| Linear | Linear MCP | `claude mcp add --transport sse linear https://mcp.linear.app/sse` then authenticate. |
| Azure DevOps | Azure DevOps MCP, or `az boards work-item show` CLI | Install the Azure DevOps MCP server, or ensure `az` CLI is logged in (`az login`, `az devops configure`). |
| GitHub Issues | `gh` CLI (no MCP needed): `gh issue view <n> --json number,title,state,labels` | Ensure `gh auth status` is authenticated. |

**When a tool needs setup the user must perform** (MCP connect, `az login`, `gh auth login`), tell them
to run it via the `! <command>` prefix in the prompt or the `/mcp` command, then wait and re-verify
with a **test fetch** of one real ticket before continuing. Do not proceed until a fetch succeeds.

### 0.4 Detect & confirm the remaining project specifics

Propose sensible auto-detected defaults, then confirm with the user (AskUserQuestion, editable):

1. **Ticket ID pattern** — infer from recent history and propose:
   ```bash
   git log --oneline -80 | grep -oiE '[A-Z]{2,}-[0-9]+' | sed -E 's/-[0-9]+//' | tr '[:lower:]' '[:upper:]' | sort | uniq -c | sort -rn | head
   ```
   The top prefix → pattern like `ABC-\d+`.
2. **Ready statuses** — which statuses mean "safe to ship" (everything else gets ⚠️). If the tool can
   list statuses (e.g. ClickUp `expand_statuses: true`), fetch one ticket to show the real vocabulary,
   then ask the user which count as ready. Default suggestion: the "ready for production" / "done" /
   "closed" equivalents.
3. **Deployment ticket concept** — does this project track a single deployment/release ticket whose
   notes list what ships? (yes/no) — controls whether PHASE 3 runs.
4. **Default base branch** — e.g. `origin/master` or `origin/main` (still ask each run in Phase 1,
   this is just the default option).
5. **Service & migration layout** — detect the repo type and confirm:
   - `.sln` + `*.csproj` → **.NET**: deployable hosts = projects with a `Program.cs`; find migration
     dirs with `find . -type d -name Migrations -not -path '*/bin/*' -not -path '*/obj/*'`.
   - `package.json` workspaces / `apps/` + `packages/` → **JS monorepo**: deployable = each app;
     migrations = `prisma/migrations`, `drizzle`, etc.
   - single app → one deploy unit.
   Record the detected `deployableUnits` strategy and `migrationPaths` globs.

### 0.5 Save config to memory (so future runs skip all of the above)

Write `$MEM_DIR/tlm-deployment-checklist-config.md` following the memory format, embedding a machine-readable
JSON block for reliable re-parsing:

```markdown
---
name: tlm-deployment-checklist-config
description: Release/deployment tooling config for this project — ticket system, ID pattern, ready statuses, service & migration layout. Used by the tlm-deployment-checklist skill.
metadata:
  type: project
---

This project's release-checklist configuration (edit the JSON to change how `/tlm-deployment-checklist` behaves).

```json
{
  "ticketSystem": "clickup",
  "ticketPattern": "ABC-\\d+",
  "fetch": { "kind": "mcp", "tool": "mcp__..._ClickUp__clickup_get_task", "idParam": "task_id", "notes": "accepts custom IDs directly" },
  "statusField": "status",
  "readyStatuses": ["ready for production", "Closed"],
  "hasDeploymentTicket": true,
  "defaultBase": "origin/master",
  "services": { "strategy": "dotnet-hosts", "migrationPaths": ["**/Migrations/*"] }
}
```
```

Then append one index line to `$MEM_DIR/MEMORY.md`:
`- [Deployment checklist config](tlm-deployment-checklist-config.md) — ticket tool + release layout for /tlm-deployment-checklist`

(For a `gh`/`az` CLI tool, set `"fetch": { "kind": "cli", "cmd": "gh issue view {id} --json number,title,state" }`.)

Confirm: "✓ Saved release config to memory — future runs will use it automatically."

---

## PHASE 1 — CHOOSE BASE & RANGE

`git fetch origin --prune`, then `git branch --show-current` → `currentBranch`.

Ask (AskUserQuestion) which base to compare against, defaulting to `config.defaultBase`:
- `config.defaultBase` (e.g. `origin/master`)
- a previous release branch (`git branch -r | grep -i release`)
- a date window (`--since "<date>"`)

Report range size: `git log --oneline <base>..HEAD | wc -l`. If large (>~150) warn that it likely
includes released history and Phase 3 will be authoritative.

---

## PHASE 2 — DISCOVER TICKETS (git)

```bash
git log --format='%H%x09%s' <base>..HEAD | grep -oiE '<config.ticketPattern>' \
  | tr '[:lower:]' '[:upper:]' | sort -u
```
→ `gitTickets` (keep a representative commit subject per ticket). If empty, stop and tell the user.

---

## PHASE 3 — ENRICH FROM THE TICKET TOOL

For each ticket in `gitTickets`, fetch via `config.fetch` (MCP tool with `idParam`, or the CLI `cmd`
with `{id}` substituted). Record `name` + `status`. Assign readiness:

| Icon | Condition |
|------|-----------|
| ✅ | `status` ∈ `config.readyStatuses` |
| ⚠️ | any other status — **recheck** (print the actual current status beside it) |
| ❓ | ticket not found in the tool |

---

## PHASE 4 — RECONCILE WITH DEPLOYMENT TICKET  *(only if `config.hasDeploymentTicket`)*

Get the deployment ticket (skill arg or ask). Fetch it with full description + linked items. Extract
`deploymentTickets` = ticket IDs in its release notes + linked/subtasks. Reconcile vs `gitTickets`:

- 🔴 **in code, missing from release notes** — confirm intended or add to notes
- 🟡 **in release notes, not in branch** — maybe unmerged / different branch / already in prod
- ✔️ **matched**

If `config.hasDeploymentTicket` is false, skip this phase and note it in the output.

---

## PHASE 5 — SERVICES & MIGRATIONS (from code changes)

`git diff --name-only <base>..HEAD` → map to deploy units per `config.services.strategy`:

- **dotnet-hosts**: reduce each path to its top-level project; a project with `Program.cs` is a
  deployable host. For shared/library projects, walk `ProjectReference` in `*.csproj` to find every
  host that references them (directly/transitively). Flag broadly-referenced shared changes
  (`*.Shared.*`, DB/entities) with "⚠️ verify all listed services". Frontend bundle projects →
  redeploy their serving host (+ note the JS build step).
- **js-monorepo**: map changed paths to `apps/*` / `packages/*`; a changed package → every app that
  depends on it (read `package.json` deps).
- **single-app**: the one app.

**Migrations**: `git diff --name-status <base>..HEAD -- <config.services.migrationPaths>`; list every
**added** migration (ignore snapshot churn) and which DB/context owns it. If none → "No DB migrations."

---

## PHASE 6 — OUTPUT

Write a markdown checklist to the **scratchpad** dir named
`tlm-deployment-checklist-{currentBranch-slug}-{today}.md` with sections:
1. Release Tickets table (Ticket | Name | Status | ✅/⚠️/❓)
2. Reconciliation vs deployment ticket (🔴 / 🟡 / ✔️) — or "N/A (no deployment ticket)"
3. Services to Deploy (checkbox list + reasons; shared-change warning)
4. Database Migrations (checkbox list, or "none")
5. Action Items (recheck ⚠️, resolve 🔴/🟡, deploy, migrate)

Then print a **concise terminal summary** (counts of ✅/⚠️/❓, discrepancies, services, migrations
yes/no) and the file path. Do not dump the full file to the terminal.
