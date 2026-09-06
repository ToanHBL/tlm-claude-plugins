---
name: ba-ticket
description: BA/Product Owner ticket writer — turn a requirement or defect described in chat into ONE well-formed ClickUp ticket that follows the team's task/bug template. Fills the business sections (user story, description, reproduce steps, test scenarios); leaves the technical sections as headed placeholders for the developer. Never invents subtasks — the ticket it creates is the single source of truth. TRIGGER when the user describes a requirement, change request, or bug and asks to create/log a ticket — "tạo ticket", "tạo task trên ClickUp", "log bug", "viết ticket", "create a ticket for this", "raise a bug".
---

Turn a requirement described in chat into one ticket the team can pick up, in one guided pass:

**Pre-flight → Classify & clarify → Draft (approve) → Create & link**

This is a **BA/PO skill, not a coding skill**. Its job is to make the *requirement* unambiguous. It
asks business questions, never technical ones, and it never opens the codebase — the technical
sections of the template belong to the developer who picks the ticket up.

**Input**: a free-form description of a requirement or a bug, optionally with related ticket ids/URLs,
a parent ticket, screenshots, or a target list.

---

## PHASE 0 — PRE-FLIGHT

Read `tlm.tickets` from `.claude/settings.local.json` (fall back to `.claude/tlm.local.json`). Key
meanings: `${CLAUDE_PLUGIN_ROOT}/setup/tlm-config.reference.json`.

Needed: `system` (this skill currently supports `clickup`), `workspaceId`, `commentLanguage`,
`baTemplates` (the team's task/bug template ids — defaults in the reference file), and
`defaultListId` if set.

Confirm the ClickUp MCP is reachable (**ToolSearch**, e.g. `mcp__*ClickUp*__clickup_create_task`).

**Tickets is an all-or-nothing capability** (see `companions` in the reference). If the tracker
MCP is unreachable or `tlm.tickets.enabled` is false, **stop** and point the user to
`/project-setup` — do not fall back to printing a ticket body for manual pasting.

---

## PHASE 1 — CLASSIFY & CLARIFY

**Classify** the request:

- **Bug** — existing behaviour is broken: an error, a regression, "X used to work", "X shows the
  wrong value". → bug template (`baTemplates.bug`).
- **Ticket** (feature / change request) — new behaviour or a change to intended behaviour. →
  task template (`baTemplates.task`).

If genuinely ambiguous ("the export is slow" — defect or improvement?), ask. One question.

**Clarify like a BA.** Before drafting, check the description answers the business questions the
template needs. Ask *only* for what is missing and load-bearing, in one focused round:

- Who is affected (user role / customer segment)?
- What should happen, in business terms — and for a bug, what happens instead?
- Why does it matter (the business value / impact)?
- How do we know it's done (acceptance criteria the test scenarios will encode)?

**Never ask technical questions** — no "which service", no "is this the API or the client", no
architecture talk. If the user volunteers technical detail, keep it, but don't probe for more.

---

## PHASE 2 — DRAFT THE TICKET

Draft the ticket body in `commentLanguage` (default English), regardless of chat language.
Markdown, no emojis.

The section structure mirrors the team's ClickUp templates (`baTemplates.task` /
`baTemplates.bug`). The MCP cannot instantiate a ClickUp template directly, so reproduce the
sections in the description — same headings, same order — so the result matches what the template
would have produced.

**Fill the business sections. Leave the technical sections as headings with a placeholder** —
they exist so the developer fills them when picking the ticket up, and a BA guess there reads as
fact and misleads:

| Section | Ticket (feature) | Bug | Who fills it |
|---|---|---|---|
| User story | ✅ | — | **You** |
| Description | ✅ | ✅ | **You** |
| Reproduce steps | — | ✅ | **You** |
| Code base exploration | placeholder | placeholder | Developer |
| Scope changes | only if the user stated affected areas, in business terms | same | You / Developer |
| Migration/Database | placeholder | placeholder | Developer |
| Test scenarios | ✅ | ✅ | **You** |

### Ticket (feature) body

```markdown
## User story
As a <role>, I want <capability>, so that <business value>.

## Description
<Business context: current behaviour, desired behaviour, why now. Include any rules,
edge cases, and out-of-scope notes the user stated.>

## Code base exploration
_To be filled by the developer._

## Scope changes
<Affected areas in business terms (screens, flows, user groups) — only what the user stated.
Otherwise: "To be filled by the developer.">

## Migration/Database
_To be filled by the developer._

## Test scenarios
1. Given <precondition>, when <action>, then <expected outcome>.
2. …
```

### Bug body

```markdown
## Description
<What is broken, who it affects, business impact. Environment/app version if the user gave it.>

## Reproduce steps
1. <step>
2. …

**Expected:** <what should happen>
**Actual:** <what happens instead>

## Code base exploration
_To be filled by the developer._

## Scope changes
_To be filled by the developer._

## Migration/Database
_To be filled by the developer._

## Test scenarios
<How QA verifies the fix — the reproduce steps re-run, plus the regressions worth re-checking.>
```

Test scenarios are **acceptance criteria in scenario form** — business-observable outcomes, not
unit-test descriptions.

---

## PHASE 3 — CONFIRM & CREATE

1. **Show the full draft** — title, list it will be created in, ticket body — and wait for
   approval. Creating a ticket is an outward action the whole team sees.
2. **Target list**: use what the user said, else `tlm.tickets.defaultListId`, else ask (fetch the
   workspace hierarchy to offer real list names) and offer to persist the answer.
3. **Create ONE task** (`clickup_create_task`, `markdown_description`). Set priority/due date/tags
   only if the user stated them.
4. **Link, don't spawn:**
   - Related tickets the user named → `clickup_add_task_link`. Fill only what's needed to make
     the relation clear — never rewrite an existing ticket's content.
   - A parent the user explicitly named → create this ticket as its subtask.
   - **Never invent subtasks or a ticket breakdown yourself.** One request → one ticket; it is
     the single source of truth. If the user wants it split, they say so — each piece then goes
     through this same flow.
5. Reply with the ticket URL (`urlTemplate` with the new id).

---

## RULES

- **One request, one ticket.** Never auto-create subtasks or sibling tickets.
- **Business only.** Technical template sections stay as placeholders for the developer; never
  guess codebase, migration, or scope-of-change details.
- **Confirm before creating or linking** — outward actions are team-visible.
- Ticket body in `commentLanguage` (default English), whatever language the chat is in. No emojis.
- Keep the template's headings and order even for sections you leave as placeholders — the
  developer relies on the shape.
- Related/parent tickets: link the ids the user gave; if an id doesn't resolve, say so and ask —
  never invent one.
