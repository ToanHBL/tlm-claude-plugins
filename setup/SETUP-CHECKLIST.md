# Setup Checklist — Walkthrough

Everything a project must configure before the workflow skills (`figma-to-code`, `ticket-workflow`,
`mobile-release-notes`, `deployment-checklist`) can run.

This ships with the plugin, so it applies to **any** project you install it into — not just this repo.

**Don't work through this by hand.** Run `/project-setup` — it scans what it can detect, asks the
gating questions in **one** round, then shows **one** form with every value you still need to supply
(each with instructions), verifies each integration with a real call, and writes the config for you.
This file is the reference it follows, and the thing to read when something breaks.

> **A capability is all-or-nothing.** Each capability below (design / tickets / chat) is either
> **enabled with every companion installed *and* verified**, or **turned off**. A workflow skill will
> **not** run a half-configured capability — if a companion is missing it stops and points you back here
> (or to `/project-setup`) to finish setup or set that capability's `enabled:false`. There is no
> degraded "local-only" middle mode. *Single values* within a connected capability (a channel id, a
> status name) are still asked inline during planning — the requirement is on the companion being
> connected and verified.
>
> **Figma is the hardest stop** (Step 2): with design enabled but the file unfetchable, `figma-to-code`
> writes no UI code rather than approximating the design. **`spec-driven` is the exception that
> degrades** — it's opt-in per ticket and falls back to ordinary coding if OpenSpec isn't available.
>
> **Coding needs none of this.** `fe-coding` and `rule-capture` have no capability companions and run
> with zero config.
>
> **Two steps are not capabilities and apply to every project.** Step 4.5 installs the rules copy this
> project runs on, and Step 4.6 registers the other repos of your system so Claude reads their real
> contracts instead of guessing them.
>
> **Were you sent a setup file?** Then skip most of this — go to **Step 0.5** and run
> `/project-setup init`. Nearly everything below is already answered in it.

---

## Where things live

| What | Where | Committed? |
|------|-------|-----------|
| API keys, tokens, secrets | `.claude/settings.local.json` → `env` | ❌ gitignored |
| MCP server definitions | `.claude/settings.local.json` → `mcpServers` | ❌ gitignored |
| Project config (ticket system, channels, branch…) | `.claude/settings.local.json` → `tlm` | ❌ gitignored |
| A handed-over init doc (Step 0.5) | `.claude/tlm-init.json` | ❌ gitignored, deleted after import |
| **The rules this project runs on** | `.claude/tlm-plugin/` (Step 4.5) | ✅ **committed** |
| Map of the system's other repos | `.claude/ecosystem-map.md` (Step 4.6) | ✅ committed |
| What every key *means* | `<rulesRoot>/setup/tlm-config.reference.json` | ✅ ships with the plugin |
| Fillable template | `<rulesRoot>/setup/settings.local.example.json` | ✅ ships with the plugin |

`<rulesRoot>` is `.claude/tlm-plugin/` when that exists, else `${CLAUDE_PLUGIN_ROOT}` — see Step 4.5.

Confirm `.claude/settings.local.json` is ignored before writing a token into it:

```bash
git check-ignore -v .claude/settings.local.json
```

If that prints nothing, add `.claude/settings.local.json` to `.gitignore` **first**.

---

## Prerequisites — baseline companion tools (always)

Install these before anything else — they're the baseline every capability builds on
(`companions.baseline` in `tlm-config.reference.json`):

- [ ] **Node.js** — runs the plugin's own hooks, the rules-PR script (`plugin-pr.mjs`), the ecosystem
      script (`ecosystem.mjs`), the MCP launcher that starts context7 + Framelink, and the OpenSpec CLI. `node -v`. Use **≥ 20.19** if
      you'll use `spec-driven`. Windows: the official installer or `winget install OpenJS.NodeJS`.
- [ ] **git** — the SessionStart hook's gitignore safety check, the rules PR, cloning the sibling repos
      of Step 4.6, and the ticket discovery the release skills do over commit ranges. `git --version`. Windows: Git for Windows.
- [ ] **context7 MCP** — see Step 1 (recommended for every skill).

> Those two are the whole list, identically on Windows, macOS and Linux. There is deliberately **no
> `jq` / `bash` / `rsync` requirement** — the hooks and scripts are Node, precisely so Windows works.

---

## Step 0 — Answer four questions

`/project-setup` asks these in one round. They decide which of the steps below apply to you.

