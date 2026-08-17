---
name: vibe-code-init
description: Bootstrap a NEW project that extends / integrates with one or more existing CORE systems (e.g. a shared backend that owns the business logic). Interviews the user openly, guides SSH setup, clones each core repo next to the current project, SCANS the cloned source to auto-discover its business logic / modules / dependencies, then saves everything as project "constraints" to memory so every later feature is built by extending the core instead of reinventing it. TRIGGER whenever the user says "vibe code init", "vibe init", "setup constraints", "setup core", "extend core", "init project constraints", "khởi tạo dự án", "setup dự án dựa trên core", or asks to start a new project that builds on top of an existing system.
---

Bootstrap the ground rules for a **new project that is built on top of existing core system(s)**, then
keep them so every future feature is developed by **extending / integrating**, never reinventing:

**Load/Bootstrap config → Interview → Access & clone core(s) → SCAN core (auto-discover) → Review & add cores → Save constraints → Use on every feature**

This skill is **portable & generic** (any stack — BE, FE, mobile). Dropped into a new project's
directory, it learns that project's core dependencies once, saves them to **memory**, and reuses them
on every later run so it never re-asks — and so feature work always respects the core's business logic.

> **Working language:** conduct this whole process — questions, findings, summaries — in **English by
> default**, regardless of the language the user wrote the trigger in. Switch languages only if the
> user explicitly asks for another one.

> **Design note — the core is the source of truth.** New features must reuse the core's existing
> business logic and dependencies. This skill's job is to make that core *readable & known* to the AI
> (clone it locally, scan it, record what it found), not to guess. The AI actively **discovers**
> constraints from the real source; the user only reviews and augments.

---

**Input**: none required. Optionally a core git URL or a short project description as the argument
(e.g. `/vibe-code-init git@github.com:org/Telemax2.git`).

Run this from the **directory of the NEW project** you're about to build (the "vibe" project) — cores
are cloned as *siblings* of it.

---

## PHASE 0 — LOAD OR BOOTSTRAP CONFIG

### 0.1 Try to load saved config from memory

```bash
SLUG=$(pwd | sed 's#/#-#g; s#_#-#g')
MEM_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/projects/$SLUG/memory"
cat "$MEM_DIR/vibe-code-init-config.md" 2>/dev/null || echo "__NO_CONFIG__"
```

