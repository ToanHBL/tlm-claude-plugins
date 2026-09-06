# everything-claude-code — what we took, what we turned off, and why

## Provenance

| | |
|---|---|
| Source | `https://github.com/worldflowai/everything-claude-code` |
| Commit reviewed | `432485ba6b92c14fb357276a98957f348bcff9ee` (2026-01-23) |
| Reviewed on | 2026-09-05 |
| Author | worldflowai — a third party. **Not** an Anthropic repository, despite how it is often described. |
| **License** | **NONE. The repository ships no LICENSE file.** |

## Why nothing is copied here

No licence means no grant of rights: by default the work is all-rights-reserved and we may read it but
may not redistribute it. Vendoring their files into this plugin would put unlicensed third-party text
into every repo that installs it, and into the git history of each one — which is not a thing you can
quietly undo later.

So this file records the review instead. **Where an ECC idea was worth having, we wrote our own rule
from primary sources** (W3C, MDN, Tailwind, WCAG, TanStack) and cited those, which is both safer and
better grounded than their prose was.

If someone obtains written permission, or the upstream adds a permissive licence, revisit this file —
the inventory below is the shopping list.

## Turned off — overlaps something we already have

Not adopted. Each of these is already covered here, usually in more depth and with citations.

| ECC file | Overlaps | Why we kept ours |
|---|---|---|
| `skills/frontend-patterns/SKILL.md` (631 lines) | `ai/shared-fe/*` | Generic React — compound components, render props, memoization, Framer Motion. Its "Accessibility Patterns" section is keyboard-nav and focus-management only: **no cursor, no hover, no `focus-visible`, no hit-target sizing.** Grepping it for `responsive`, `breakpoint`, `cursor`, `mock` returns **zero** hits. Our `11`/`12` cover all of that from WCAG and Tailwind directly. |
| `rules/coding-style.md` | `04-typescript-enums-constants`, `07` §9 | Immutability, file-size limits, `try/catch`. Ours is stack-specific and enforced by a checklist. |
| `rules/patterns.md` | `07` §7b, `09-data-listing` | Generic API-response shapes. Ours is "types mirror the backend field-for-field", which is stricter and earned. |
| `agents/architect.md` | `tlm-fe-coding` STEP 1.5 / 1.6 | A generic architecture-review prompt with no cross-repo or domain-boundary content. Not a substitute for the ecosystem rules. |
| `agents/code-reviewer.md` | the built-in `/code-review` | Duplicates a first-party command. |
| `rules/agents.md`, `rules/hooks.md` | this plugin's `hooks/` | Describes ECC's own agent and hook wiring; meaningless outside their layout. |

## Turned off — conflicts with a house decision

| ECC file | Conflict |
|---|---|
| `rules/testing.md` | Mandates **80% minimum coverage**. This house has taken no position on a coverage number, and importing one silently would make it policy by accident. Raise it as its own decision if the team wants it. |
| `rules/git-workflow.md` | Prescribes a commit-message format. Ours comes from `tlm-ticket-workflow` and the ticket tracker; two formats is worse than either. |
| `rules/performance.md` | Opens with "Model Selection Strategy" — guidance about which LLM to use, not about the product. Out of scope for a frontend rules plugin. |

## Not adopted yet — genuinely new ground, worth a decision

We have nothing in these areas. Listed so the gap is visible, **not** as an endorsement of their text —
each would need writing from primary sources under the licence position above.

| Area | ECC has | Our gap |
|---|---|---|
| Security review | `skills/security-review` (494 lines), `rules/security.md`, `agents/security-reviewer.md` | We have none. The built-in `/security-review` partly covers it. |
| TDD / test workflow | `skills/tdd-workflow` (409), `agents/tdd-guide.md`, `commands/tdd.md` | We have no testing skill at all. |
| Verification loop | `skills/verification-loop` (120) — a build/lint/test loop after coding | Closest thing here is `07` §9 plus `12` §5. A generalised loop is a real gap. |
| Backend patterns | `skills/backend-patterns` (582) | Out of scope: this plugin is frontend plus workflow. |

## The one thing worth borrowing, and it is structural

ECC separates **always-on guidance** (`rules/`, copied into `~/.claude/rules/`) from **invoked
workflows** (`skills/`). This plugin already draws that line as `ai/` versus `skills/`, which is why
`09`–`13` are `ai/` reference files loaded on demand while `tlm-fe-coding` STEP 1.6 is inline in the skill:
a MUST that has to fire without a second file read cannot live in a file the agent may not open.

No change needed. Recorded because it confirms the existing split rather than challenging it.

## Also reviewed, also not used

`PatrickJS/awesome-cursorrules` — its entire responsive and accessibility guidance is three sentences
(*"Use Tailwind's responsive variants for adaptive designs"*, *"Include instructions for responsive
design"*, *"Include accessibility considerations"*). `hesreallyhim/awesome-claude-code` is a curated
link list; grepping it for ask-vs-assume guidance returns zero matches. Neither is cited anywhere in
these rules.
