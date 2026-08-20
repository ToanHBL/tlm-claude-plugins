---
name: project-setup
description: Scan this project for missing workflow-skill config, ask the gating questions in ONE round, then present a single fill-in form for every value the user must supply — each with instructions on where to get it — and write .claude/settings.local.json. Also the repair path when a skill reports missing or broken config. TRIGGER whenever the user says "project setup", "setup config", "setup mcp", "config skill", "thiếu config", "setup dự án", "cấu hình mcp", when a workflow skill reports a missing tlm config, or when onboarding this plugin into a new repo.
---

Configure this project for the workflow skills (`figma-to-code`, `ticket-workflow`,
`mobile-release-notes`, `deployment-checklist`) with **one round of questions and one form**:

**Scan → Ask once (gating) → Show ONE fill-in form → Verify → Write → Report**

The rule that shapes this skill: **never drip-feed questions.** Detect everything detectable first, ask
all the gating questions in a single call, then collect every remaining value in a single form. A user
should never be asked for a Figma token, then later a channel id, then later a workspace id.

Everything lands in `<project>/.claude/settings.local.json` — the Claude Code convention for
machine-local, gitignored config. Nothing is written to a committed file.

> **Working language:** English for written config and file content, regardless of the language the user
> triggers in. Match the user's language when talking to them.

**Reference files** — bundled with this plugin, so they resolve from **any** project it's installed in:

```bash
ls "${CLAUDE_PLUGIN_ROOT}/setup/"
```

- `${CLAUDE_PLUGIN_ROOT}/setup/tlm-config.reference.json` — every key: meaning, owning skill, secret?, how to obtain
- `${CLAUDE_PLUGIN_ROOT}/setup/SETUP-CHECKLIST.md` — the human walkthrough, incl. troubleshooting
- `${CLAUDE_PLUGIN_ROOT}/setup/settings.local.example.json` — fillable template

If `CLAUDE_PLUGIN_ROOT` is unset (skill copied into `~/.claude/skills/` rather than installed as a
plugin), look for `setup/` beside the skill directory, then fall back to the schema documented in
PHASE 4 — never block on a missing reference file.

**Input**: optionally one capability to (re)configure — `/project-setup figma`, `/project-setup slack`,
`/project-setup tickets`. With an argument, scan and fix only that section and leave the rest untouched.

---

## PHASE 0 — SCAN

Gather **everything** before asking anything. Run these together.

### 0.1 Existing config

```bash
CFG=".claude/settings.local.json"
[ -f "$CFG" ] && cat "$CFG" || echo "__NO_CONFIG__"
[ -f ".claude/tlm.local.json" ] && cat ".claude/tlm.local.json" || true
git check-ignore -v .claude/settings.local.json 2>/dev/null || echo "__NOT_IGNORED__"
```

- **Valid `tlm` block found** → this is a **repair run**. Keep every value that's already good; the form
  in PHASE 2 lists only what's missing, placeholder (`REPLACE_ME`), or failing verification.
- **Malformed JSON** → show the parse error and ask before overwriting. Never silently clobber a
  hand-edited file.
- **`__NOT_IGNORED__`** → add `.claude/settings.local.json` to `.gitignore` **first**, and say so. Never
  put a secret in a tracked file.

### 0.2 Project facts

```bash
git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#origin/##'   # base branch
ls src/app/page.tsx src/app/layout.tsx src/pages/_app.tsx 2>/dev/null              # router type
ls src/app/api 2>/dev/null && echo "has app/api"
ls pubspec.yaml 2>/dev/null && echo "flutter"
grep -o '"\(expo\|expo-router\|react-native\|next\)"' package.json 2>/dev/null | sort -u
git log --oneline -80 | grep -oiE '[A-Z]{2,}-[0-9]+' | sed -E 's/-[0-9]+//' \
  | tr '[:lower:]' '[:upper:]' | sort | uniq -c | sort -rn | head -3               # ticket prefix
ls apps/ packages/ 2>/dev/null                                                      # monorepo apps
```

