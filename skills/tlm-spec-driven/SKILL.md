---
name: tlm-spec-driven
description: Run a feature spec-first using OpenSpec — agree on the spec before writing code. Bootstraps OpenSpec into the repo (npx openspec init --tools claude), then drives its propose → apply → archive loop, enriching each change's design.md to map onto this plugin's _modules/ architecture and unifying the change id with the ticket tracker. TRIGGER when the user says "tlm-spec-driven", "openspec", "propose a change", "write a spec first", "spec trước khi code", "làm theo spec", "opsx", pastes an /opsx:* command, or asks to set up OpenSpec in a project. When the SessionStart hook detects an openspec/ directory, offer OpenSpec per ticket/feature — apply it only if the user agrees, otherwise run the normal rules skills — and announce each CLI command it triggers so the user stays aware.
---

# Spec-Driven (OpenSpec)

Agree on **what to build** before writing code, using **OpenSpec** as the engine. This plugin does not
reimplement tlm-spec-driven development — it **bootstraps** OpenSpec into the repo and **wires** it to the
house conventions (`_modules/` architecture, `apiClient[Domain]`, the ticket tracker). OpenSpec owns the
`propose → apply → sync → archive` lifecycle and its own `/opsx:*` slash commands.

**Pre-flight → Bootstrap (once) → Drive the loop → TLM glue**

OpenSpec is an external npm CLI (needs **Node ≥ 20.19**). We drive it via `npx`; nothing is vendored.

**The gate is per ticket / per feature, asked once.** When work starts on a ticket or a substantial
feature, ask the user: *apply OpenSpec (tlm-spec-driven) for this one?* **Only if they say yes** do we run the
OpenSpec flow. If they decline, proceed with the normal rules skills (`tlm-fe-coding` / `tlm-ticket-workflow`) —
no OpenSpec. Once they opt in for that ticket, drive OpenSpec end-to-end without re-asking.

**Transparency:** whenever we do run an `openspec` / `npx openspec` / `/opsx:*` command, print a one-line
notice first so the user is aware of what's being triggered:

```
▶ OpenSpec: npx openspec@latest init --tools claude
```

---

## STEP 0 — Pre-flight

1. **Is OpenSpec already in this repo?** Check for an `openspec/` directory at the repo root. If present,
   OpenSpec is bootstrapped — skip to the per-ticket gate (STEP 2).
2. **Node version** — `node -v`. If below `20.19.0`, stop and say so: OpenSpec's CLI will not run. Offer to
   continue non-spec-driven, or have the user upgrade Node.
3. **CLI reachable** — `npx openspec@latest --version` (first run downloads it). If offline / npm is
   unreachable, report that plainly and offer to proceed without tlm-spec-driven mode this session.

## STEP 1 — Bootstrap (only if `openspec/` is absent)

This **writes files and registers slash commands** in the repo. Announce it (one line, per the
transparency rule above), then run it — no yes/no gate:

```bash
npx openspec@latest init --tools claude        # add --force in CI / non-interactive
```

It creates:

- `openspec/specs/` — the source of truth, organised by capability.
- `openspec/changes/` — one folder per proposed change (`proposal.md`, `design.md`, `tasks.md`,
  `specs/<capability>/spec.md` delta).
- `openspec/config.yaml` — project config.
- `.claude/commands/opsx/*.md` — the `/opsx:propose|apply|sync|archive` slash commands, plus
  `.claude/skills/openspec-*/` — OpenSpec's own driving skills.

After init, commit `openspec/` (it is team-facing, not a secret). Set `tlm.specDriven.engine = "openspec"`
via `/tlm-project-setup` so the SessionStart hook knows this repo is tlm-spec-driven.

## STEP 2 — Per-ticket gate

Once `openspec/` exists, the SessionStart hook reminds Claude that this repo *can* run tlm-spec-driven. But
OpenSpec is **not** applied blanket — it is offered **per ticket / per feature**:

