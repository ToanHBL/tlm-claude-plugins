---
name: ask-project-init
description: Step 1 of "ask project anything". Sets up a codebase you want to understand — interviews the user for the git SSH URL, verifies/guides SSH access, SSH-clones the source as a sibling folder next to the current workspace, remembers its path & metadata in Claude memory, then kicks off analysis via the understand-anything plugin so it becomes askable. TRIGGER whenever the user says "ask project init", "apa init", "setup project", "setup source", "add a repo to analyze", "onboard a codebase", "clone source to understand", "khởi tạo dự án cần phân tích", "setup source để hỏi", or asks to point the AI at a repo before asking about it.
---

Step 1 of the **ask-project-anything** flow:

**Load config → Interview → Verify SSH access → Clone source (sibling) → Save to memory → Kick off analysis → Hand off to `/ask-project`**

Deep code analysis is **delegated to the `understand-anything` plugin** — this skill's job is only to
get the source onto disk, remember it, and trigger the analysis. Question-answering happens in
[[ask-project]] (`/ask-project`).

> **Working language:** run this whole process — questions, findings, summaries — in **English by
> default**, regardless of the language the user used to trigger it. Switch only if the user asks.

**Input**: none required. Optionally a git SSH URL as the argument
(e.g. `/ask-project-init git@github.com:org/App.git`).

Run this from the **workspace directory** you're driving from — sources are cloned as *siblings* of it,
so they stay outside this workspace but easy to open.

---

## PHASE 0 — LOAD OR BOOTSTRAP CONFIG

Try to load previously-saved config for THIS workspace from memory:

```bash
SLUG=$(pwd | sed 's#/#-#g; s#_#-#g')
MEM_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/projects/$SLUG/memory"
cat "$MEM_DIR/ask-project-anything.md" 2>/dev/null || echo "__NO_CONFIG__"
```

