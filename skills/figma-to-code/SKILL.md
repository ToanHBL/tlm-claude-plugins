---
name: figma-to-code
description: Build a screen or component from a Figma design — fetches the design via the Framelink Figma MCP, confirms what it sees, plans placement, then implements it in the project's actual stack (Next.js App/Page Router or React Native) following the house conventions, wiring real APIs from a curl command or scaffolding mock data when no API exists yet. TRIGGER when the user pastes a figma.com link, or says "build from figma", "implement this design", "vibe code", "code màn hình này từ figma", "làm UI từ design".
---

Turn a Figma design into working, convention-compliant code:

**Pre-flight → Fetch design → Confirm & plan → Implement → Wire data → Iterate**

Stack-agnostic: the output style comes from `fe-coding`'s detected stack, so the same flow produces a
Next.js page or a React Native screen.

**Input**: a Figma URL. If none is given, ask for one — this skill does not build UI from a description
(see Pre-flight).

---

## PHASE 0 — PRE-FLIGHT

**1. Stack.** Resolve via the `fe-coding` skill (`tlm.project.type` → auto-detect → ask). Everything
below adapts to it: Next.js gets Tailwind + `Col`/`Row`/`TextPrimary`; React Native gets
`StyleSheet.create` + theme constants + `scale()`.

**2. Framelink Figma MCP — HARD GATE.** Framelink **is** how this plugin reads Figma — the alternative to
Claude's native/claude.ai "Figma" connector, which we do not use. Any "figma" wording in the request wakes
this skill, and it fetches through Framelink. Check with **ToolSearch** for tools matching
`mcp__*[Ff]ramelink*` or `mcp__*[Ff]igma*`, then **actually fetch the linked file**. Being listed in
`/mcp` is not proof it works — an expired token fails only at fetch time.

**If the MCP is missing, unauthorized, or the fetch errors — STOP. Write no UI code.**

Report precisely which failure it was and what unblocks it:

| Failure | What to tell the user |
|---------|----------------------|
| No Figma MCP tools found | Not configured — run `/project-setup figma`, or add the server manually (checklist Step 2) |
| Tools exist, fetch returns 403 | Token invalid, expired, or lacking *File content* scope — regenerate at Figma → avatar → Settings → Security → Personal access tokens |
| Fetch returns 404 | The file or frame isn't accessible to this token's account — check the link and team access |
| Fetch returns **429**, or the error says rate limit / quota / too many requests | **Not a stop condition.** Retry per PHASE 0.5 and keep going until the design is in hand |
| Fetch errors otherwise (5xx, timeout, socket) | Retry per PHASE 0.5, max 3; then report the actual error |

**Do not improvise the design.** No scaffolding "something close" from the frame name, the URL, a
screenshot, or a verbal description. A screen built from a guess *looks* finished, so nobody re-checks
it — every wrong spacing, color and hierarchy then gets reviewed as if it were the design. That is
strictly worse than delivering nothing and saying why.

This is a deliberate exception to the usual "degrade rather than block": the deliverable **is** fidelity
to the design, so without the design there is no reduced version worth shipping. Non-UI work in the same
request that doesn't depend on the design — a data hook, a type, a route stub — can still proceed; say
which part you did and which part is blocked.

Setup detail and token-handling rules: `${CLAUDE_PLUGIN_ROOT}/setup/SETUP-CHECKLIST.md` → Step 2.
**Never inline a `figd_` token into a committed file, and never echo it back.**

---

## PHASE 0.5 — A rate limit is a wait, not a wall

The design is the single source of truth, and STEP 0 forbids improvising UI. So when the *only* thing
between you and the design is a quota timer, **wait it out**. Stopping at the first 429 and reporting
"the MCP failed" is a false negative: nothing is broken.

**Classify first. Retry only what is retryable.**

| Error | Action |
|---|---|
| 429, quota / rate-limit wording, 408, 5xx, socket timeout | **Retry** — the ladder below |
| 401 / 403 (bad or expired token), 404 (no access to the file) | **Terminal.** Stop and report, per the PHASE 0 table |

**The ladder.**

1. **Honor `Retry-After` when present** — it wins over any computed delay. Figma sends it on 429, as
   delay-seconds or an HTTP date.
2. **Otherwise full jitter**: `sleep = random(0, min(30s, 1s × 2^attempt))`. Jitter is not decoration —
   AWS's *Exponential Backoff And Jitter* found plain exponential backoff leaves clients retrying in
   sync; full jitter spreads them and did the least total work.
3. **Cap at 8 attempts per node**, then move to the next node and come back at the end.
4. **Throttle proactively.** Figma's Tier 1 endpoints — Files and Images, exactly what this MCP hits —
   allow roughly 10/min on Starter to 20/min on Enterprise. Pace fetches at about **one every 6
   seconds**. Most 429s are self-inflicted by a burst.
5. **Announce the wait once** — "rate limited, backing off, N of M nodes cached" — not once per
   attempt. Silence for four minutes reads as a hang.

**Chunk by node id, not by depth.** Fetch the frame, read its child node ids, then fetch **one node per
call**. A single whole-file `get_figma_data` is both the most likely call to trip the quota and the
most expensive one to lose. The tool's own schema says of `depth`: *"OPTIONAL. Do NOT use unless
explicitly requested by the user."* So `nodeId` is the scoping lever; reach for `depth` only as a
deliberate escape hatch when one node is still too large, and say that you did.