1. When a ticket or a substantial feature starts, ask once: *apply OpenSpec for this one?*
2. **User says yes** → run the propose → apply → sync → archive loop below, announcing each command.
3. **User declines (or it's a trivial change)** → proceed with the normal rules skills; do not touch
   OpenSpec.

**Sizing.** Don't even offer the gate for a one-line fix, a copy tweak, or a rename — just do it under
`tlm-fe-coding`. Offer it when the work is a **new capability or a behaviour change**: a new domain/screen, a
new endpoint, an altered flow.

## STEP 3 — Drive the loop (OpenSpec's `/opsx:*` commands)

| Step | Command | What happens |
|------|---------|--------------|
| Propose | `/opsx:propose <change-id>` | Creates `openspec/changes/<change-id>/` with proposal + spec delta + design + tasks. **Present the proposal so the user is aware, then apply** — adjust if they push back; the spec is the agreement, not a gate. |
| Apply | `/opsx:apply` | Implement against `tasks.md`. Code is written by **`tlm-fe-coding`** under the house rules. Tick tasks as they land. |
| Sync | `/opsx:sync` | Merge the change's spec delta into `openspec/specs/`. |
| Archive | `/opsx:archive` | Complete the change once shipped. |

**Delta format** (in `changes/<id>/specs/<cap>/spec.md`) — OpenSpec validates this shape:

```markdown
## ADDED Requirements
### Requirement: <name>
The system SHALL <behaviour>.

#### Scenario: <case>
- **WHEN** <trigger>
- **THEN** <expected outcome>

## MODIFIED Requirements     ## REMOVED Requirements     ## RENAMED Requirements
```

Run `openspec validate <change-id>` (or `/opsx` equivalents) before apply; a `MODIFIED` block must repeat
every scenario the current spec still has, or validation fails.

## STEP 4 — TLM glue (the value this plugin adds on top of vanilla OpenSpec)

OpenSpec is stack-agnostic. Make its artifacts speak this codebase's language:

- **`design.md` maps onto `_modules/`.** Translate each requirement into concrete placement: Screens in
  `_modules/pages/[Domain]/*Screen.tsx`, domain components under `components/`, data via
  `apiClient[Domain]` hooks (`useQuery[Entity]` / `useMutationCreate|Update|Delete`), routes in
  `routeLinks`, respecting the Basic → Base → Common → Domain → Screen hierarchy. Reuse the tables in
  `ai/templates/input-processing-template.md` to fill it in.
- **`tasks.md` phases align with `tlm-fe-coding`**: Foundation (models + `apiClient[Domain]`) → Core UI
  (`Base*` primitives) → Screens → Integration. Each task traces to an acceptance scenario.
- **Unify the change id with the ticket tracker.** When work comes from a ticket, name the change after
  it: `/opsx:propose tlm-1234-<slug>`. This replaces `tlm-ticket-workflow`'s ad-hoc plan file — the OpenSpec
  change **is** the plan. (Config `tlm.tickets.planDir` becomes moot once tlm-spec-driven is on.)
- **`tlm-fe-coding` reads the active change.** While a change is un-archived and matches the file being
  edited, its `specs/*` are the requirement source and `tasks.md` tracks progress. Substantial new work
  with no matching change → offer `/opsx:propose` first.

---

## Requirements & graceful degradation

| Missing | Behaviour |
|---------|-----------|
| Node < 20.19 | Report it; OpenSpec CLI won't run. Fall back to ordinary `tlm-fe-coding`. |
| npm/network unreachable | Report it; proceed under `tlm-fe-coding` without OpenSpec this session. |

See `setup/tlm-config.reference.json` → `tlm.specDriven` and `skillRequirements.tlm-spec-driven` for the
config contract. Never treat a missing OpenSpec as a hard stop — unlike `tlm-figma-to-code`, this skill
degrades to ordinary `tlm-fe-coding`.
