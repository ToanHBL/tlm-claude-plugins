---
name: fe-coding
description: House conventions for ALL frontend work — Next.js (App Router or Page Router), React Native (Expo Router or CLI), and Next.js API route handlers with Prisma. Detects the project's stack, applies the shared _modules architecture, component hierarchy, Link-only navigation, function minimalism, Tailwind/StyleSheet styling, TypeScript and Zod/React-Hook-Form rules, then layers the stack-specific hard rules on top. Reads .claude/ecosystem-map.md before assuming any contract that lives in another repo of the system (backend API, shared package, web/mobile twin) instead of guessing it. Use whenever creating or editing a component, screen, page, layout, hook, API client, route handler, form, or navigation in any frontend project — including in app/, pages/, _layout.tsx, route.ts, 'use server' actions, expo-router imports, or useQuery hooks.
---

# Frontend Coding

One entry point for every frontend stack. **Detect the stack, apply the shared base, then the
stack-specific hard rules.** Deep reference lives under `ai/` and is read on demand.

**Rules root** — where `ai/` is read from: `<project>/.claude/tlm-plugin/` if that directory exists,
else `${CLAUDE_PLUGIN_ROOT}`. The first is this project's own copy of the rules (installed by
`/project-setup`, committed, **live**); the second is the installed plugin. When they differ, the
project's copy wins — that is how a team keeps a rule this repo needs before it has shipped upstream.

---

## STEP 0 — Figma link present? Gate before any UI code (HARD STOP)

If the request contains a **figma.com link**, this is a design-implementation task. Hand it to the
`figma-to-code` skill, and before writing a single line of UI:

1. **Verify the Figma MCP works** — not just that it's listed. Use **ToolSearch** for
   `mcp__*[Ff]ramelink*` / `mcp__*[Ff]igma*`, then **actually fetch the linked file**.
2. **If the tools are absent, work out WHY before you stop.** A session skips an MCP server it
   failed to reach once and caches that failure, so "no Figma tools" usually means *not connected
   this session*, not *not configured*. Walk the ladder, cheapest first, and stop at the first
   thing that is actually broken:

   | Check | How | What it rules out |
   |---|---|---|
   | Is it configured? | the plugin manifest's `mcpServers` | not installed |
   | Is the token good? | `GET https://api.figma.com/v1/me` with `X-Figma-Token` | expired / wrong token |
   | Can it see the file? | `GET /v1/files/<fileKey>?depth=1` | no access to that file |
   | Does the server run? | launch it over stdio and send `initialize` + `tools/list` | a broken server |

   When the token and the file are fine and the server starts, the only fault is the session's
   cached connection — so **drive that same MCP server directly over stdio** and use its
   `get_figma_data` output. That is still the design tool's output, which is the whole point of
   this gate; it is not a workaround for a missing design. Say plainly in your summary that you
   did this and why.

   A **429 / quota** error is none of these faults. It is a wait, not a failure: back off and loop per
   `figma-to-code` PHASE 0.5, chunking by node id and caching each success. Never report a rate limit
   as a broken MCP.

3. **If a check above genuinely fails — STOP. Do not write UI code.**

   Report exactly what failed (not configured / token invalid or expired / file not accessible /
   server will not start) and what unblocks it: `/project-setup figma`, or a token with
   *File content* scope from Figma → avatar → Settings → Security → Personal access tokens.

**Do not improvise the design.** No scaffolding "something close" from the frame name, the URL, a
screenshot, or your own sense of what the screen should look like. A screen built from a guess *looks*
finished, so nobody re-checks it — and every wrong spacing, color and hierarchy gets reviewed as if it
were the design. That is strictly worse than delivering nothing and saying why.

Stopping here is correct even though most skills prefer to degrade rather than block: the deliverable
**is** fidelity to the design, so without the design there is no reduced version to ship.

**This gate covers UI built from the design.** Non-UI work in the same request that doesn't depend on
the design — a data hook, a type, a route stub, a bug fix elsewhere — proceeds normally. Say clearly
which part you did and which part is blocked.

---

## STEP 1 — Detect the stack (do this first, once per session)

Resolve in this order and **stop at the first hit**:

1. **`tlm.project.type`** in `.claude/settings.local.json` (fall back to `.claude/tlm.local.json`) —
   explicit, user-confirmed, per-project. This is the authority when present.