Stack mapping: `src/app/page.tsx` → `nextjs-app-router` · `src/pages/_app.tsx` → `nextjs-page-router`
(`app/api/**` without `app/page.tsx` is its Mode B) · `expo` + `expo-router` → `react-native-expo` ·
`react-native` without `expo` → `react-native-cli` · `pubspec.yaml` → `flutter`.

### 0.3 MCP availability

Use **ToolSearch** to check which are actually present: `mcp__context7__*`,
`mcp__*[Ff]ramelink*`/`mcp__*[Ff]igma*`, `mcp__*ClickUp*`/`*[Aa]tlassian*`/`*[Ll]inear*`,
`mcp__*Slack*`. Also `gh auth status` if GitHub Issues is plausible.

`context7` and `framelink-figma` **ship with the plugin** (bundled `mcpServers`), so they should already
be present — if they aren't, the plugin didn't load or `npx`/Node is unavailable, not a per-project
config gap. ClickUp/Slack are OAuth connectors and Linear/GitHub are user-added — those genuinely may be
absent. Being listed is not proof it works — that's PHASE 3's job. Here you only need present vs absent.

### 0.4 Existing project rules & specs (do NOT steamroll them)

This plugin's house rules **layer on top of** whatever the project already documents — and **defer to an
explicit project rule where they conflict**. Detect what's already here so the project's own conventions
keep being applied:

```bash
ls CLAUDE.md AGENTS.md .cursorrules .windsurfrules .github/copilot-instructions.md 2>/dev/null
ls -d .claude/rules .cursor/rules 2>/dev/null                 # rule folders
ls -d openspec docs/specs docs/adr 2>/dev/null                # existing specs / ADRs
ls .eslintrc* eslint.config.* .prettierrc* biome.json* .editorconfig tsconfig*.json 2>/dev/null
ls .claude/codebase-map.md 2>/dev/null                        # prior scan, if any
```

- **Read** each that exists. Note where the project **agrees** with the house rules (reinforce) and
  where it **conflicts** (e.g. it allows raw HTML, uses a different nav pattern, relaxes strict TS).
- **Conflict resolution: the project's explicit rule wins for that project.** Record and apply it;
  surface the conflict to the user, and if it's worth persisting route it through `rule-capture` (which
  writes a project-scoped override to this repo's `CLAUDE.md`). Never silently replace a documented
  project convention with the plugin default.
- An existing **`openspec/`** means spec-driven is already set up → plan to set
  `tlm.specDriven.engine="openspec"` in PHASE 4 (see the `spec-driven` skill).
- **Record the catalog** in `.claude/codebase-map.md` under a `project rules:` line (sources found +
  any overrides), so later sessions and `fe-coding` read it before applying defaults.

---

## PHASE 1 — ASK ONCE (gating questions only)

**One AskUserQuestion call. Four questions. Detected value as the first option** so confirming is one
click. These four decide which sections exist at all — nothing else is asked here.

1. **Project type?** → `tlm.project.type` (detected value first)
2. **Build screens from Figma designs?** → gates the design section
3. **Ticket system?** ClickUp / Jira / Linear / Azure DevOps / GitHub Issues / None → gates tickets
4. **Announce releases in chat (Slack)?** → gates chat

Skip any question the skill argument already scoped out, or that existing config already answers on a
repair run. If all four are already answered, go straight to PHASE 2.

---

## PHASE 2 — SHOW ONE FILL-IN FORM

Now you know exactly which values are needed and which you already have. Present **everything
outstanding at once**, as a form the user fills in one pass.

**Write the form to `.claude/settings.local.json`** with detected values already filled and each missing
value marked `<<FILL: what it is>>`, with a comment giving the exact steps to obtain it:

