---
name: rule-capture
description: When the user corrects code with a reason — "do it this way instead, because…", "don't use X, use Y", "sao lại viết vậy, phải làm thế này" — classify whether that feedback is a NEW house rule, a gap in the existing rules, a correction that contradicts a current rule, or a one-off, then ask whether to persist it before applying the change. Runs BEFORE the edit, so the rule and the code land together. TRIGGER on any corrective feedback about code style, structure, naming, or approach, and after implementing something the user then pushes back on.
---

# Rule Capture

A correction with a *reason* attached is rarely about one line. It's a house rule surfacing — and if it
isn't written down, the same correction gets made again next week.

**Classify → Check the existing rules → Ask → Apply code + rule together**

Run this **before** making the edit, not after. The classification changes what you write: a rule
correction means fixing the rule file *and* every place that contradicts it, not just the line in front
of you.

---

## STEP 1 — Is this rule-shaped feedback?

Rule-shaped — run this skill:

- A reason is attached: *"use `navigate` instead of `push`, because spam-tapping duplicates the screen"*
- A general prohibition: *"never use `as any`"*, *"don't hardcode hex"*
- A structural preference: *"this belongs in `_modules/pages/`, not `common/`"*
- A naming/style correction phrased as a pattern, not a typo
- Rejecting an approach you chose: *"don't create a named handler for that"*

**Not** rule-shaped — just make the change:

- A factual bug fix (*"this should be `>=`, not `>"*)
- A one-off product/business decision (*"this screen shows 20 per page, not 10"*)
- Something already covered by an existing rule you simply didn't follow — that's a compliance miss.
  Fix it, say which rule you missed, and don't propose "adding" a rule that exists.

When unsure, lean toward running it — the cost is one question.

---

## STEP 2 — Check what already exists

Search before classifying. Never claim something is new without looking.

```bash
# Rules root: this project's live copy if it exists, else the installed plugin.
RULES=".claude/tlm-plugin"; [ -d "$RULES" ] || RULES="${CLAUDE_PLUGIN_ROOT}"
grep -rn --include="*.md" -i "<the concept>" "$RULES/ai" "$RULES/skills"
grep -rn -i "<the concept>" CLAUDE.md .claude/ 2>/dev/null
```

Also check this project's memory directory and any `CLAUDE.md` up the tree — a rule may already exist at
project scope rather than plugin scope.

Then classify into exactly one:

| Class | Meaning | What it implies |
|-------|---------|-----------------|
| **NEW** | Nothing in the rules covers this | Add a rule |
| **GAP** | The area is covered, but this specific case isn't | Extend the existing section — don't create a competing one |
| **CORRECTION** | An existing rule says the **opposite**, or says something now wrong | Edit that rule, and fix everything written to the old rule |
| **ONE-OFF** | Genuinely specific to this file/feature | No rule. Just make the change. |

**CORRECTION is the one that matters most and gets missed most.** If a rule file currently says the
opposite of what the user just told you, changing only the line in front of you leaves the codebase with
a rule that will re-introduce the bug. Say so explicitly.

---

## STEP 3 — Ask (AskUserQuestion), before editing

State the classification and what you found, then ask. One question, concrete options.

> Feedback: *"list này phải dùng `FlatList`, `ScrollView` + `map` sẽ lag khi data nhiều"*
>
> **GAP** — `ai/reactnative/06-hard-rules.md` §4 covers `FlatList` for data-driven lists, but says
> nothing about the bounded-preview exception you're describing.
>
> Update the rule as well as the code?

Options to offer:

1. **Yes — house rule** (live here immediately, shipped to the team by PR): edit this project's **rules
   copy** (`tlm.pluginRepo.vendorDir`, default `.claude/tlm-plugin/`), then review and PR it upstream.
   *Only offer this when the rules copy exists* — otherwise the project runs on the installed plugin and
   nothing can be edited from here (say so, and suggest `/project-setup`, which installs it).
2. **Yes — project rule** (this repo only): write it into this project's `CLAUDE.md`
3. **Yes — my preference** (how I should work, not what the code should be): write it to memory
4. **No — just this change**

> **Where a house rule actually lands.** The installed plugin under `${CLAUDE_PLUGIN_ROOT}` is a Claude
> Code **managed clone that `/plugin marketplace update` overwrites** — never edit it. The rule goes in
> this project's rules copy (`.claude/tlm-plugin/`), which **is the live source here**: skills read it and
> the plugin's hooks delegate to it, so the rule is enforced in this repo from the next turn on, before
> any PR exists. Two things still have to happen, and the user must know both:
> **(a) commit it** — it is the rules the whole repo runs on; **(b) PR it upstream** — until that merges
> and teammates run `/plugin marketplace update`, *other* repos and *other* people keep hitting the
> problem it fixes.

For a **CORRECTION**, also say which existing rule contradicts the feedback and where, so the user is
choosing knowingly. For **ONE-OFF**, don't ask at all — just make the change.

### Picking the scope

| Signal | Scope |
|--------|-------|
| Language/framework-level; true in any project on this stack | **House rule** — rules copy `ai/` + skill, then PR |
| Depends on this repo's libraries, domain, backend, or team decisions | **Project** — `CLAUDE.md` |
| About *how you work* (ask first, don't commit, keep it short) rather than the code | **Memory** |

Default to **project** when torn. A too-narrow rule is easy to promote later; a wrong universal rule
quietly misfires in every other repo — and now it does so from the moment it is written, not from the
moment a PR merges.

---

## STEP 4 — Write it

### House-rule scope — edit this project's rules copy, review, then PR

**Never edit `${CLAUDE_PLUGIN_ROOT}` directly** (a managed clone; `/plugin marketplace update` overwrites
it). All edits go into this project's rules copy at `tlm.pluginRepo.vendorDir` (default
`.claude/tlm-plugin/`) — committed here, and **the source the skills and hooks actually run on**. If it is
missing, stop and tell the user to run `/project-setup`, which installs it.