2. **Auto-detect from the repo:**

   | Signal | Stack |
   |--------|-------|
   | `src/app/page.tsx` or `app/layout.tsx` (UI in `app/`) | `nextjs-app-router` |
   | `src/pages/_app.tsx` | `nextjs-page-router` |
   | `app/api/**/route.ts` **without** `app/page.tsx`, alongside `pages/` | `nextjs-page-router` **Mode B** |
   | `package.json` has `expo` **and** `expo-router` | `react-native-expo` |
   | `package.json` has `react-native`, no `expo` | `react-native-cli` |

   ```bash
   ls src/app/page.tsx src/app/layout.tsx src/pages/_app.tsx 2>/dev/null
   ls src/app/api 2>/dev/null && echo "has app/api"
   grep -o '"\(expo\|expo-router\|react-native\|next\)"' package.json 2>/dev/null | sort -u
   ```

3. **Ask the user** if both are inconclusive or the signals conflict (e.g. `pages/` and `app/page.tsx`
   both present — a genuine mixed repo). Then **offer to persist** the answer to `tlm.project.type` so
   the next session skips detection.

Memory is the last resort only — it goes stale when a repo migrates routers.

**A repo can be mixed.** A monorepo, or an admin app plus a public marketing site, legitimately has more
than one stack. Detect per **file being edited**, not per repo, whenever the two disagree.

Say which stack you detected in one line, then get on with the work. Don't narrate the detection steps.

### Persist the codebase map (write once, read next session)

Detecting the stack is the cheap half. The expensive half — reading `_modules/` to learn where Screens
live, which `Base*` primitives already exist, and the `apiClient[Domain]` naming in use — should run
**once**, then be written down so later sessions read it instead of re-scanning the tree every time.

On the **first** substantive task in a repo, after that scan, persist a short map to
`.claude/codebase-map.md` (committed, not a secret — the whole team benefits). It is the *inside* of this
repo; `.claude/ecosystem-map.md` (STEP 1.5) is everything outside it:

```md
<!-- tlm:codebase-map v1 — regenerate if the repo structure drifts -->
- stack: nextjs-page-router (Mode A)
- modules root: src/_modules/
- Base primitives: BaseButton, BaseInput, BaseSelect, BaseTable, BaseEmptyFallBack
- api clients: apiClientBook, apiClientUser  (pattern: apiClient[Domain].ts)
- notable: i18n via t(); design tokens in src/styles/theme.ts
- project rules: CLAUDE.md, .eslintrc, openspec/ (honored; house rules defer where they conflict)
```

**Honor the project's own rules.** If the repo documents its own conventions — `CLAUDE.md`, `AGENTS.md`,
`.cursorrules`, `.claude/rules/`, an `openspec/` spec, or lint/`tsconfig` settings — read them and apply
them. The house rules below **layer on top of** these and **defer to an explicit project rule where they
conflict** (e.g. the project deliberately allows a pattern these rules forbid). Don't silently override a
documented project convention; surface the conflict and, if it should stick, route it through
`rule-capture`. `project-setup` PHASE 0.4 catalogs these into the map.

On **later** sessions, read `.claude/codebase-map.md` first and skip the directory scan. Re-scan only
when it looks stale — a `Base*` primitive you expect is absent, the detected stack disagrees with the
map, or the modules root moved (a router migration). Keep it terse; it's a lookup, not documentation.

---

## STEP 1.5 — Cross-repo context (when the work touches another repo of the system)

Most repos here are one piece of a larger system: the screen you are writing calls an API owned by
another repo, the type comes from a shared package, the flow already exists on the web twin.

**Never invent a contract that lives in another repo.** An endpoint shape, a payload field, an enum, a
status vocabulary, an error code — guessed, these look right, pass review, and fail at runtime. Read the
real file instead.

**When the task mentions another system, service, app or shared package:**

1. **Read `.claude/ecosystem-map.md` first** (written by `/project-setup`). It lists each registered
   repo: where it is on disk, its stack, where its contracts live, and which of its own rule files
   govern it.
2. **Open the actual file** in that repo — the DTO, the schema, the route handler, the exported type.
   The map says where to look; it is not itself the contract.
3. **Those repos are READ-ONLY reference.** Never edit, commit, stage or run anything inside them. If
   the work genuinely requires a change over there, say so and let the user open that repo — a
   cross-repo change is their call and a separate PR.