```jsonc
{
  // NOTE: context7 + framelink-figma MCP servers ship WITH the plugin (bundled in plugin.json).
  // Do NOT add them to mcpServers here — they load automatically on install. This project only
  // supplies the Figma token below (the bundled server reads ${FIGMA_ACCESS_TOKEN} from env).
  "env": {
    // Figma → avatar → Settings → Security → Personal access tokens → Generate new token
    // Scope: "File content" (read). Starts with figd_
    "FIGMA_ACCESS_TOKEN": "<<FILL: Figma personal access token>>"
  },
  "tlm": {
    "version": 1,
    "project": { "name": "acme-installer", "type": "react-native-expo", "baseBranch": "develop" },
    "tickets": {
      "enabled": true,
      "system": "clickup",
      "idPattern": "TLM-\\d+",
      // Paste any ticket URL and I'll fill workspaceId + urlTemplate from it:
      //   https://app.clickup.com/t/<workspaceId>/TLM-1234
      "workspaceId": "<<FILL: from any ticket URL>>",
      "urlTemplate": "<<FILL: derived from the URL above>>",
      // I'll fetch one real ticket and show you the actual status names to pick from
      "statuses": { "inProgress": "<<FILL>>", "inReview": "<<FILL>>", "ready": ["<<FILL>>"] }
    },
    "chat": {
      "enabled": true, "system": "slack", "sendMode": "draft",
      // Slack → open the channel → View channel details → id at the bottom (starts with C)
      "channels": [{ "app": "Installer", "id": "<<FILL: channel id>>", "name": "<<FILL: #channel>>" }]
    }
  }
}
```

Then print **one compact table** in the terminal — the actual form, so the user can answer in chat
without opening the file:

```
Fill these in (edit .claude/settings.local.json, or just paste the values here):

  #  Value                    Where to get it
  1  Figma token              Figma → avatar → Settings → Security → Personal access
                              tokens → Generate. Scope "File content". Starts with figd_
  2  Any ClickUp ticket URL   Open any ticket, copy the address bar. I'll extract the
                              workspace id and build the link template from it.
  3  Slack channel id         Slack → channel → View channel details → id at the bottom (C…)

Also needs your action (I can't do these for you):
  •  ClickUp connector    claude.ai → Settings → Connectors → ClickUp → Connect
  •  Slack connector      claude.ai → Settings → Connectors → Slack → Connect
     Then run /mcp here to confirm both are listed.

Reply when done, or paste the values and I'll write them in.
```

**Rules for the form:**

- **One form, not a conversation.** Every outstanding value appears here. Don't discover a fifth thing
  three messages later — that's the failure this phase exists to prevent.
- **Ask for the source, not the parsed value.** A ticket URL is easier to paste than a workspace id, and
  you can derive both `workspaceId` and `urlTemplate` from it. Same for anything else you can parse.
- **Every row carries its instructions.** "Figma token" alone is not actionable; the click path is.
- **Separate what the user must do themselves** (OAuth connectors, `gh auth login`, `az login`) from
  values they paste. Tell them to run commands via the `! <command>` prefix or `/mcp`.
- **Don't ask for what you can fetch.** Ticket statuses come from a real ticket once the tracker is
  connected — fetch, show the real vocabulary, then ask which mean in-progress / in-review / ready.
  Never guess these, and never make the user type them blind.
- **Never echo a secret back**, in the terminal or in your reply. Confirm with "token stored".

---

## PHASE 3 — VERIFY EACH INTEGRATION

Once values are in, prove each one works with **one real call**. Listed in `/mcp` is not working.

| Integration | Verification |
|-------------|-------------|
| context7 | `resolve-library-id` on a known library (e.g. "next.js") returns a hit |
| Framelink Figma | Fetch metadata for a real Figma file URL |
| Ticket tracker | Fetch one real ticket by id — must return a name **and** a status |
| Slack | Create a throwaway draft in the target channel |

Failures come back as **one batch**, not one at a time — same principle as the form. For each: what
failed, the likely cause, the fix. Common ones: Figma 403 → token lacks *File content* scope or expired;
ticket "not found" for a valid id → custom ids not enabled, try the numeric id; Slack post rejected →
externally shared channel, which is exactly why `sendMode` stays `draft`.

Ticket statuses are collected **here**, after the tracker verifies: fetch one ticket with statuses
expanded, show the real list, ask which map to `inProgress` / `inReview` / `ready[]`.

---

## PHASE 4 — WRITE