**Cache every success to the scratchpad before the next call.** A retry must never refetch a node
already in hand — that is what burns the quota that caused the retry.

```
<scratchpad>/figma/<fileKey>/<nodeId>.yaml     # one file per fetched node
<scratchpad>/figma/<fileKey>/_index.json       # { nodeId: "done" | "pending" | "failed:<code>" }
```

Read the index first and skip anything `done`. The cache is session-local working state: never commit
it, and it must never contain a `figd_` token.

**When it is legitimate to stop.** Report and stop only when:

- the error is **terminal** (401 / 403 / 404) — a quota wait will never fix a permissions problem; or
- **every node has failed 8 times**, more than ~10 minutes of wall clock has passed, and **no new node
  was cached** in the last two attempts. No progress plus no time left is a real stop.

Then say exactly which nodes you *did* cache, and build **only** the parts backed by them. A partially
fetched design is a partial build — never a whole build with the gaps improvised.

---

## PHASE 1 — FETCH THE DESIGN

Fetch the file/frame from the URL and extract:

- Component hierarchy and layout structure
- Colors, fonts, spacing, border radius
- Text content
- Icons used
- Component states, where the design shows them

Present a **brief** summary of what you see and confirm it's the right frame. Designs often contain
several boards — confirming beats rebuilding the wrong one.

---

## PHASE 2 — CLARIFY & PLAN

Ask, in one round:

1. **Where should this live?** Propose a path from the stack's conventions —
   `src/pages/settings/profile.tsx` (Page Router) · `src/app/settings/profile/page.tsx` (App Router) ·
   `app/settings/profile.tsx` (Expo Router) — each a thin route importing a Screen from
   `_modules/pages/[Domain]/`.
2. **Any interactive behavior not visible in the design?** Pull-to-refresh, swipe actions, animations,
   optimistic updates.
3. **Does it need API data?** If yes, ask for a **curl command** showing endpoint, method, headers and
   response shape — or confirm mock data for now.

Then present a short plan: files to create, components to extract, API hooks needed, navigation wiring.
**Wait for approval.**

Map the design to the component hierarchy while planning — a repeated card is a Domain component, a
generic one used across 3+ domains is Common, a new primitive is `Base*`. Don't emit one giant Screen.

---

## PHASE 3 — IMPLEMENT

Follow `fe-coding` — that skill owns the conventions and this one doesn't restate them. The parts that
bite most often when translating a design:

- **Design values become tokens, not literals.** A hex from Figma goes into the Tailwind `@theme` /
  theme constants, then gets used by name. Never `bg-[#0075ff]`, never a raw hex in a StyleSheet.
- **No raw HTML / raw RN primitives** — `Col` / `Row` / `TextPrimary` / `Base*` wrappers.
- **RN:** every icon size and fixed dimension through `scale()`; fonts through `scaleFont()`.
- **All strings through `t()`** — including the copy lifted from the design.
- **Ship the non-happy states** the design didn't draw: loading, empty (header stays, empty component
  renders), error. A design showing only the populated state isn't a spec for hiding the rest.
- **Extract sub-components** into `_modules/pages/[Domain]/components/` — one component per file.
- Use the project's existing icon library before adding a new dependency.

---

## PHASE 4 — WIRE THE DATA

### If a curl command was given

1. Parse it: method, path, headers, request body, response shape.
2. Create the types in `_modules/common/interfaces/` (or beside the API client), **mirroring the
   response field-for-field**. No renaming, no invented DTO — see `ai/shared-fe/07` §7b. The response
   shape in the curl output is the source of truth, not what would read nicer.
3. Add the call to `_modules/_api/apiClient[Domain].ts` through the project's fetch wrapper — never a
   bare `fetch()` in a component.
4. Expose it as a TanStack Query hook (`useQuery[Entity]` / `useMutationCreate`), domain implicit from
   the filename.
5. Wire it into the Screen; loading and error via props, not branches.

### If no API exists yet

Return mock data from the same hook shape, so only the `queryFn` changes when the real endpoint lands:

```ts
// TODO: replace with the real API call
const MOCK_PROFILE: ModelProfile = { /* matches the design's content */ };

export const useQueryProfile = () =>
  useQuery({ queryKey: [ApiUrl.PROFILE], queryFn: async () => MOCK_PROFILE });
```

The mock's field names must be the ones you expect the backend to send. When the real endpoint arrives,
**edit both** the mock and the type to the true names — don't leave an invented shape sitting next to a
differently-shaped real type. That mismatch is exactly how wrong data ships silently.

---

## PHASE 5 — VERIFY & ITERATE

1. Typecheck (`tsc --noEmit`) and, where the project has one, run its lint step.
2. Ask the user to run the screen and look at it.
3. On feedback or a screenshot, re-fetch the original frame and compare specific values — spacing,
   font size, color — rather than adjusting by eye.
4. Iterate until they're satisfied.

---

## RULES

- **Never write UI code without a successful design fetch.** No guessing, no approximating from a
  frame name or screenshot. Blocked means blocked — report why and stop.
- Match the design closely; when something is ambiguous, ask rather than invent.
- Never inline a Figma token into code or a committed file; never print it back.
- Conventions come from `fe-coding` — don't restate or contradict them here.
- English for all code, comments, and identifiers.
- Don't add a UI-kit dependency to reproduce a design. Build the `Base*` primitive instead.
- No API? Mock behind the real hook shape. Never a bare `fetch()` in a component.