4. **A sibling repo's own rules win inside it.** If you quote or adapt code from it, follow *this*
   project's conventions in the code you write here.

**No design, but the feature already exists in a sibling repo? Follow ITS UI.** Before inventing a
layout, check whether the registered repos already ship this screen — an admin app, a Blazor client,
the mobile twin. If one does and the user gave no Figma, **that existing UI is the design**: match its
information order, its groupings, its labels and its controls, so a user who knows one product is not
relearning the other. Read the real component over there — `.claude/ecosystem-map.md` says where —
and say in your summary which file you matched.

**Match the styling, not the stack.** The other repo's framework, component library and CSS are its
own; you still build with THIS project's conventions — `_modules/`, `Base*` primitives, tokens,
`t()`, TanStack Query. Copy the shape of the screen and the words on it; never copy Blazor markup, a
foreign design system's classes, or a state pattern that has no place here. Where its mechanism
conflicts with ours, ours wins and you say why: a sibling caching bearer tokens in `localStorage` is
not a reason for us to.

Order of authority: **a Figma the user gave → the sibling repo's shipped UI → the defaults in
`09`–`13`.** Never skip a rung, and never treat a sibling's UI as permission to ignore a design that
does exist.

**Search the backend repo before you propose ANY new endpoint or type.** The screen you are about
to build is often already served. Grep the backend for the domain noun plus the page's version
(`VehicleV2`, `InstallRecord`) and read the controller's route attributes and the DTOs it returns —
a page that looks like a dozen missing endpoints is regularly one existing payload plus two real
gaps. Proposing a new API next to one that already ships is worse than guessing a field name: it
gets built.

**When something genuinely does not exist, write it down instead of inventing it.** Put the gap in
a handoff doc (`_docs/<feature>-handoff.md`) that says what is reused, what is missing, and the
shape you propose — and mark every such type in code as PROPOSED, next to the ones that mirror a
real record. Then build the UI against a mock that is **typed to the real backend record**, so
swapping the mock for the endpoint is a service change, not a component rewrite. A mock with an
invented shape hard-codes the wrong contract into every component that reads it.

**Respect the design file's own scope markers.** Canvases and sections say what they are —
"build now", "Phase 2 — later", "Archive / WIP — nothing here is being built", "SUPERSEDED".
Read them and build only what is in scope; a superseded frame looks exactly as finished as a
current one. If a file has a Handover or Changelog frame, read it first: it carries the decisions
and the "drawn but not yet true in code" list that no product frame shows.

**When the repo you need is not registered**, say so and offer to add it — don't guess and don't
silently proceed:

```bash
RULES=".claude/tlm-plugin"; [ -d "$RULES" ] || RULES="${CLAUDE_PLUGIN_ROOT}"
node "$RULES/skills/project-setup/ecosystem.mjs" list                       # what is registered
node "$RULES/skills/project-setup/ecosystem.mjs" add <path-or-giturl> --role backend
node "$RULES/skills/project-setup/ecosystem.mjs" sync && node "$RULES/skills/project-setup/ecosystem.mjs" index
```

If a registered repo is missing from disk, `sync` re-clones it. If it still cannot be read, **ask the
user for the contract** — a stated assumption is recoverable, a fabricated endpoint is not.

---

## STEP 1.6 — Business understanding of the system (MUST, before every task)

STEP 1.5 stops you inventing a **contract**. This step stops you inventing a **purpose** — the quieter
and more expensive failure, because a wrong contract fails at runtime while a misunderstood domain
ships a screen that works perfectly and answers the wrong question.

`.claude/ecosystem-map.md` gives you roles and paths, and says so itself: *"A link that runs over the
network — an app calling a backend API — will NOT show up as a package dependency."* Knowing that a
repo is `role: mobile` tells you nothing about **who** uses it, **when** in the business process, or
**which** of this app's records it creates.

This is DDD's strategic half applied to a repo list — Fowler on context maps: *"It's usually worthwhile
to depict these using a context map"*; and on the vocabulary they depend on, *"Ubiquitous Language …
the practice of building up a common, rigorous language between developers and users."* The vocabulary
check below is that practice, run cheaply.

### 1.6.a — Recap on EVERY task; the full run once per repo

