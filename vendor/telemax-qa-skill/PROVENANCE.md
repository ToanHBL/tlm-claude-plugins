# vendor/telemax-qa-skill — a copy, not a submodule

Everything beside this file is a verbatim copy of another repository. It is **not** maintained here:
edit it upstream, then re-copy. A fix made only in this directory is a fix that disappears the next
time anyone syncs, and nobody will be watching for it.

| | |
|---|---|
| Upstream | `https://github.com/dungvv-hblab-hbg/telemax-qa-skill` |
| Copied from | `main` @ `8f988bc` |
| Copied on | 2026-09-06 |

## What it is

The Telemax **QA harness**: eight `/qa-*` slash commands, five subagents and seven skills that drive
`ticket → checklist → test-case Excel → run (UI/API) → ClickUp bug → verify production`, with three
human review stops. Its own README (in this directory) is the authoritative manual — install
requirements, the three install traps, the token budget, and the three guardrails that were paid for
(`Append, không lấp lỗ trống` / `Khoá theo TC ID` / `Won't fix, không xoá dòng`).

## It installs into a consuming repo, not into this plugin

Like z-harness, this stays a **separate installable**, not wired into this plugin's `hooks.json` or
skill tree: its scripts are bash + Python, its commands live in a project's own `.claude/commands/`,
and it registers its own Playwright MCP via `.mcp.json`. The `tlm-qa-workflow` skill in this plugin is
the bridge — it detects whether the harness is installed in the current project, installs it from this
copy when it is not, and routes QA requests to the right `/qa-*` stage.

**Do not run `install.sh --force` into a repo that already runs this plugin.** A consuming repo has
`.claude/` (settings.local.json, `tlm-plugin/`), and `install.sh` refuses to overwrite it — that
refusal is correct. The merge path is manual and additive:

```bash
SRC=<rules-root>/vendor/telemax-qa-skill
cp -R "$SRC/.claude/commands" "$SRC/.claude/agents" "$SRC/.claude/skills" "$SRC/.claude/scripts" .claude/
cp "$SRC/.claude/qa-config.md" .claude/
cp -R "$SRC/telemax-e2e" .
cat "$SRC/gitignore.snippet" >> .gitignore
# .mcp.json: merge the "playwright" entry by hand if the repo already has one
```

None of the harness's skill names (`checklist-format`, `testcase-template`, …) collide with the
`tlm-*` prefix, so `.claude/skills/` is safe here even though the plugin's own rules copy deliberately
avoids that path.

## Syncing, until something automated exists

```bash
git -C <a clone of telemax-qa-skill> archive main | tar -x -C vendor/telemax-qa-skill
```

Then update the table above. To check a sync, the harness carries its own CI checks — run them from
the vendored directory (they are location-independent, unlike z-harness's tests):

```bash
bash vendor/telemax-qa-skill/.claude/scripts/smoke-scripts.sh   # 18 assertions, no MCP needed
python3 vendor/telemax-qa-skill/scripts/lint-harness.py
```

Requires `bash` and `python3` **with `pyyaml` and `openpyxl` importable** (a venv is fine — the smoke
script resolves its interpreter via `qa-py.sh`); on a machine without them the red cases are
environment artifacts, not copy corruption. `diff -r --exclude .git --exclude PROVENANCE.md <clone> .`
is the dependency-free integrity check. bash + Python is also why these scripts are **not** wired into
this plugin's own `hooks.json` — this plugin's hooks are Node precisely so they run on Windows.