Make the same layered edits you always would — **inside the rules copy** (`$RULES` below):

1. **Deep rule** → `$RULES/ai/…`, same structure as its neighbours: the rule, **why** (the failure it
   prevents), ❌ wrong / ✅ correct examples, any explicit exception.
   - Shared across stacks → `$RULES/ai/shared-fe/`
   - Stack-specific → `$RULES/ai/<stack>/06-hard-rules.md`
2. **If CRITICAL enough to hold without a second file read** → also add a short form to
   `$RULES/skills/fe-coding/SKILL.md` in the matching section. Be strict; it stays useful only while short.
3. **Checklist line** → `$RULES/ai/shared-fe/07-ai-workflow-integration.md` §9 if it's checkable.
4. **Mechanically detectable?** → add the `scan()` to `$RULES/hooks/lint-fe.mjs`. The installed hook
   delegates to this copy, so the check is live in this repo immediately — only add rules with a low
   false-positive rate.

**Include the reason the user gave.** *"Use `navigate` not `push`"* gets ignored; *"because `push`
always pushes, so a spam tap duplicates the screen and the user has to press back twice"* gets followed.
The failure story is what makes a rule stick.

#### Then: review → ship

The rule is already in effect locally. Two steps remain, in this order — **announce each command before
running it**:

```bash
RULES=".claude/tlm-plugin"; [ -d "$RULES" ] || RULES="${CLAUDE_PLUGIN_ROOT}"

# Export config from tlm.pluginRepo (each has a default; read the block from
# .claude/settings.local.json). Then:
export TLM_VENDOR_DIR="$(pwd)/.claude/tlm-plugin"     # tlm.pluginRepo.vendorDir
export TLM_UPSTREAM_REMOTE="git@github.com-hbl:ToanHBL/tlm-claude-plugins.git"  # .upstreamRemote
export TLM_OWNER_REPO="ToanHBL/tlm-claude-plugins"    # .ownerRepo
export TLM_BASE="develop"                             # .baseBranch
export TLM_BUMP="patch"                               # .bump
export TLM_PR_MODE="gh"                               # .prMode  (falls back to a compare URL)
export TLM_TITLE="rule(<slug>): <one-line summary>"
export TLM_BODY="Classification + the rule + the WHY the user gave."

node "$RULES/skills/rule-capture/plugin-pr.mjs" preflight   # tools + access, no writes
node "$RULES/skills/rule-capture/plugin-pr.mjs" diff        # REVIEW — show this output to the user
node "$RULES/skills/rule-capture/plugin-pr.mjs" open "<slug>"   # branch, bump, push, open the PR
```

1. **`diff` is the review gate, and it is not optional.** Show the user what the PR would change upstream
   and get an explicit go-ahead before `open`. It is the last point where an unrelated edit sitting in the
   rules copy — a half-finished experiment, a stray file — gets caught instead of shipped to everyone.
2. **`open`** clones the upstream, mirrors the rules copy onto `rule/<slug>`, bumps the version in
   lockstep across the three manifest fields, pushes, and opens the PR with `gh` (printing the compare URL
   if `gh` is absent). It touches nothing in this project and nothing under `${CLAUDE_PLUGIN_ROOT}`.
3. **Commit the rules copy in this repo too.** It is what this project runs on; an uncommitted rule is one
   only your machine has.

Report the printed `PR_URL` (or the branch name if the push failed — then tell the user to push it and
open the PR by hand). If `preflight` cannot reach the upstream, the `upstreamRemote` is likely an SSH host
alias that only exists on the original author's machine: ask for the URL that works on theirs and store it
in `tlm.pluginRepo.upstreamRemote`.

### Project scope

Append to this repo's `CLAUDE.md` under a clear heading. Same shape: rule, why, example. Create the file
if absent, and say you did.

### Memory scope

One file per fact in the project memory dir, `type: feedback`, with **Why:** and **How to apply:** —
plus a line in `MEMORY.md`.

### For a CORRECTION, also

- **Edit the contradicting rule** — don't leave both versions standing.
- **Find what was written to the old rule** and offer to fix it:
  ```bash
  grep -rn "<old pattern>" src/ app/ 2>/dev/null
  ```
  Report the count. Let the user decide whether to fix all of it now or just here — a broad sweep is
  their call, not yours.

---

## STEP 5 — Apply the code change

Make the edit the user asked for. If the rule went in at plugin or project scope, mention where in one
line — then get on with the work.

Never let the rule-writing delay the fix the user actually asked for. If they decline persisting, drop
it entirely and don't re-offer for the same feedback later in the session.

---

## RULES

- **Ask before writing a rule. Always.** Never silently edit `ai/`, `CLAUDE.md`, or memory off the back
  of one comment. A house rule now takes effect the moment it is written — there is no PR review standing
  between a careless edit and the next turn of work.
- **Review before shipping.** `plugin-pr.mjs diff`, shown to the user, before `open`. Every time.
- **Search before claiming novelty.** "This is a new rule" is wrong if it's already written down, and
  it makes the rules look untrustworthy.
- **One rule per correction.** Don't bundle three inferred rules out of one sentence.
- **Write the why, not just the what.**
- **Don't rule-ify a bug fix or a product decision.**
- If the user already declined a rule this session, don't re-ask for the same one.