**Open every task with a one-line recap** of the business context, drawn from
`.claude/business-context.md`, and proceed unless corrected:

> *Per business-context: Telemax2 owns the vehicle record; this app is a read-only view of it, and the
> installer app upstream creates what we display. Correct?*

One line, before the work, every time — including a bug fix. It costs a sentence and it is the only
thing that catches a wrong mental model before it becomes a screen.

The **full run** below happens once per repo, and again for each newly registered repo. If the user
corrects the recap, or a contract contradicts the file, re-run the affected section only and update it.

### 1.6.b — The full run

**1. Draft it yourself first. Never open with questions.** A blank questionnaire pushes your job onto
the user; their corrections to a concrete draft are worth ten times their answers to open questions.
Read, cheapest first: `.claude/ecosystem-map.md`, then each repo's `README.md` and `CLAUDE.md`, then in
each repo the two things that carry the business and nothing else does — the **domain nouns**
(top-level folders, controller and entity names) and the **status vocabulary** (the enums: what states
a thing can be in, and who moves it between them). A status enum is the cheapest, densest statement of
a business process anywhere in a codebase.

**2. Present it — six lines, not a document.** Business terms, in the user's language, not package
names: who uses each repo, what it owns, how it relates to this one, which words mean two things, and
what you are still unsure of.

**3. Then ask 3–5 questions, in one round.** Only where being wrong changes what you build:

1. **Who uses the screen I am about to build, and what do they do immediately after?**
2. **Which repo owns this record?** Ownership decides whether a gap is our bug or a backend request.
3. **Where does one word mean two things?** Name the pair you found. Highest-yield question here — a
   term that shifts meaning across two repos IS a boundary, and code that treats it as one thing is
   broken there and looks fine.
4. **Anything on my map that is wrong or already dead?** A superseded flow looks exactly as alive as a
   current one.
5. **(Only when proposing anything cross-repo)** *"I read X in `<repo>/<file>`. Still true?"*

**Never ask what the ecosystem map, a README or an enum already answers** — that is the ask that makes
the user resent the step.

**4. Write it down, or it was theatre.** Persist to **`.claude/business-context.md`**, committed, so
the next session and the next teammate skip the run: a table of repo / who uses it / what it owns /
relation to this app, then shared vocabulary, then the boundaries that bite, then what is still open.

**Do NOT write this into `.claude/ecosystem-map.md`.** That file is generated by `ecosystem.mjs index`
and says "do not hand-edit" — anything added there is destroyed on the next `add` / `sync`.
`business-context.md` is the hand-written companion: the map says *where*, this says *why*.

### 1.6.c — Sibling repos stay read-only

Everything in STEP 1.5 still applies. Reading a repo to understand the business does not make it yours
to edit, and a business insight that implies a change over there is a conversation, not a commit.

---

## STEP 1.7 — E2E: ask in the PLAN, not at the end

If the project **already has** a Playwright suite (`playwright.config.*`, `e2e/`), do not ask —
updating it is part of the change, and the `e2e-watch` hook will remind you when you touch a route or
a screen.

If it does not, and this task adds or changes a user-reachable route, **offer it once while the plan
is still being agreed**, as a line the user can strike out:

> *E2E: I'll add a Playwright spec covering `/vehicles → /vehicles/{id} → install record` — the
> navigation chain plus a no-failing-request sweep. Say if you'd rather skip it.*

Asking after the code is written is too late: by then the answer costs the same either way and the
honest one ("no") looks like a retreat. Full rule, including what the suite must assert and what it
must not: `ai/shared-fe/14-e2e-testing.md`.

---

## STEP 2 — Shared base (applies to EVERY stack, always)

### Choosing the Next.js router (team policy)

**Default to Page Router. Reach for App Router only when you genuinely need it — chiefly public,
SEO-facing "publish" pages.** This is a deliberate org preference, not a neutral "it depends".

| Use **Page Router** (default) | Use **App Router** (only when needed) |
|---|---|
| Management / admin / internal apps — dashboards, CRUD, back-office, authenticated tools | **Public "publish" pages** — marketing, landing, blog, docs, product pages needing SEO / social metadata |
| Behind a login; SEO irrelevant | SSR / SSG / ISR, streaming, or edge rendering genuinely required |
| Simple client-rendered SPA, fast iteration, minimal boilerplate | Specifically need Server Components, Server Actions, or nested partial-render layouts |