The config file (when present) contains a fenced ```json block — parse it into `config`. If found and
valid → **announce** "Loaded core-extension config for this project ({N} core sources)", then jump to
**PHASE 6** (refresh references + remind how feature work uses it). Offer: "Add another core?" → if yes,
run PHASE 2–4 for the new one and re-save.

If output is `__NO_CONFIG__` (or JSON missing/invalid) → run the full bootstrap below (PHASE 1 → 5).

---

## PHASE 1 — OPEN INTERVIEW (no fixed template)

Ask the user openly (conversational, not a rigid form) to establish intent. Cover, adapting to answers:

- **What is the new project?** goal, stack, who uses it.
- **Which existing core system(s) does it extend / integrate with?** (name + what that core owns —
  e.g. "Telemax2 = backend, owns all business logic; new features must build on it").
- **What does "extend" mean here?** consume its API? import its packages? share its DB/models?
  mirror its domain rules on the frontend?

Keep it short — you'll learn most of the detail by **scanning the actual source** in PHASE 3, so don't
interrogate; just get enough to know which repos to clone and why.

---

## PHASE 2 — ACCESS & CLONE EACH CORE

For each core the user named:

### 2.1 Locate or obtain it

Ask for the core's **git URL (SSH)** and **base branch** (the branch new work is based on, e.g. `master`).

- **Already cloned locally?** If the user gives an existing path (e.g.
  `/Users/.../Telemax2`), verify it's a git repo and **reuse it** — do not re-clone. Record that path.
- **Not local yet?** Clone it as a **sibling of the current project**:

  ```bash
  PARENT=$(dirname "$(pwd)")
  CORE_DIR="$PARENT/_core-refs"          # siblings of the vibe project, kept tidy in one folder
  mkdir -p "$CORE_DIR"
  git clone <ssh-url> "$CORE_DIR/<name>"
  git -C "$CORE_DIR/<name>" checkout <base-branch>
  ```

### 2.2 Guide SSH setup if the clone can't authenticate

If clone fails on auth (SSH key missing / not registered), **guide the user** (they run these via the
`! <command>` prefix in the prompt), then re-try the clone. Do not proceed past a failing clone.

```bash
ls -al ~/.ssh                                   # check for an existing key
ssh-keygen -t ed25519 -C "<user-email>"         # create one if none
cat ~/.ssh/id_ed25519.pub                        # copy → add to GitHub/GitLab/Bitbucket → SSH keys
ssh -T git@github.com                            # (or gitlab.com / bitbucket.org) → verify auth
```

Tell the user to add the printed public key to their Git host's SSH keys, then confirm `ssh -T` greets
them by name before you re-run the clone.

### 2.3 Update the reference (keep it fresh)

Whether reused or freshly cloned, refresh the base branch so the reference reflects current core code
(warn, don't blow away local changes):

```bash
git -C "$CORE_DIR/<name>" fetch origin --prune
git -C "$CORE_DIR/<name>" checkout <base-branch>
git -C "$CORE_DIR/<name>" pull --ff-only origin <base-branch> || echo "⚠️ base not fast-forwardable — leaving as-is"
```

---

## PHASE 3 — SCAN THE CORE (AI auto-discovers constraints)

**This is the heart of the skill.** Read the cloned core and *tell the user what you found* — do not
ask them to describe it. Discover and summarize:

1. **Stack & entry points** — language/framework, how it boots (`Program.cs`, `main`, `app.module.ts`,
   `package.json` scripts, etc.).
2. **Domain / module map** — the top-level business domains and where each lives
   (`src/modules/*`, `Domain/*`, services, controllers).
3. **Business rules & invariants** — validation, state machines, permission/role logic, money/tax/date
   rules, anything a new feature must not contradict.
4. **Public surface to build on** — API endpoints / DTOs / exported packages / shared models a new
   project is meant to consume or extend.
5. **Dependencies & conventions** — key libs, patterns, naming, folder layout the new project should
   mirror for consistency.
6. **Extension seams** — where/how the core expects to be extended (plugins, interfaces, base classes,
   generated clients).

Use the read/search tools (Grep/Glob/Read, or an `Explore` agent for breadth) against `$CORE_DIR/<name>`.
Present findings as a concise structured list and mark anything uncertain for the user to confirm.

---

## PHASE 4 — REVIEW & ADD MORE CORES

- Show the discovered business logic / constraints; let the user **correct, drop, or add** rules.
- Ask: **"Any other core source to add?"** (another BE, an FE reference, a shared lib). If yes → loop
  back to **PHASE 2–3** for it. Each core is recorded with its own path, role, git URL, and base branch.

---

## PHASE 5 — SAVE CONSTRAINTS TO MEMORY

Write `$MEM_DIR/vibe-code-init-config.md` (memory format + machine-readable JSON so future runs re-parse
reliably):

```markdown
---
name: vibe-code-init-config
description: Core-extension constraints for this project — the existing core system(s) this project builds on, their local reference paths, base branches, and the business-logic rules new features must respect. Used by the vibe-code-init skill and by all feature development in this repo.
metadata:
  type: project
---

This project EXTENDS the core system(s) below. Before writing any new feature, review the referenced
core for existing business logic / dependencies and build by extending it — do not reinvent.

```json
{
  "project": { "name": "<new-project>", "goal": "<short>", "stack": "<stack>" },
  "cores": [
    {
      "name": "Telemax2",
      "role": "backend — owns ALL business logic; new features build on it",
      "git": "git@github.com:org/Telemax2.git",
      "baseBranch": "master",
      "localPath": "../_core-refs/Telemax2",
      "autoPull": true,
      "domains": ["<domain>: <where>", "..."],
      "businessRules": ["<rule the new feature must respect>", "..."],
      "extendSurface": ["<API/DTO/package to consume>", "..."],
      "conventions": ["<pattern to mirror>", "..."]
    }
  ],
  "constraints": [
    "Always review core dependencies & business logic before implementing a feature.",
    "Prefer extending/integrating the core over duplicating its logic."
  ]
}
```
```

Append one index line to `$MEM_DIR/MEMORY.md`:
`- [Vibe-code core constraints](vibe-code-init-config.md) — core system(s) this project extends + business-logic rules for /vibe-code-init`

Confirm: "✓ Saved core-extension constraints to memory — future feature work will use them automatically."

---

## PHASE 6 — OUTPUT & HOW FEATURE WORK USES THIS

Print a concise summary: each core (name, role, local path, base branch), the key discovered domains /
business rules, and the constraints. Do not dump full scan output — keep it scannable.

**On every later feature request in this repo**, before writing code:
1. Load `config` from `$MEM_DIR/vibe-code-init-config.md`.
2. `git -C <localPath> pull --ff-only` each core with `autoPull` (skip on failure with a warning).
3. Search the relevant core(s) for existing logic/dependencies the feature touches.
4. Report reuse opportunities ("this already exists in `<core>/<path>` — extend it") **before** coding,
   then implement by extending / integrating rather than duplicating.

---

## SESSION-START REFERENCE REFRESH (keep cores up to date)

The core clones are only useful if they reflect current core code. This plugin ships a **SessionStart
hook** that runs automatically when a session opens: if this project has a
`vibe-code-init-config.md`, the hook injects the config and instructs the model to **ask the user**
whether to refresh the references. The flow the model must follow when that instruction is present:

1. **Ask** (AskUserQuestion): *"This project extends {core names}. Update the core reference(s) to the
   latest `<base>` now?"* — options: **Yes, update all** / **No, use as-is** / **Choose per core**.
2. On **Yes**, for each core in `config.cores`:
   - If `localPath` exists → `git -C <localPath> fetch origin --prune && git -C <localPath> checkout <baseBranch> && git -C <localPath> pull --ff-only origin <baseBranch>` (warn, don't clobber, on non-ff).
   - If `localPath` is **missing** (never cloned, or a fresh machine) → **re-clone** it from `git` into
     the recorded sibling path, then checkout `baseBranch`. This is the "auto-clone on session start"
     path for teammates who don't have the core yet.
3. Report a one-line status per core (updated to `<sha>` / cloned / skipped / failed). Keep it terse.

If the user declines, do nothing and continue. Never refresh silently — always ask first.