1. **Project type?** — Next.js Page Router / App Router / React Native Expo / RN CLI / Flutter *(auto-detected, you confirm)*
2. **Which ticket system?** — ClickUp / Jira / Linear / Azure DevOps / GitHub Issues / none → gates Step 3
3. **Which of these do you use?** *(tick any)* — **Figma designs** → gates Step 2 ·
   **Slack release announcements** → gates Step 4
4. **Which other repos of your system does this project read?** *(tick from the ones it detected, or add
   a path / git URL)* → gates Step 4.6. Nothing ticked = standalone.

---

## Step 0.5 — Were you sent an init doc?  · the fast path

If someone on your team sent you a setup file (`tlm-init.json`) along with the init command, those four
questions and most of the steps below are **already answered**. They were answered once, by whoever set
this project up — which is the point: two people answering "what is the in-review status called" is two
people getting it slightly different.

- [ ] Save the file into the project as **`.claude/tlm-init.json`**
- [ ] Run **`/project-setup init`**
- [ ] Answer only what it asks — a file cannot carry your **own Figma token** or click **Connect** on the
      ClickUp / Slack connectors for you

That's it. What still happens on your machine regardless: each integration is verified with one real
call (Step 5), the rules copy is installed (Step 4.5), and the sibling repos are cloned (Step 4.6) — the
doc carries their git URLs, not their clones.

Pasted the JSON into the chat instead of saving a file? Say so — Claude writes it to the same path and
continues identically.

The doc is gitignored on import and **deleted once it's applied and verified** (`init.mjs consume`). It
is single-use: it goes stale the moment the team's config changes, so ask for a fresh one instead of
keeping a copy. A `<<FILL: …>>` left in it counts as unanswered and simply gets asked; a value you
already have on this machine (your token, your clone paths) is never overwritten by the file; and
`permissions` or `hooks` in a doc are refused outright — a file that arrives over chat is not how tool
access gets granted.

### Sending one (the lead's side)

In a project that is already configured and working:

```bash
node <rulesRoot>/skills/project-setup/init.mjs template --from-current --out ~/tlm-init.json --for "installer team"
```