The config file (when present) contains a fenced ```json block — parse it into `config`. Its shape:

```json
{
  "sources": [
    {
      "name": "App",
      "gitUrl": "git@github.com:org/App.git",
      "localPath": "/abs/path/to/App",
      "branch": "main",
      "analyzed": true
    }
  ]
}
```

- If found & valid → announce `Loaded {N} known source(s) for this workspace`, list them, and ask:
  **"Add another source, or go ask questions with `/ask-project`?"** If adding → run PHASE 1→5 for the
  new one and re-save (append to `sources`, don't overwrite existing entries). Otherwise stop and point
  to [[ask-project]].
- If `__NO_CONFIG__` (or JSON missing/invalid) → run the full bootstrap below (PHASE 1 → 6). Start
  `config` as `{ "sources": [] }`.

---

## PHASE 1 — INTERVIEW

Ask the user (conversationally, adapt to answers already given as the argument):

- **Which repo do you want to understand?** — get the **git SSH URL**
  (`git@github.com:org/App.git` / `git@gitlab.com:...` / self-hosted). If they paste an HTTPS URL,
  offer to convert it to SSH (SSH clone is required per the flow).
- **A short friendly name** for it (defaults to the repo name from the URL).
- **Branch** to check out (default: the remote's default branch — leave blank to accept default).
- **One line: what is this codebase?** (optional — helps later Q&A framing).

Confirm the parsed `{ name, gitUrl, branch }` back to the user before cloning.

---

## PHASE 2 — VERIFY SSH ACCESS

Detect the host from `gitUrl` (`git@<HOST>:...`) and test auth:

```bash
ssh -T git@<HOST> 2>&1 | head -5 || true
```

- GitHub returns "successfully authenticated" (exit 1 is normal). GitLab/Bitbucket have similar banners.
- If auth **fails** (Permission denied / no key), guide the user — do NOT proceed to clone:
  1. Check for a key: `ls -la ~/.ssh/*.pub 2>/dev/null`
  2. If none, tell them to run (in their own terminal, so the passphrase prompt is interactive):
     `ssh-keygen -t ed25519 -C "tony.nguyen@telemax.com.au"`
  3. Add the public key to the git host (GitHub → Settings → SSH keys), then re-run this step.
  4. Optionally `eval "$(ssh-agent -s)" && ssh-add ~/.ssh/id_ed25519`.
- Re-test until access succeeds. Only continue once `ssh -T` authenticates.

---

## PHASE 3 — CLONE THE SOURCE (as a sibling)

Clone next to the current workspace so it stays separate but adjacent:

```bash
NAME="<name>"                      # friendly name, safe for a folder
DEST="$(cd .. && pwd)/$NAME"       # sibling of the current workspace
if [ -d "$DEST/.git" ]; then
  echo "Already cloned at $DEST — pulling latest"; git -C "$DEST" pull --ff-only
else
  git clone git@<HOST>:org/App.git "$DEST"
fi
[ -n "<branch>" ] && git -C "$DEST" checkout "<branch>" || true
echo "SOURCE_PATH=$DEST"
```

Capture the absolute `SOURCE_PATH`. If the clone fails, surface the real git error and go back to
PHASE 2 (usually an access/branch issue).

---

## PHASE 4 — KICK OFF ANALYSIS (delegate to understand-anything)

Deep scanning is done by the **understand-anything** plugin. This plugin already **auto-registers &
installs** it (a SessionStart hook + a declared cross-marketplace dependency), so normally it's just
there. Confirm it's available:

```bash
claude plugin list 2>/dev/null | grep -i "understand-anything" || echo "__NOT_INSTALLED__"
```

- If `__NOT_INSTALLED__` (e.g. the hook hasn't run yet, or the machine was offline at session start),
  **do the install yourself now** — don't make the user type it:
  ```bash
  claude plugin marketplace list 2>/dev/null | grep -qi understand-anything || claude plugin marketplace add Egonex-AI/Understand-Anything
  claude plugin install understand-anything@understand-anything
  ```
  Its `/understand*` commands only load in a **new session**, so if it was just installed now, tell the
  user to restart Claude Code, then re-run `/ask-project-init` (the config is already saved, so it
  resumes quickly). Meanwhile you may proceed with the PHASE 5 save.

Then build the knowledge graph **for the cloned source**. understand-anything analyzes the current
working directory, so point it at `SOURCE_PATH`:

- Set the Bash working directory to `SOURCE_PATH` for the analysis, then invoke the understand-anything
  skills via the Skill tool, in order:
  1. `/understand` — full multi-agent scan → produces the knowledge graph.
  2. `/understand-domain` — maps business domains & logic flows.
- These may take a while and write graph artifacts inside the source repo. That's expected.

> If understand-anything is genuinely unavailable and the user doesn't want to install it, note that
> `/ask-project` will fall back to a lighter built-in scan (grep/read of entry points, routes, models,
> services) — analysis will be shallower but still answerable.

Mark the source `analyzed: true` in `config` once `/understand` completes.

---

## PHASE 5 — SAVE TO MEMORY

Append/update this source in `config.sources`, then persist:

```bash
SLUG=$(pwd | sed 's#/#-#g; s#_#-#g')
MEM_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/projects/$SLUG/memory"
mkdir -p "$MEM_DIR"
```

Write `"$MEM_DIR/ask-project-anything.md"` with frontmatter and the updated JSON block:

```markdown
---
name: ask-project-anything
description: Sources onboarded for /ask-project in this workspace (git URL, local path, analyzed).
metadata:
  type: project
---

Codebases cloned & analyzed so `/ask-project` can answer business-logic questions about them.

​```json
{ "sources": [ { "name": "...", "gitUrl": "...", "localPath": "...", "branch": "...", "analyzed": true } ] }
​```
```

Also add a one-line pointer to `"$MEM_DIR/MEMORY.md"` if not already present:
`- [ask-project-anything sources](ask-project-anything.md) — repos cloned for /ask-project`

---

## PHASE 6 — HAND OFF

Tell the user, concisely:

- ✅ `{name}` is cloned at `{localPath}` and analyzed.
- **Ask business questions now:** run `/ask-project` and ask, e.g.
  *"What business does this app serve? What are the main user flows and core domain rules?"*
- Best UX for heavy Q&A in Claude Code desktop: **open `{localPath}` as the workspace**, then use
  `/ask-project` (or understand-anything's `/understand-chat`) there.
- Re-run `/ask-project-init` anytime to add another repo.
