---
name: project-setup
description: Interactive setup walkthrough for this plugin's workflow skills — asks which integrations the project uses (Figma design, ticket system, Slack), checks the required MCP servers, collects the keys/secrets and project facts, then writes .claude/settings.local.json. Also the repair path when a skill reports missing or broken config. TRIGGER whenever the user says "project setup", "setup config", "setup mcp", "config skill", "thiếu config", "setup dự án", "cấu hình mcp", when a workflow skill reports a missing tlm config, or when onboarding this plugin into a new repo.
---

Configure this project for the workflow skills (`figma-to-code`, `ticket-workflow`, `release-notes`,
`deployment-checklist`) in one interactive pass:

**Load existing → Ask 4 gating questions → Check only what's needed → Collect & verify → Write → Report**

Everything lands in `<project>/.claude/settings.local.json` — the Claude Code convention for
machine-local, gitignored config. Nothing is written to a committed file.

> **Working language:** English by default for written config and file content, regardless of the
> language the user triggers in. Match the user's language when talking to them.

**Reference files** — bundled with this plugin, so they resolve from **any** project it's installed in.
Read them rather than reinventing the schema:

```bash
ls "${CLAUDE_PLUGIN_ROOT}/setup/"
```

- `${CLAUDE_PLUGIN_ROOT}/setup/tlm-config.reference.json` — every key: meaning, owning skill, secret?, how to obtain
- `${CLAUDE_PLUGIN_ROOT}/setup/SETUP-CHECKLIST.md` — the human walkthrough, incl. troubleshooting
- `${CLAUDE_PLUGIN_ROOT}/setup/settings.local.example.json` — fillable template

If `CLAUDE_PLUGIN_ROOT` is unset (skill copied into `~/.claude/skills/` rather than installed as a
plugin), look for `setup/` beside the skill directory, then fall back to the schema documented inline
in PHASE 3 — never block on a missing reference file.

**Input**: optionally a capability to (re)configure — `/project-setup figma`, `/project-setup slack`.
With an argument, run only that section and leave the rest untouched.

---

## PHASE 0 — LOAD WHAT ALREADY EXISTS

```bash
CFG=".claude/settings.local.json"
[ -f "$CFG" ] && cat "$CFG" || echo "__NO_CONFIG__"
[ -f ".claude/tlm.local.json" ] && cat ".claude/tlm.local.json" || true
```

- **Valid `tlm` block found** → announce *"Loaded existing setup ({N} integrations configured)"*, then
  jump to **PHASE 3** and re-verify each configured integration. Offer to add or change one.
- **`__NO_CONFIG__` / invalid JSON** → full run below. If the JSON is malformed, show the parse error
  and ask before overwriting — never silently clobber a file the user hand-edited.

**Before writing anything, confirm the file is gitignored:**

```bash
git check-ignore -v .claude/settings.local.json || echo "__NOT_IGNORED__"
```

On `__NOT_IGNORED__`, add `.claude/settings.local.json` to `.gitignore` **first** and say so. Never put
a secret in a tracked file.

---

## PHASE 1 — DETECT, THEN ASK FOUR GATING QUESTIONS

First auto-detect what you can, so the questions come pre-answered:

```bash
git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#origin/##'   # base branch
ls src/app/layout.tsx src/pages/_app.tsx 2>/dev/null                                # router type
grep -l '"expo"\|"expo-router"\|"react-native"' package.json 2>/dev/null
git log --oneline -80 | grep -oiE '[A-Z]{2,}-[0-9]+' | sed -E 's/-[0-9]+//' \
  | tr '[:lower:]' '[:upper:]' | sort | uniq -c | sort -rn | head -3               # ticket prefix
```

Project type mapping: `src/app/` + `layout.tsx` → `nextjs-app-router` · `src/pages/_app.tsx` →
`nextjs-page-router` · `expo` + `expo-router` → `react-native-expo` · `react-native` without `expo` →
`react-native-cli`.

Then ask with **AskUserQuestion** — one call, four questions, detected values shown as the first
option so confirming is one click:

1. **Project type?** → `tlm.project.type` (detected value first)
2. **Build screens from Figma designs?** → gates PHASE 2b
3. **Ticket system?** ClickUp / Jira / Linear / Azure DevOps / GitHub Issues / None → gates PHASE 2c
4. **Announce releases in Slack?** → gates PHASE 2d

Skip any question the argument already scoped out.

---

## PHASE 2 — CHECK & COLLECT, ONLY WHAT THE ANSWERS REQUIRE

For each required integration: **check availability → guide setup if absent → collect values → verify
with one real call.** Use **ToolSearch** to confirm an MCP's tools actually exist; "listed in `/mcp`" is
not proof it works.

When the user must run something themselves (a connector OAuth, `gh auth login`, `az login`), tell them
to run it via the `! <command>` prefix in the prompt or `/mcp`, then **wait and re-verify**. Don't mark
a step done on their say-so alone — re-run the check.

### 2a. context7 — always