It reads your `.claude/settings.local.json`, **leaves secrets out** (a shared Figma token attributes
every read to you and breaks for everyone when it's rotated), strips per-machine paths, and prints the
message to send with the file. Review it first — it carries your tracker ids, channel ids and repo URLs.
`--with-secrets` puts real tokens in: the file becomes a credential, so send it like a password and have
the recipient delete it after. No project to copy from? `init.mjs template --out ~/tlm-init.json` writes
the annotated blank (`setup/tlm-init.template.json`).

---

## Step 1 — context7 MCP  · BUNDLED WITH THE PLUGIN

Fetches current library docs so answers don't come from stale training data. Every skill leans on it.

**Nothing to install** — context7 ships with the plugin (bundled `mcpServers`) and loads automatically on
install. You only need Node available for `npx`.

- [ ] **Verify** — `/mcp` lists `context7`, and `resolve-library-id` returns a hit for a known library.
- [ ] If it's **not** listed: the plugin didn't load, or `npx`/Node is missing — not a per-project gap.
- [ ] **Optional API key** — context7 works without one. A key only raises rate limits: get it at
      context7.com/dashboard (`ctx7sk-…`) and store it in `.claude/settings.local.json` → `env.CONTEXT7_API_KEY`.
      The bundled server expands `${CONTEXT7_API_KEY}` from there; leave it out entirely if you have no key.
      (Applies after a Claude Code reload picks up the new env.)

---

## Step 2 — Framelink Figma MCP  · only if you build from designs

> **Framelink *is* how this plugin reads Figma** — it's the alternative to Claude's built-in "Figma"
> connector, and the one `figma-to-code` targets. Use Framelink; you do **not** need to enable the native
> claude.ai Figma connector (leave it off in claude.ai → *Settings* → *Connectors*). "Figma" words in a
> prompt still trigger the skill — it just fetches through Framelink.

Needed by **`figma-to-code`** — and it is a **hard requirement**, not a nice-to-have. Without a working
design fetch that skill **stops and writes no UI code**. It will not approximate the screen from a frame
name, a screenshot, or your description: a guessed screen *looks* finished, so nobody re-checks it, and
every wrong spacing, color and hierarchy then gets reviewed as if it were the design.

The Framelink server itself is **bundled with the plugin** — you do **not** add it to `mcpServers`. It
reads the token from your project's env, so all you supply is the token:

- [ ] **Get a Figma token** — Figma → avatar → *Settings* → *Security* → *Personal access tokens* →
      *Generate new token*. Scope: **File content (read)**. Starts with `figd_`.
- [ ] **Store the token** in `.claude/settings.local.json` → `env.FIGMA_ACCESS_TOKEN` (the bundled server
      expands `${FIGMA_ACCESS_TOKEN}` from there).
- [ ] **Verify** — paste any Figma file URL and confirm the file metadata comes back.

> ⚠️ **Never inline a `figd_` token into a committed file.** A token pasted directly into
> `mcpServers.args` in a tracked `settings.json` is a leaked credential the moment it's pushed — this
> has happened before in a real repo. Keep the value in `env`, keep the file gitignored, and rotate the
> token in Figma if it ever lands in git history.

---

## Step 3 — Ticket system  · only if the project tracks tickets

Needed by **`ticket-workflow`**, **`mobile-release-notes`**, **`deployment-checklist`**, **`ba-ticket`**.

### 3a. Connect the tool

- [ ] **ClickUp** — claude.ai → *Settings* → *Connectors* → ClickUp → **Connect** (OAuth, no token stored)
- [ ] **Jira** — Atlassian MCP/connector. Needs site URL `https://<org>.atlassian.net`, account email,
      and an API token from id.atlassian.com → *Security* → *API tokens*
- [ ] **Linear** — `claude mcp add --transport sse linear https://mcp.linear.app/sse`, then authenticate
- [ ] **Azure DevOps** — Azure DevOps MCP, or `az login` + `az devops configure`
- [ ] **GitHub Issues** — claude.ai → *Settings* → *Connectors* → GitHub → **Connect** (OAuth, preferred),
      or fall back to the `gh` CLI: `gh auth login`

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
- [ ] **BA ticket writing (optional)** — `baTemplates` ships team defaults (task `t-86d3tgzn8`,
      bug `t-86d08309p`); override only if your workspace uses different templates.
      `defaultListId` (where `ba-ticket` creates tickets) can be set now or on first use.

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

## Step 4.5 — This project's rules copy  · installed by default

`/project-setup` copies the plugin's `skills/ ai/ hooks/ setup/` into **`.claude/tlm-plugin/`** (committed)
and **that copy is what this project runs on**:

> **Rules root** = `<project>/.claude/tlm-plugin/` if present, else `${CLAUDE_PLUGIN_ROOT}`.
> Skills read their rules from that root, and the plugin's hooks delegate to the hooks there.

Why it is not the installed plugin: `${CLAUDE_PLUGIN_ROOT}` is a Claude Code **managed clone that
`/plugin marketplace update` overwrites**, so a rule changed there is lost and never reaches anyone. The
copy in the repo is editable, reviewable in a PR like any other change, and shared by everyone who clones
the repo.

- [ ] **Installed** — `.claude/tlm-plugin/` exists and is **committed**. (An uncommitted copy means each
      contributor silently runs different rules.)
- [ ] **Edit a rule** — correct Claude as usual; `rule-capture` writes it into this copy. It takes effect
      **immediately** here; the `vendor-watch` hook then reminds Claude to ship it.
- [ ] **Review before shipping** — `node .claude/tlm-plugin/skills/rule-capture/plugin-pr.mjs diff`
      prints exactly what a PR would change upstream. Nothing is written or pushed. Read it.
- [ ] **Ship it** — `… plugin-pr.mjs open <slug>` clones the upstream (`ToanHBL/tlm-claude-plugins`, base
      `develop`), mirrors this copy onto `rule/<slug>`, bumps the version in lockstep, pushes, and opens
      the PR with `gh` (compare URL if `gh` is absent). Teammates get it after they run
      `/plugin marketplace update`.
- [ ] **Upstream reachable?** — `… plugin-pr.mjs preflight`. If the clone fails, `upstreamRemote` may be
      an **SSH host alias** (`git@github.com-hbl:…`) that only exists in one machine's `~/.ssh/config`.
      Put the URL that works on *your* machine in `tlm.pluginRepo.upstreamRemote`.

Only `git` is required; `gh` is optional (without it you get a compare URL to click). Set
`tlm.pluginRepo.enabled=false` only for a repo that must run purely on the installed plugin — you then
lose the ability to change or ship rules from it.

---

## Step 4.6 — The other repos of your system  · if this project isn't standalone

Most projects here are one piece of a bigger system: a screen calls an API owned by another repo, a type
comes from a shared package, a mobile flow mirrors a web one. Register those repos and Claude opens the
**real** file instead of inventing the contract — a guessed endpoint shape looks right, passes review, and
fails at runtime.

- [ ] **List them** — for each: a **folder path** (already on disk), a **git URL**, or just the
      **browse URL you copy from your browser** (a GitHub `…/tree/<branch>` page, an Azure DevOps
      `…/_git/<repo>?version=GB<branch>` page — `add` turns it into a clone URL + branch); plus a `role`
      (backend / web / mobile / shared-lib / design-system / infra) and one line of `notes` on what this
      project actually uses from it.
- [ ] **Register + fetch** (`/project-setup` does this for you):

```bash
RULES=".claude/tlm-plugin"; [ -d "$RULES" ] || RULES="${CLAUDE_PLUGIN_ROOT}"
node "$RULES/skills/project-setup/ecosystem.mjs" add ~/Projects/tlm-api --role backend --notes "REST API this app calls"
node "$RULES/skills/project-setup/ecosystem.mjs" add git@github.com:acme/tlm-web.git --role web --ref develop
node "$RULES/skills/project-setup/ecosystem.mjs" add "https://github.com/acme/tlm-web/tree/develop" --role web   # pasted browse URL
node "$RULES/skills/project-setup/ecosystem.mjs" add "https://dev.azure.com/org/_git/api?version=GBstage" --role backend
node "$RULES/skills/project-setup/ecosystem.mjs" sync    # clone what's missing, fetch what's there (needs your git auth for private repos)
node "$RULES/skills/project-setup/ecosystem.mjs" index   # write .claude/ecosystem-map.md (+ "How these repos relate")
```

- [ ] **Where clones land** — one shared `workspaceRoot` per machine (default `~/tlm-ecosystem`), so
      several projects referencing the same sibling share a single checkout. Shallow by default
      (`depth: 1`); set `depth: 0` on a repo whose git history you actually need to read.
      A repo given as a **folder path stays where it is** — nothing is moved or copied.
- [ ] **The map** — `.claude/ecosystem-map.md` (committed, no secrets) is what `fe-coding` reads before
      assuming anything cross-repo. Per repo it records stack, layout, contract paths and the repo's own
      rules, and ends with a **"How these repos relate"** section (repos grouped by role + any detected
      shared-package dependency) — the cross-project relationship view. Re-run `index` after adding a repo;
      never hand-edit it.
- [ ] **Registered per project** — each repo lists only the siblings *it* needs, so an unrelated repo is
      never pulled into context.
- [ ] **Verify** — `… ecosystem.mjs list` shows every repo as `present`.

> **These repos are read-only reference.** Claude opens files in them and never edits, commits or runs
> anything there. A cross-repo change is your call and a separate PR in that repo.

Standalone project? Answer **no** and `tlm.ecosystem.enabled=false` is written — you won't be asked again.

---

## Step 5 — Confirm and finish

- [ ] `.claude/settings.local.json` exists and is gitignored
- [ ] `tlm.version` is `2`; every `REPLACE_ME` is gone
- [ ] No `tlm-init.json` left in the repo — imported and deleted (`init.mjs consume`)
- [ ] `.claude/tlm-plugin/` exists and is **committed** (the rules this project runs on)
- [ ] `.claude/ecosystem-map.md` is current, or `tlm.ecosystem.enabled` is `false`
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
| A rule change has no effect | It went into `${CLAUDE_PLUGIN_ROOT}` instead of `.claude/tlm-plugin/`, or that directory doesn't exist yet — run `/project-setup` |
| `plugin-pr.mjs` clone/fetch fails | `upstreamRemote` is an SSH host alias that doesn't exist on this machine — set the URL that works for you |
| Claude invents an endpoint from another repo | That repo isn't registered, or its clone is missing — `ecosystem.mjs list`, then `sync` |
| Asked for values that were in the init doc | The doc wasn't imported (`init.mjs detect` — is it at `.claude/tlm-init.json`?), or those values were still `<<FILL: …>>` markers in it |
| Init doc "carries 0 values" | Every field is still a placeholder — it was sent unfilled; ask the lead to regenerate it with `template --from-current` |
| Init doc applied but a value looks wrong | A per-user/per-machine value on your machine wins over the file (`env.*`, clone paths, `upstreamRemote`) — that's deliberate; edit `settings.local.json` if yours is the stale one |
| `permissions` in the doc did nothing | Refused by design — tool access is never granted by a file that arrived over chat |
