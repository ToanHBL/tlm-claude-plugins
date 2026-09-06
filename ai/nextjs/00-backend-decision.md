# Where the backend lives — BFF over an existing backend, or backend-first in Next.js

Applies to both routers, **before** the router choice. Answer it once per project and record it in
`.claude/codebase-map.md` (`backend: bff → <backend repo>` or `backend: in-app`).

## The rule

**Decide from what the system already owns, not from preference:**

| The system has… | The Next.js server layer is… |
|---|---|
| A real backend that owns the domain (a C#/.NET API, a services repo — anything with `role: backend` in `.claude/ecosystem-map.md`) | **A BFF only.** Route handlers hold the session cookie, proxy to the backend, and map errors. **No business logic, no database, no re-implementation** of anything the backend does. |
| No backend — the product is standalone, this repo IS the product | **The backend.** New server-side features default to **Next.js server API in the same app** — Server Actions + route handlers + Prisma — not a separate service. |

A separate backend service for a standalone product needs a stated reason (another non-JS consumer, a
team boundary, heavy compute) — "cleaner separation" is not one. And the mirror rule: re-implementing
an existing backend's logic in Next.js "because it's faster than asking" is never acceptable — that is
the guessed-contract failure with extra steps (STEP 1.5).

## Why

Both failure modes shipped and were audited:

- A BFF that grows business logic becomes a second source of truth for rules the backend already owns —
  the two drift, and which one is right becomes a per-bug archaeology question.
- A standalone product that waits for a "real backend later" ships a UI shell full of dead buttons —
  read-only screens with enabled controls wired to nothing, because every mutation was deferred to a
  service that didn't exist. Meanwhile the same-repo pattern (Telemax-Ops) shipped orders, billing,
  Stripe and Xero integrations with the whole stack typecheck-clean — the in-app server API is not a
  compromise, it is the appropriate architecture for a standalone product.

## Branch A — BFF over an existing backend

- Route handlers live in `src/app/api/**/route.ts` (Mode B when the UI is Page Router). They do:
  session check → param/body validation (Zod) → upstream call → error mapping → typed response.
  Nothing else.
- The upstream token stays server-side: httpOnly cookie, upstream calls only from `_modules/server/`
  (`import 'server-only'` at the top of every file there).
- Upstream responses are **parsed against the mirrored Zod schema** at the service boundary
  (`15-zod-contract-first.md`) — the schema mirrors the backend record field-for-field, named after its
  source file (STEP 1.5: read the real contract, never guess it).
- Distinct upstream failures map to distinct statuses (401 / 403-feature-off / 404 / 502) — the UI
  renders different states for them, so the BFF must not collapse them.
- **Session lifecycle is part of the deliverable**: if the upstream issues a refresh token, wire the
  refresh path before calling auth done — a stored-but-never-called `refreshSession` is half a feature
  and fails exactly at the token's expiry.

## Branch B — backend-first in the same Next.js app

The canonical mutation shape (every Server Action, no exceptions):

```ts
'use server';
// 1. auth guard FIRST — an exported action is a public endpoint
const user = await requireUser();
// 2. Zod safeParse the input → field errors back to the form
const parsed = orderSchema.safeParse(raw);
if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
// 3. resolve/compute BEFORE opening the transaction (no network I/O inside tx)
const pricing = resolvePricing(parsed.data);       // pure, unit-tested, in _modules/server/<domain>/
// 4. one transaction for the whole write graph
await prisma.$transaction(async (tx) => { /* … */ });
// 5. revalidate, then redirect
revalidatePath(routeLinks.orders.list);
redirect(withFlash(routeLinks.orders.list, 'orderSaved'));
```

- **Thin handlers/actions, fat services**: the computation lives in `_modules/server/<domain>/*.ts` as
  pure functions — the same functions the client may import for live previews (a form showing a total
  computes it with the *identical* function the action re-runs authoritatively; never trust the
  client's number).
- Prisma via the singleton; `_modules/server/` and `@prisma/client` never imported from a Screen; Node
  runtime on every DB route. (Full stack rules: `page-router/05-fullstack-nextjs-api-prisma.md`, or the
  app-router Server Actions doc.)
- Integration calls (payment, email, shipping) return tagged results (`{ok:true|false}`), are **never
  called inside a transaction**, and write a sync log instead of throwing.
- One split rule for action files: CRUD, status transitions, and each integration get their own action
  file per domain — a 900-line `actions.ts` mixing invoicing with shipping is the God-file this
  architecture exists to prevent.

## Mixed systems

A repo can be both: a standalone product (Branch B) that *also* reads one external system (Branch A for
that seam). Decide **per contract owner**: whoever owns the record decides the branch for that record's
endpoints. When the product spans multiple apps sharing these contracts, the schemas move to
`packages/contracts` — see `shared-fe/16-monorepo-turborepo.md`.