A product with both an admin area and a public site may **mix** — Page Router for the admin, App Router
for the public pages. Don't migrate an admin app to App Router for "modernness"; that is not a
sufficient reason under this policy.

### Where the backend lives (decide BEFORE the router)

- **The system already has a real backend** (`role: backend` in `.claude/ecosystem-map.md`) → the
  Next.js server layer is a **BFF only**: hold the session cookie, proxy, map errors. No business
  logic, no DB, no re-implementing what the backend owns.
- **Standalone product, no backend** → new server-side work defaults to **Next.js server API in the
  same app** — Server Actions + route handlers + Prisma (`'use server'` → auth guard → Zod `safeParse`
  → pure service fn → `prisma.$transaction` → `revalidatePath`). A separate service needs a stated
  reason; "cleaner separation" is not one.

Record the answer in `.claude/codebase-map.md` (`backend: bff → <repo>` / `backend: in-app`).
→ `ai/nextjs/00-backend-decision.md`

### 1. Framework-agnostic `_modules/` architecture

Business logic lives in `_modules/`, **never** in the routing layer. Routing files are thin (≤5 lines)
and only import a Screen component.

```
src/
├── [pages/ or app/]      # routing ONLY — thin, imports a Screen component
└── _modules/             # 100% portable business logic
    ├── _api/             # API clients (apiClient[Domain].ts)
    ├── common/           # Basic + Base + Common components, utils, hooks
    ├── config/           # routeLinks, apiUrl, enums, constants
    ├── pages/            # Screen components (ALL business logic + domain components)
    └── server/           # Server-side operations (Server Actions / route-handler services)
```

**Why:** portable across frameworks — App Router, Remix, Vite, even RN with shared logic.

**A product with more than one app** (ops + customer portal, web + mobile twin) is a **Turborepo
monorepo** — `apps/*` + `packages/contracts` (Zod schemas + fixtures), apps never importing each other.
Each app keeps this same `_modules/` layout inside it. → `ai/shared-fe/16-monorepo-turborepo.md`

### 2. Component hierarchy — put components in the right layer

```
Basic     → Col, Row, TextPrimary, Box, Stack   (structural, no business logic)
Base      → BaseButton, BaseInput, BaseSelect    (in-house primitives; Tailwind on web, StyleSheet on RN)
Common    → SearchInput, ConfirmModal            (used across 3+ domains)
Domain    → BookCard, ProductForm                (one domain; in pages/[Domain]/components/)
Screen    → HomeIndexScreen, ProductListScreen   (page-level; in pages/[Domain]/)
```

- Domain components **never** go in `common/components/`.
- **React 19: `ref` is a normal prop — do NOT use `forwardRef` in new code.** Type it as
  `props: OwnProps & { ref?: Ref<HTMLInputElement> }`; it passes through `{...props}` like any prop
  (`register()` / `setValue` still bind fine). `forwardRef` is legacy, for React ≤18 codebases only.
- Create components liberally — even for a single use, if it clarifies boundaries.
- Use abstract folder names (`list/`, `detail/`, `form/`), not specific ones.
- **Never use raw HTML** (`<div>`, `<p>`, `<span>`) — use `Col` / `Row` / `TextPrimary`. If a
  semantic/structural element is missing (e.g. a table), build it as an in-house `Base*` component
  (`BaseTable`) — `Base*` primitives are the **only** layer allowed raw/semantic DOM + ARIA.

### 3. Navigation — Link only, never onClick+push (CRITICAL)

```tsx
// ✅ Web: always use Link
<Link href="/products" className="no-underline">
  <BaseButton as="span">Products</BaseButton>
</Link>

// ❌ NEVER navigate via onClick
<BaseButton onClick={() => router.push('/products')}>Products</BaseButton>
```

**Why:** native browser behavior — Ctrl/middle-click, prefetch, a11y. `router.push`/`replace` are for
post-action redirects only. React Native uses `router.navigate` — see the RN block in STEP 3.

**On a listing, paging and sorting are destinations and stay `<Link>`** — a user must be able to
middle-click page 3. Only a filter *control* commits through `router.replace(…, { scroll: false })`,
and only on Apply. See `ai/shared-fe/09-data-listing.md` §3–4.

### 4. Function minimalism (YAGNI)