Detect: tools matching `mcp__context7__*`.
If absent: `claude mcp add context7 -- npx -y @upstash/context7-mcp@latest`
Verify: `resolve-library-id` on a known library (e.g. "next.js") returns a hit.

### 2b. Framelink Figma — only if answer 2 was yes

Detect: tools matching `mcp__*[Ff]ramelink*` or `mcp__*[Ff]igma*`.

Collect `FIGMA_ACCESS_TOKEN`. Tell the user exactly where to get it: *Figma → avatar → Settings →
Security → Personal access tokens → Generate new token, scope **File content (read)*** — it starts with
`figd_`.

Write it to `env.FIGMA_ACCESS_TOKEN` and reference it from the server args:

```json
"framelink-figma": {
  "command": "npx",
  "args": ["-y", "figma-developer-mcp", "--figma-api-key=${FIGMA_ACCESS_TOKEN}", "--stdio"]
}
```

**Never inline the token into the args.** Never echo it back in your reply.
Verify: ask for any Figma file URL and confirm metadata comes back.

### 2c. Ticket system — only if answer 3 wasn't None

| System | Detect | If absent |
|--------|--------|-----------|
| ClickUp | `mcp__*ClickUp*__clickup_get_task` | claude.ai → Settings → Connectors → ClickUp → Connect (OAuth) |
| Jira | `mcp__*[Aa]tlassian*` / `*jira*` | Atlassian MCP; needs site URL + email + API token from id.atlassian.com |
| Linear | `mcp__*[Ll]inear*` | `claude mcp add --transport sse linear https://mcp.linear.app/sse` |
| Azure DevOps | Azure DevOps MCP, or `az` CLI | Install the MCP, or `az login && az devops configure` |
| GitHub Issues | `gh auth status` | `gh auth login` |

Then collect, proposing the detected value each time:

- `idPattern` — from the prefix detected in PHASE 1 (e.g. `TLM-\d+`)
- `workspaceId` + `urlTemplate` — ask the user to paste any ticket URL and parse both out of it
- `statuses` — **fetch one real ticket with statuses expanded first**, show the actual status
  vocabulary, then ask which mean in-progress / in-review / ready-to-ship. Don't guess these.
- `hasDeploymentTicket`, `planDir` (default `_docs`), `baseBranch`

Verify: fetch one real ticket by id; you must get back a name and a status.

### 2d. Slack — only if answer 4 was yes

Detect: `mcp__*Slack*__slack_send_message_draft`.
If absent: claude.ai → Settings → Connectors → Slack → Connect.

Collect one channel per app (monorepo: match `app` to a `project.apps[].name`). Tell the user where the
id is: *Slack → channel → View channel details → id at the bottom* (`C…`).

Keep `sendMode: "draft"`. Only set `"send"` if the user explicitly insists — and say plainly that
release channels are frequently externally shared, where a direct send is blocked anyway and a human
review is the point.

---

## PHASE 3 — WRITE `.claude/settings.local.json`

Merge into the existing file — **preserve keys you didn't touch** (`permissions`, `hooks`, other
`mcpServers`). Structure and every key's meaning: `${CLAUDE_PLUGIN_ROOT}/setup/tlm-config.reference.json`.
Fillable shape: `${CLAUDE_PLUGIN_ROOT}/setup/settings.local.example.json`.

- Set `tlm.version` to the reference's `configVersion`.
- Omit disabled capabilities rather than writing `"enabled": false` with empty scaffolding — except
  keep the explicit `enabled: false` so a later run knows it was *answered*, not *unasked*.
- If a write of the `tlm` key fails or the key vanishes on reload, write the block alone to
  `.claude/tlm.local.json` and tell the user — skills read that as a fallback.

Then re-read the file and parse it, to prove it's valid JSON.

---

## PHASE 4 — REPORT

One compact status line per integration — configured / skipped by choice / needs the user to act:

```
context7    ✅ verified
framelink   ✅ verified (token stored in env)
clickup     ⚠️  connector not authorized — connect at claude.ai → Settings → Connectors, then /mcp
slack       — skipped (not used by this project)

✓ Wrote .claude/settings.local.json (gitignored)
```

Never print a secret value — say *"token stored"*, not the token. Finish by naming which skills are now
usable, and list anything still outstanding with the exact next action.

---

## HOW OTHER SKILLS USE THIS

Each workflow skill runs a **pre-flight** that reads `tlm` from `.claude/settings.local.json` (falling
back to `.claude/tlm.local.json`), then follows `skillRequirements` in the reference file.

**A missing value is never a hard stop.** The rule for every skill:

1. Do everything that doesn't depend on the missing value first.
2. Ask for it **inline, during planning** — one focused question, with where to get it.
3. Offer to persist it so the next run doesn't ask again.
4. If the user can't supply it now, degrade explicitly and say what's reduced — e.g. `figma-to-code`
   scaffolds from a description instead of the design; `release-notes` prints the note for manual
   posting instead of drafting to Slack.

Only refuse to continue when proceeding would be *wrong* rather than merely *reduced* — e.g. posting to
an unverified Slack channel id, or updating a ticket whose status vocabulary is unknown.