Merge into the existing file — **preserve keys you didn't touch** (`permissions`, `hooks`, other
`mcpServers`). Structure and every key's meaning:
`${CLAUDE_PLUGIN_ROOT}/setup/tlm-config.reference.json`. Fillable shape:
`${CLAUDE_PLUGIN_ROOT}/setup/settings.local.example.json`.

- Strip every `<<FILL: …>>` marker and instructional comment — the final file is clean JSON.
- Set `tlm.version` to the reference's `configVersion`.
- For a capability the user declined, write `"enabled": false` (not an omission) so a later run knows it
  was **answered**, not **unasked**. Skip its empty scaffolding.
- Keep `chat.sendMode` at `"draft"` unless the user explicitly insists otherwise.
- If PHASE 0.4 found an `openspec/` directory, set
  `tlm.specDriven = { "engine": "openspec", "mode": "ask-per-ticket", "announceCommands": true }`.
- Do **not** write a `mcpServers` block for `context7` or `framelink-figma` — they are bundled by the
  plugin. Only the Figma **token** goes in `env`. Add `mcpServers` only for a server the plugin doesn't
  bundle.
- If the `tlm` key fails to write or vanishes on reload, write that block alone to
  `.claude/tlm.local.json` and say so — skills read it as a fallback.

Re-read and parse the file afterwards to prove it's valid JSON.

---

## PHASE 5 — REPORT

One compact status line per integration:

```
context7    ✅ bundled, verified
framelink   ✅ bundled, verified (token stored in env)
clickup     ⚠️  connector not authorized — claude.ai → Settings → Connectors, then /mcp
slack       — skipped (not used by this project)

project rules found:  CLAUDE.md, .eslintrc, openspec/ (spec-driven on)  → honored; 1 conflict noted
✓ Wrote .claude/settings.local.json (gitignored) · catalog in .claude/codebase-map.md
✓ Ready now:  fe-coding, figma-to-code, rule-capture, spec-driven
⚠ Blocked:    ticket-workflow, deployment-checklist — connect the ClickUp connector above
```

If PHASE 0.4 surfaced a project rule that **conflicts** with a house rule, name it here and say it will
be honored for this project (routed through `rule-capture` if it should persist).

Never print a secret value. Finish by naming which skills are usable now, and list anything still
outstanding with its exact next action.

---

## HOW OTHER SKILLS USE THIS

Each workflow skill runs a pre-flight that reads `tlm` from `.claude/settings.local.json` (falling back
to `.claude/tlm.local.json`), then follows `skillRequirements` and the `companions` block in the
reference file. The SessionStart hook (`hooks/setup-check.sh`) surfaces a broken baseline (missing
`jq`/`node`) and an incomplete config at session start; it informs, it doesn't block — the *skills*
enforce.

**A capability is all-or-nothing (see `companions`).** If a capability is `enabled:true`, its companions
are **required** — connected *and* verified — before the owning skill runs:

1. If a companion is missing, **stop that skill** and give the user two choices: finish setup via
   `/project-setup`, or set the capability's `enabled:false`. Do **not** run a degraded / "local-only"
   version of an enabled capability.
2. Within a *connected* capability, a still-missing single **value** (a channel id, a status name) is
   asked for **inline during planning**, batched, with where to get it — then persisted. The requirement
   is on the companion being connected and verified, not on collecting every value up front.
3. The **baseline** (context7, `jq`, `node`) is expected everywhere; `jq`/`node` absences are surfaced
   loudly because the hooks and npx servers silently no-op without them.

**`figma-to-code` is the hardest stop.** Design enabled but the file unfetchable → it writes no UI code.
There is no reduced version — a screen built from a guess looks finished, so nobody re-checks it, and
every wrong value gets reviewed as if it were the design.

**`spec-driven` is the one that degrades**, not blocks — it's opt-in per ticket and falls back to
ordinary `fe-coding` if OpenSpec (Node ≥ 20.19) isn't available.

**Coding skills (`fe-coding`, `rule-capture`) have no capability companions and always run**, even with
zero config.