Do not pre-create named handler functions or `useCallback`. Use inline anonymous functions with a
`TODO`, and reserve `useMemo` for genuinely expensive computations.

```tsx
<BaseButton onClick={() => refModal.current?.onOpen(<BookModalContent />)}>Edit</BaseButton>
```

Express loading / empty / error via **props**, not `if (loading) return <Spinner/>` branches that
mount and unmount whole subtrees.

**Listings and images have their own rules.** A screen that lists records, or renders an image the
user needs to read, follows `ai/shared-fe/09-data-listing.md` (table by default, server-driven sort /
filter / paging, `limit`+`offset` in the URL, four states) and `ai/shared-fe/10-images-and-preview.md`
(thumbnails open a preview modal, images reserve their box and fail visibly). Both apply when the user
gave **no design**; with a design, STEP 0 wins. Responsive defaults live in
`ai/shared-fe/11-responsive-defaults.md`, the post-coding affordance pass in
`ai/shared-fe/12-interactive-affordances.md`, mock labelling in `ai/shared-fe/13-mock-data.md`, and end-to-end coverage in
`ai/shared-fe/14-e2e-testing.md`.

**Empty states — show, don't hide (MUST).** A section with no data keeps its **header** and renders a
visible empty state. Never wrap the whole block in `data.length > 0 ? (…) : null` — a hidden block is
invisible to QC, who then can't tell "empty by design" from "silently broken".

```tsx
// ❌ whole section vanishes — untestable
{items.length > 0 ? <Col><SectionHead/>{items.map(…)}</Col> : null}

// ✅ header always renders; a wrapper owns the empty case
<Col>
  <SectionHead />
  <BaseEmptyFallBack isEmpty={items.length === 0} title={t('allClear')} message={t('…')}>
    {items.map(…)}
  </BaseEmptyFallBack>
</Col>
```

**Conditional mid-layout blocks reserve space.** Error banners, validation messages and hints that sit
**between** other content must not mount/unmount as a whole — the height change shifts everything below
(flicker). Always render the container with a token-backed `min-height` and toggle only the content
inside (transparent background when inactive). A block at the **end** of a layout is exempt.

### 5. Styling

- Web: layout via `Col` / `Row` + Tailwind utility classes; text via `TextPrimary`. RN: `StyleSheet.create`
  + theme constants (no NativeWind).
- Build in-house `Base*` primitives; screens use those, never raw framework UI kits.
- Design tokens live in ONE place — Tailwind v4 `@theme` in global CSS, v3 `theme.extend` in the config,
  RN a theme constants module. **Never hardcode hex in components** (`bg-[#0075ff]`, inline styles).
  A new color is a token change, not a per-component decision.
- Wrap all display strings in `t()` (i18next) — never hardcode.
- **Mobile-first, and a single drawn width is not an excuse.** Order breakpoints small-to-large
  (unprefixed = small, `lg:` = the drawn width — never `sm:` as "mobile"). A design drawn at 1440 only
  is built at 1440 **and** must not break below it: no horizontal page scroll, no clipped text, no
  unreachable control. Fixed pixel widths in a `Row` are the usual cause; `min-w-0` on the flex child
  is the fix for text that won't truncate. This is a default for the ABSENCE of a design — if Figma has
  a mobile frame, STEP 0 wins and you build that. See `ai/shared-fe/11-responsive-defaults.md`.

**Display strings are null-safe.** API values can be `null`, `undefined`, or the string `"null"`; raw
template literals leak those to the user. Wrap single values in `safeString(v)`; compose multi-part
strings with `joinText(...)` (space) or `joinWith('·', ...)` — the separator is `joinWith`'s first arg,
**never** hardcoded in a template literal / JSX and never passed positionally to `joinText` (it dangles
when its neighbour is empty). No nested ternaries inside template literals; map enums with
`Record<Enum, T>`, never a ternary chain.

### 6. Naming

| Kind | Convention | Example |
|------|-----------|---------|
| Components | PascalCase + suffix | `ProductCard.tsx`, `ProductListScreen.tsx` |
| Hooks | camelCase `use…` | `useProductFilter.ts` |
| API clients | `apiClient[Domain].ts`, domain implicit | `apiClientBook.useMutationCreate()` |
| Utilities | `Utils[Domain]` | `UtilsForm`, `UtilsNavigation` |
| Models | `Model` prefix | `ModelProduct` |
| Constants/config | camelCase | `routeLinks.ts`, `apiUrl.ts` |

