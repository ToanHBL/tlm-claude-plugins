---
name: tlm-ticket-workflow
description: Work a ticket end-to-end from any tracker (ClickUp, Jira, Linear, Azure DevOps, GitHub Issues) — fetch it, move it to in-progress, cut a branch, write a plan file, implement, then sync a non-technical summary back and move it to review. Optionally attaches QA evidence (screenshots, self-test videos). TRIGGER when the user gives a ticket id like TLM-1234 / ABC-567, pastes a ticket URL, or says "work on task", "pick up ticket", "start task", "làm task", "nhận task", "xử lý ticket".
---

Take a ticket from "assigned" to "in review" in one guided pass:

**Pre-flight → Fetch → In progress → Branch → Plan (approve) → Implement → Sync back**

Tracker-agnostic: the ticket system, id pattern, statuses and branch conventions all come from this
project's config, so the same flow works on ClickUp, Jira, Linear, Azure DevOps or GitHub Issues.

**Input**: a ticket id (`TLM-1234`), a ticket URL, or nothing (then ask). May also include **media** —
local paths (`~/Downloads/selftest.mp4`, `./shots/*.png`) or `http(s)` URLs to an image/video. Accepted:
`.png .jpg .jpeg .gif .webp .mp4 .mov .webm .m4v`. Media is optional — if none is given, skip that part
silently. Never block asking for it.

---

## PHASE 0 — PRE-FLIGHT

Read `tlm.tickets` from `.claude/settings.local.json` (fall back to `.claude/tlm.local.json`). Key
meanings: `${CLAUDE_PLUGIN_ROOT}/setup/tlm-config.reference.json`.

Needed: `system`, `idPattern`, `statuses.inProgress`, `statuses.inReview`, `urlTemplate`,
`planDir` (default `_docs`), `branchPrefixes`, and `tlm.project.baseBranch`.

Confirm the tracker's MCP is actually reachable (**ToolSearch**, e.g. `mcp__*ClickUp*__clickup_get_task`;
GitHub Issues uses `gh` instead).

**Tickets is an all-or-nothing capability (see `companions` in the reference).** Handle a not-set-up
tracker like this:

- **Missing single config values** (id pattern, a status name) while the tracker itself is reachable →
  ask *inline, right here* in one focused question, persist them, continue. A missing value alone does
  not stop the skill.
- **Tracker MCP/CLI unreachable, or a real ticket won't fetch** → the capability isn't usable. **Stop**
  and give the user two choices: finish setup via `/tlm-project-setup`, or set `tlm.tickets.enabled=false`
  to work without a tracker. Do **not** fall back to a degraded local-only (branch + plan only) mode —
  a ticket workflow with no ticket sync isn't this skill's job.

Verify with one real fetch (name **and** status) before continuing.

---

## PHASE 1 — PARSE & FETCH

Accept a bare id matching `idPattern`, or a full URL (extract the id from the path). Fetch the ticket
with description, subtasks, checklists, dependencies, and the **expanded status list**.

Show a short summary: name, id, current status, assignee, priority, due date, description (truncate if
long). If it has subtasks, fetch each — they're part of the scope.

---

## PHASE 2 — MOVE TO IN PROGRESS

If the status isn't already `statuses.inProgress`, set it and confirm. If it already is, note it and
carry on. Ask before changing status — a status change is visible to the whole team.

---

## PHASE 3 — CUT THE BRANCH

Pick the prefix from `branchPrefixes` by ticket kind: title/type contains *bug/fix/hotfix* → `fix`,
*refactor* → `refactor`, otherwise `feat` (defaults in the reference file).

Slug: lowercase kebab-case from the ticket name, ≤5 words, strip tag prefixes like `[Mobile]`.

```bash
git checkout <baseBranch> && git pull origin <baseBranch>
git checkout -b <prefix>/<TICKET>-<slug>
```

Confirm the branch name. If the working tree is dirty, stop and let the user decide — never stash or
discard their work.

---

## PHASE 4 — PLAN, THEN GET APPROVAL

Research the codebase for the files and modules involved before writing the plan — the plan is only
useful if it names real files.

Write `<planDir>/<TICKET>.md`:

```markdown
# <TICKET>: <Task Name>

**Status:** In Progress
**Branch:** <branch-name>
**Date:** <YYYY-MM-DD>

## Task Summary
<what the task requires>

## Root Cause Analysis
<bug: the actual cause — not the symptom>
<feature: the current gap and why it matters>

## Implementation Plan
1. <step — what, and in which file>
2. …

## Files to Modify
- `path/to/file.ts` — <reason>

## Notes
<risks, edge cases, dependencies>
```

Concise and actionable. **English** (or `tlm.tickets.commentLanguage`) regardless of chat language.
No emojis, no filler. Subtasks become items within this one plan file.

**Present the plan and wait for approval before implementing.**

---

## PHASE 5 — IMPLEMENT

Follow the plan step by step. Apply the `tlm-fe-coding` skill — it detects the stack from
`tlm.project.type` and applies the matching conventions. Update the plan file if the approach changes
mid-way; a stale plan is worse than no plan.

---

## PHASE 6 — SYNC BACK

Ask for confirmation before posting anything. Then:

**1. Comment the summary.** Post as two comments so it stays readable:
   - Task Summary + Root Cause Analysis
   - Implementation Plan + Files Modified + Notes

**Write comments for a non-technical reader.** What changed and why, from a user/QA perspective — not
file names, not function names, not code. Markdown, no emojis, `commentLanguage`.

**2. Attach media, if any was provided.** Comments are text-only — attach files to the *ticket*, then
reference them in a comment.
   - **Local file** (videos are always this path, regardless of size): request an attachment upload
     slot, then upload via a native HTTP client using the returned URL / method / field name
     (e.g. `curl -F "<field>=@<path>"`).
   - **`http(s)` URL**: attach by URL.
   - **Small image** (< ~200KB): inline base64 + filename is acceptable.

   Verify each upload succeeded. If one fails, report which file and continue with the rest — don't
   abort the sync over one attachment. Then post a final line: `Self-test evidence attached: a.mp4, b.png`.

**3. Move to `statuses.inReview`** — after confirming with the user.

---

## RULES

- **Confirm before every outward action** — status changes and comments are visible to the team.
- Plan files and ticket comments in `commentLanguage` (default English), whatever language the chat is in.
- Comments are non-technical. Plans are technical. Don't mix them up.
- No emojis in plans or comments.
- Never invent a ticket id. If the given id doesn't resolve, say so and ask.
- Media is optional. Attach to the ticket, reference from a comment — never try to embed a file in
  comment text.
- Working on several tickets? Run them as parallel agents only if genuinely independent — shared files
  mean sequential.
