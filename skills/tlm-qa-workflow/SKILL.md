---
name: tlm-qa-workflow
description: Entry point for the Telemax QA harness (vendored at vendor/telemax-qa-skill) — ticket → test-analysis checklist → test-case Excel → run UI/API tests → ClickUp bugs → verify production. Detects whether the harness is installed in the current project, installs it from the vendored copy when it is not (manual additive merge, never --force), then routes the request to the right /qa-* command stage. TRIGGER whenever the user asks for QA work on a ticket: "test ticket này", "phân tích ticket để test", "checklist test", "viết test case", "chạy test", "test hồi quy", "tạo bug cho case fail", "verify production", "QA TLM-1234", or names any /qa-* command in a repo where it is not yet installed.
---

Route QA requests into the **Telemax QA harness** — a separate installable that lives in each
consuming repo's own `.claude/` (commands, agents, skills, scripts) plus a `telemax-e2e/` Playwright
project. This skill never re-implements a QA stage inline; the harness's `/qa-*` commands own the
workflow, its review stops, and its guardrails. Your job is: **detect → (install) → route → get out
of the way.**

## STEP 1 — Detect whether the harness is installed here

Installed means BOTH exist in the project:

- `.claude/qa-config.md`
- `.claude/commands/qa-run.md`

If installed → STEP 3. If not → STEP 2. If `qa-config.md` exists but still contains `CHƯA ĐIỀN`,
say so up front — `/qa-file-bugs` will stop on it.

## STEP 2 — Install from the vendored copy (ask first)

Source: `${CLAUDE_PLUGIN_ROOT}/vendor/telemax-qa-skill` (the plugin's verbatim copy of
`https://github.com/dungvv-hblab-hbg/telemax-qa-skill` — see its `PROVENANCE.md`). Tell the user
what will be copied and get one go-ahead for the whole install; then:

- **Repo already has `.claude/`** (every repo running this plugin does) — `install.sh` correctly
  refuses to overwrite it. **Never `--force`.** Merge additively instead:

  ```bash
  SRC=${CLAUDE_PLUGIN_ROOT}/vendor/telemax-qa-skill
  cp -R "$SRC/.claude/commands" "$SRC/.claude/agents" "$SRC/.claude/skills" "$SRC/.claude/scripts" .claude/
  cp "$SRC/.claude/qa-config.md" .claude/
  cp -R "$SRC/telemax-e2e" .
  cat "$SRC/gitignore.snippet" >> .gitignore
  ```

  `.mcp.json`: copy it if the repo has none; otherwise merge the `playwright` entry by hand, keeping
  `--user-data-dir`, `--output-dir` and the timeout args intact.

- **Repo has no `.claude/`** — run `bash "$SRC/install.sh" "$PWD"` (offer `--dry-run` first).

Then walk the user through the harness's own post-install list — do not improvise it:

1. `cp telemax-e2e/.env.example telemax-e2e/.env` and have the user fill `BASE_URL` /
   `TELEMAX_USER` / `TELEMAX_PASS` (never ask for the values in chat).
2. **Restart Claude Code** — `.mcp.json` is read at startup only; a mid-session edit silently does
   nothing. Keep exactly ONE Playwright MCP, at project scope (`claude mcp list` to check).
3. After restart: `/qa-setup` (it audits Python/openpyxl, chromium, MCP, LibreOffice and asks one
   batched approval), then fill `.claude/qa-config.md` (ClickUp list/space for bugs).
4. Verify: `bash .claude/scripts/smoke-scripts.sh`.

Platform note: the harness's scripts are **bash + Python** (deliberately not ported — see
`PROVENANCE.md`), so on Windows they need Git Bash/WSL. Flag this before installing there.

## STEP 3 — Route to the right /qa-* stage

Every stage needs a **ticket ID** — a spec pasted into chat is not a ticket; `/qa-analyze` will stop
and offer to create one (that creation is `tlm-ba-ticket`'s job if the user wants help). Map the
request and run the command:

| Request looks like | Run |
|---|---|
| first time in this repo, or a stage reports a missing tool | `/qa-setup` |
| login expired, seeded profile falls back to `/login` | `/qa-login` |
| "phân tích ticket", "cần test những gì", "checklist test" | `/qa-analyze TLM-XXXX` |
| review feedback written into the checklist's "Phản hồi review" | `/qa-apply-feedback TLM-XXXX` |
| "viết test case", "gen file Excel" (checklist already confirmed) | `/qa-write-cases TLM-XXXX` |
| "chạy test", "run các case" (Excel already reviewed) | `/qa-run TLM-XXXX` |
| "tạo bug", "file bug cho case fail" | `/qa-file-bugs TLM-XXXX` |
| "verify prod", dev fix đã deploy production | `/qa-verify-prod TLM-XXXX` |

Progress is watchable from a second terminal: `tail -f .qa/TLM-XXXX/progress.log` — mention it when
starting a long stage.

## Hard rules (the harness's own — never route around them)

- **Three review stops stand.** After `/qa-analyze`, after `/qa-apply-feedback`, after
  `/qa-write-cases` the harness stops for human review. Never chain ticket → bugs in one go, even if
  the user asks for "the whole pipeline" — run the next stage only after they confirm the artifact.
- **Production is read-only.** `/qa-verify-prod` runs reviewed code only (no MCP) and only
  `@prod-safe` cases. Do not "just check one more thing" on prod via MCP.
- **Bugs need one batched approval** before anything is created on ClickUp.
- **Do not edit the Defects sheet by hand-rolled logic** — append after the last TC ID row, key by
  TC ID not row number, and `Won't fix` (not row deletion) is the refusal signal. The harness's
  `write_defects.py` already encodes this; use it.

The harness's README (`${CLAUDE_PLUGIN_ROOT}/vendor/telemax-qa-skill/README.md`) is the manual —
install traps, token budget, diagnostics table (`docs/TESTING.md`). Read it on demand, don't inline
it here.