### 7. Import ordering (required)

```tsx
// 1. React (avoid useCallback)
// 2. Next.js / Expo Router
// 3. Third-party (react-i18next, react-hook-form, @tanstack/react-query)
// 4. Internal API      (@/_modules/_api/…)
// 5. Internal components(@/_modules/common/components/…)
// 6. Internal utils    (@/_modules/config/…, @/_modules/common/utils/…)
// 7. Context           (@/_modules/pages/providers)
```

### 8. TypeScript

- **Never use `as any`.** Fix the root cause with proper types, generics, or type guards. Use
  `as unknown as T` only as a last resort, with a comment.
- **Never use `@ts-ignore` / `@ts-expect-error`** unless unavoidable — always comment why.
- Prefer enums / `as const` objects in `config/` over magic strings. See `ai/shared-fe/04`.

### 9. Validation — Zod-first + React Hook Form

**The Zod schema is the source of truth for every wire contract** — the TypeScript type comes from
`z.infer`, never hand-written next to the schema. One schema serves both sides: `zodResolver(schema)`
on the form and `schema.safeParse` in the action/handler, so client and server rules are the same
object and cannot drift.

Use `UtilsForm.computeRules` to derive validation messages / RHF rules from a Zod schema. It returns RHF
`RegisterOptions` and is fully typed — **no `as any` cast needed**.

**Default to `register()`** — wire fields with `<BaseInput {...register('x')} />`. Reach for
`Controller` / `useController` **only** when a field needs heavy customization (custom controlled
inputs). See `ai/shared-fe/05-validation-patterns.md`.

### 10. Data & API clients

- TanStack Query for server state; `apiClient[Domain].ts` exposes `useQuery[Entity]` /
  `useMutationCreate/Update/Delete` (domain implicit from the filename).
- API errors: `BaseToast.show({ title, color })` + `throw` inside the client; invalidate related queries
  `onSuccess`.
- **Types mirror the backend response field-for-field (MUST).** No app-side DTO, no mapper that renames
  or re-derives a field under a different name — that drift ships wrong data silently (a `rego` field
  computed as `registrationNumber ?? String(id)` displayed a numeric id as a licence plate). Derive
  display values **inline at the render site** from the untouched source field. When wiring a real
  endpoint over a mock, edit both so they agree on the true names. See `ai/shared-fe/07` §7b.
- **Responses are parsed, not cast (MUST).** `await res.json() as T` is a promise the compiler believes
  and nobody checks — a backend rename stays green in `tsc` and renders em-dashes in production. The
  mirroring above is done as a **Zod schema** (`z.infer` for the type) and every consumed response goes
  through `schema.parse`/`safeParse` at the service boundary. Mocks/fixtures are pinned with
  `satisfies`. See `ai/shared-fe/15-zod-contract-first.md`.

---

## STEP 3 — Stack-specific hard rules

Apply the block for the detected stack. These are inline because they must hold **without** a second
file read. Load the linked reference when the task needs the depth.

### `nextjs-app-router`

- `app/` files thin — routing only, importing a Screen from `_modules/pages/`.
- **Server Component by default**; `'use client'` only for hooks/interactivity, pushed to the **leaves**.
  A Client Component may render Server Components only via `children`.
- **Never `Date.now()` / `new Date()` / `Math.random()` during render** → hydration mismatch.
- Params via `useParams()` / `useSearchParams()` (client) or the `params` / `searchParams` props
  (server) — never `next/router`.
- Mutations = **Server Actions** in `_modules/server/`, Zod-validated **and auth-checked** at the top
  (an exported action is a public endpoint), then `revalidatePath` / `revalidateTag`.
- Every new route segment ships `loading.tsx` + `error.tsx`.

→ `ai/nextjs/app-router/06-hard-rules.md` · `01-architecture` · `02-routing-structure` ·
`03-server-actions` · `04-data-fetching`

### `nextjs-page-router`

- `pages/` files thin. Data via `useQuery[Entity]` hooks — **never** `getServerSideProps`.
- Params via `router.query`; layout/nav in `_app.tsx`, not per-page.
- **Pick one deployment mode.** **Mode A** static-export SPA (`output: 'export'`, external backend,
  absolute `NEXT_PUBLIC_API_URL`) — no `pages/api/*`, no SSR, no Server Actions; the export build rejects
  them. **Mode B** fullstack (see below).
