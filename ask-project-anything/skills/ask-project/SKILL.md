---
name: ask-project
description: Step 2 of "ask project anything". Answers questions about a codebase's BUSINESS LOGIC — what the app does, its domains, user flows, and core rules — grounded in a source that was cloned & analyzed by /ask-project-init. Loads the remembered source, ensures its knowledge graph exists (delegating to the understand-anything plugin), then answers via /understand-domain and /understand-chat, falling back to a direct source scan if needed. TRIGGER whenever the user says "ask project", "apa", "ask about the project", "what does this app do", "explain the business logic", "what are the domains / user flows", "hỏi về dự án", "giải thích business logic", "app này làm gì", or asks a business/domain question about an onboarded codebase.
---

Step 2 of the **ask-project-anything** flow — the Q&A step:

**Load source → Ensure analyzed → Answer the business question (delegate to understand-anything) → Cite the code**

Onboarding (SSH clone + first analysis) is done by [[ask-project-init]] (`/ask-project-init`). This
skill assumes a source is already remembered and focuses on **answering**.

> **Working language:** answer in **English by default**, regardless of the trigger language. Switch
> only if the user asks.

**Input**: the user's question as the argument (e.g. `/ask-project what are the core billing rules?`).
If no question is given, ask what they want to know.

---

## PHASE 0 — LOAD THE REMEMBERED SOURCE

```bash
SLUG=$(pwd | sed 's#/#-#g; s#_#-#g')
MEM_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/projects/$SLUG/memory"
cat "$MEM_DIR/ask-project-anything.md" 2>/dev/null || echo "__NO_CONFIG__"
```

- If `__NO_CONFIG__` (or no `sources`) → tell the user to run **`/ask-project-init`** first to clone &
  analyze a repo, then stop.
- Parse the ```json block → `config.sources`.
  - 1 source → use it.
  - Multiple → ask which one (show `name` + `localPath`), unless the question clearly names one.
- Confirm the chosen source's `localPath` still exists on disk:
  `[ -d "<localPath>/.git" ] || echo "__MISSING__"`. If `__MISSING__`, offer to re-run
  `/ask-project-init` (it was moved/deleted).

---

## PHASE 1 — ENSURE IT'S ANALYZED

understand-anything works against the current working directory, so target the source:
set the Bash working directory to the chosen `localPath` for everything below.

Check whether a knowledge graph already exists (understand-anything writes its artifacts inside the
repo — e.g. a `.understand/` or similar graph dir):

```bash
ls -d .understand* .knowledge-graph 2>/dev/null || echo "__NO_GRAPH__"
```

- If a graph exists (or `config` marks the source `analyzed: true`) → skip to PHASE 2.
- If `__NO_GRAPH__` and understand-anything is installed → invoke `/understand` (via the Skill tool)
  to build it now, then continue.
- If understand-anything is **not** installed and the user doesn't want to install it → use the
  **fallback scan** in PHASE 2b instead.

---

## PHASE 2 — ANSWER THE BUSINESS QUESTION

### 2a — Preferred: delegate to understand-anything

With the working directory at the source `localPath`, answer by invoking the right understand-anything
skill for the question:

- **"What business does this serve? domains? core rules?"** → `/understand-domain`, then summarize its
  domain map in plain business language.
- **Open-ended / follow-up Q&A** → `/understand-chat`, passing the user's question.
- **"Explain this specific file/module/flow"** → `/understand-explain <path or topic>`.

Then synthesize a **direct answer to the user's actual question** on top of what the tool returns —
don't just dump the tool output.

### 2b — Fallback: direct source scan (no understand-anything)

If understand-anything is unavailable, read the source yourself, from the `localPath`:

- Entry points & config: `package.json`/`pyproject.toml`/`go.mod`, `README*`, `docker-compose*`, env samples.
- Domain surface: routes/controllers/handlers, models/schemas/migrations, services/use-cases, jobs/queues.
- Infer domains from folder names, model names, and API paths; trace 1–2 key user flows end to end.

Prefer `Grep`/`Read` over shelling out. Keep it targeted to the user's question rather than reading everything.

---

## PHASE 3 — CITE THE CODE

Ground the answer in the real source so it's verifiable:

- Reference concrete files/symbols as `path:line` from the cloned source.
- Separate **what the code shows** (facts) from **inference** (your reading) — label inferences.
- End with **2–3 natural follow-ups** the user might ask next (e.g. "Want the billing flow traced end
  to end?" / "Explain the auth domain?").

Never invent files or behavior — if the source doesn't show it, say so and offer to dig deeper.