- Needing a real server in Mode A means switching to Mode B — an explicit decision to raise with the
  user, never a silent scaffold of `pages/api/*`.

→ `ai/nextjs/page-router/06-hard-rules.md` · `01-architecture` · `02-routing-structure` ·
`03-api-data-flow` · `04-migration-to-app-router`

### `nextjs-api-prisma` (Page Router **Mode B** — triggered when the task touches `app/api/`)

- UI stays in `pages/`; **API is App Router route handlers** in `src/app/api/**/route.ts`. No legacy
  `pages/api/*`, no `page.tsx`/`layout.tsx` in `app/`, **no SSR**.
- `next.config` must **NOT** set `output: 'export'` — handlers need a Node server.
- **Thin handlers, fat services.** `route.ts` does HTTP plumbing only; real work in
  `_modules/server/[domain]/*.ts` through the **Prisma singleton** — never `new PrismaClient()` per request.
- **Next.js 15:** dynamic `params` is a Promise — `const { id } = await params`.
- Zod-validate every input at the boundary → `400` on failure.
- `_modules/server/` and `@prisma/client` are **server-only** — never imported from a Screen. Node
  runtime only; never `runtime = 'edge'` on a DB route.

→ `ai/nextjs/page-router/05-fullstack-nextjs-api-prisma.md`

### `react-native-expo`

- **`router.navigate`, NOT `router.push` (CRITICAL).** `push` always pushes, so a spam tap duplicates
  the screen and the user must press back twice. `navigate` no-ops when the route + params already match.
  `<Link>` already behaves like `navigate` — don't add `push`.
- Params via `useLocalSearchParams()`, never `useRoute().params`.
- `app/` files thin → `_modules/pages/…Screen`.
- **Data-driven lists use `FlatList`** (stable `keyExtractor`, `ListHeaderComponent`,
  `ListEmptyComponent`) — never `ScrollView` + `.map()`. This is **orientation-agnostic**: a horizontal
  row of data-driven items (filter chips with counts, a card carousel, a chip rail) uses
  `FlatList horizontal` + `showsHorizontalScrollIndicator={false}`, **not** a horizontal `ScrollView` +
  `.map()`. `ScrollView` (vertical or horizontal) is only for a small, fixed, hand-authored set that never grows.
- **`scale()` on every icon size and fixed dimension**, `scaleFont()` on font sizes. Theme tokens are
  pre-scaled once — never scale them again.
- RN primitives (`View` / `Text` / `Pressable`) only via the `Col` / `Row` / `TextPrimary` / `Base*` wrappers.

→ `ai/reactnative/06-hard-rules.md` · `01-architecture` · `02-styling-stylesheet` ·
`03-navigation-expo-router` · `04-data-and-storage` · `05-validation-forms`

### `react-native-cli`

Everything in the `react-native-expo` block **except** navigation: React Navigation instead of Expo
Router — `navigation.navigate('Screen', params)` (same spam-tap reasoning), params via
`useRoute<RouteProp<…>>().params`, navigators declared in `_modules/navigation/` rather than by file
convention. Screens still live in `_modules/pages/[Domain]/*Screen.tsx`.

→ `ai/reactnative/06-hard-rules.md` (§1 marks the CLI differences)

---

## Before finishing any component

Run the checklist in `ai/shared-fe/07-ai-workflow-integration.md` §9: right folder, `Col`/`Row`/`TextPrimary`
not raw HTML, `Link` not onClick, function minimalism, typed (no `as any`), i18n strings, loading via
props, empty states visible, API types mirroring the backend.

Plus: run the **affordance pass** — `ai/shared-fe/12-interactive-affordances.md` §5, with the screen
open. Tailwind v4 dropped `cursor: pointer` from `<button>`, so a pressable that reads correctly in the
diff can still have no hand cursor, no focus ring and a 16px hit target.

Plus: **every cross-repo contract you used came from a file you actually opened**, not from a shape that
looked right (STEP 1.5). If you had to assume one, say so explicitly in your summary.

If the user corrects your output — "do it this way instead, because…" — that feedback may be a rule
worth keeping. See the `rule-capture` skill.
