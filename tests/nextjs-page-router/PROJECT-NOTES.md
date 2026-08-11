# Project Notes — Next.js Page Router (User CRUD)

Generated from the `poc/rules` knowledge base as a faithful implementation test.
Feature: a single **User CRUD** screen (list table + Add/Edit modal form + Delete confirm).

## (a) File Tree

```
nextjs-page-router/
├── .env.example                 # NEXT_PUBLIC_API_BASE_URL
├── .gitignore
├── next.config.ts               # output: 'export' (static-export SPA)
├── next-env.d.ts
├── package.json                 # Next 15, React 19, TanStack Query, RHF, Zod, @hookform/resolvers
├── postcss.config.mjs
├── tailwind.config.ts           # Tailwind is the ONLY styling system
├── tsconfig.json                # strict, @/_modules/* + @/* path aliases
└── src/
    ├── pages/                   # Next.js routing — THIN (imports a Screen)
    │   ├── _app.tsx             # Providers + LayoutDefault shell
    │   ├── _document.tsx
    │   ├── index.tsx            # / → HomeScreen (5 lines)
    │   └── users/index.tsx      # /users → UserListScreen (thin)
    ├── styles/
    │   └── globals.css          # @tailwind base/components/utilities
    └── _modules/                # 100% framework-agnostic business logic
        ├── _api/
        │   ├── baseFetch.ts             # fetch wrapper (env base URL + JSON headers)
        │   └── apiClientUser.ts         # useQueryUsers / useMutationCreate|Update|Delete
        ├── common/
        │   ├── components/              # Basic + Base primitives (Tailwind only)
        │   │   ├── Col.tsx / Row.tsx / Text.tsx     # structural — never raw HTML
        │   │   ├── BaseButton.tsx                    # in-house primitive (polymorphic button/span)
        │   │   ├── BaseInput.tsx / BaseSelect.tsx    # forwardRef → register-first
        │   │   ├── BaseModal.tsx                     # in-house modal (no external UI kit)
        │   │   ├── Toast.tsx                         # toast({title,color}) + <Toaster/>
        │   │   └── GlobalNav.tsx                     # Link-only nav, reads router.pathname
        │   └── schemas/
        │       └── userSchemas.ts       # Zod userFormSchema + UserFormData
        ├── config/                      # enums / const objects (no magic strings)
        │   ├── enums.ts                 # EUserRole, EUserStatus + label/option maps
        │   ├── models.ts                # ModelUser, ModelBaseResponse<T> envelope
        │   ├── apiUrl.ts                # ApiUrl endpoint map
        │   └── routeLinks.ts            # RouteLinks enum
        ├── layouts/
        │   └── LayoutDefault.tsx        # mounts GlobalNav once
        └── pages/                       # Screen components (ALL business logic)
            ├── providers.tsx            # QueryClientProvider + <Toaster/> (kept out of src/pages/)
            ├── Home/HomeScreen.tsx
            └── User/
                ├── UserListScreen.tsx           # list + modal orchestration
                └── components/
                    ├── UserModalContent.tsx     # self-managing: owns form + mutations
                    ├── UserForm.tsx             # presentational fields (register-first)
                    └── list/UserTable.tsx       # table via Col/Row/Text
```

## (b) Key File → Rule Mapping

| File | Rule applied |
|------|--------------|
| `next.config.ts` | page-router/01 + shared/01 — `output: 'export'`, `trailingSlash`, `images.unoptimized` (static-export SPA) |
| `src/pages/**` | page-router/01+02 — thin routing files (≤5 lines) that only import a Screen |
| `src/pages/_app.tsx` + `_modules/pages/providers.tsx` | page-router/01 — `_app` mounts providers; `QueryClientProvider` + in-house `Toaster` (providers kept in `_modules/`, see feedback #8) |
| `_modules/_api/apiClientUser.ts` | shared/07 + page-router/03 — domain-implicit hooks (`useQueryUsers`, `useMutationCreate/Update/Delete`) on `baseFetch`; toast-on-error + `invalidateQueries` on success; re-exports enums |
| `_modules/_api/baseFetch.ts` | page-router/03 + skill — client fetch, NOT `getServerSideProps` |
| `config/enums.ts` | shared/04 — string enums `EUserRole`/`EUserStatus`, `Record<Enum,…>` label & option maps |
| `config/models.ts` | shared/04 — `ModelUser` uses enums (no string literals); `ModelBaseResponse<T>` = `{succeeded,data,message,errors?}` |
| `common/schemas/userSchemas.ts` | shared/05 — Zod schema; name required, email required+email, role/status `nativeEnum` |
| `common/components/Base*.tsx` | shared/03 + frontend-conventions — in-house Tailwind primitives; `BaseInput`/`BaseSelect` forwardRef for register-first |
| `common/components/Col/Row/Text` | shared/03 — structural components, never raw `<div>/<p>` |
| `common/components/Toast.tsx` | shared/05+07 — in-house `toast({title,color})` helper |
| `common/components/GlobalNav.tsx` | page-router/02 — Link-only nav, `router.pathname` for active state |
| `pages/User/UserListScreen.tsx` | shared/03+07 — all logic in Screen; function minimalism (inline handlers + TODO); loading/empty/error via props |
| `pages/User/components/UserModalContent.tsx` | shared/03+07 — self-managing modal content; owns `useForm` + mutations; passes `id`, resolves user from cache |
| `pages/User/components/UserForm.tsx` | shared/05 — register-first (`{...register('x')}` on Base primitives) |
| `pages/User/components/list/UserTable.tsx` | shared/03 — domain component under `components/list/`; abstract naming |
| `tsconfig.json` | shared/01 — strict, path aliases; no `as any` anywhere |

## (c) RULES FEEDBACK

Specific ambiguities, gaps, and contradictions hit while generating:

1. **"Never raw HTML" vs. semantic table / a11y (contradiction).** shared/03 and
   frontend-conventions say *never* use `<div>/<p>/<span>` — use `Col/Row/Text`. But
   shared/07 §5 (Accessibility) says "Use semantic HTML." A user listing is naturally a
   `<table>`. I followed the stronger, repeated "never raw HTML" rule and built the table
   from `Col/Row/Text`, which sacrifices semantic `<table>/<th>/<td>` and its screen-reader
   semantics. The rules never say which wins for inherently-semantic structures (tables,
   lists, headings). A carve-out ("Base primitives may wrap semantic elements") would resolve it.

2. **No `GET /users/:id` endpoint vs. "self-managing modal fetches by id" (gap).** shared/03
   and shared/07 model modal content as fetching its own detail by `id`
   (`useQueryBookDetail(id)`). The spec only provides `GET /users` (list). I honored the
   "pass an `id`, not data" rule by having `UserModalContent` resolve the edited user from the
   already-cached list query (`useQueryUsers().data.find(...)`) instead of a detail call. Works,
   but the rules give no guidance for domains without a detail endpoint.

3. **`register()` + `as any` vs. "never `as any`" (contradiction).** shared/03 and shared/05
   repeatedly show `...register('x', UtilsForm.computeRules(...) as any)`. The TypeScript rule
   (and frontend-conventions §8) forbids `as any`. I avoided the conflict by using **Zod +
   `zodResolver`** (typed, no cast) instead of `UtilsForm.computeRules`, but the canonical
   `UtilsForm` examples cannot satisfy the no-`as any` rule as written — `computeRules` returns
   `any` and is spread into a typed `register`. The util's return type needs fixing upstream.

4. **`toast` / `Toaster` / `UtilsForm` referenced but never defined (gap).** The docs import
   `toast` from `@/_modules/common/components/Toast` and `UtilsForm` from
   `common/utils/UtilsForm`, and use a `refModalChildComponent` imperative modal handle, but no
   file defines any of them (nor `BaseModal`'s API). I implemented an in-house `Toast.tsx`
   (pub/sub + `<Toaster/>`) and a controlled `BaseModal` (isOpen/onClose) since the spec asked
   for an "in-house BaseModal." The imperative `refModalChildComponent.onOpen(...)` pattern in
   shared/03 is richer than anything the primitives support — its contract is undocumented.

5. **Modal `if (!isOpen) return null` vs. "no mount/unmount branching" (minor tension).**
   shared/07 §5 says express states via props, never `if (x) return <Y/>`. A modal fundamentally
   mounts/unmounts. I early-return `null` in `BaseModal` when closed (and let
   `UserModalContent` mount fresh per open so the form resets). This is standard, but technically
   brushes against the "always render the same structure" directive — the rule is aimed at
   data/loading states, but doesn't explicitly exempt modals.

6. **Query-key convention mismatch (minor inconsistency).** page-router/03 uses string keys
   like `['product-list', params]`, while shared/07 uses the endpoint constant
   (`[ApiUrl.BOOK_LIST, JSON.stringify(params)]`). I followed shared/07 (endpoint constant as
   key) for consistency with `invalidateQueries`. Harmless, but the two docs disagree.

7. **`TextPrimary` naming drift (cosmetic).** page-router/01 shows an older `TextPrimary` in
   one directory diagram while every other doc mandates `Text`. Followed `Text` (the
   "CORRECTED" convention stated repeatedly). Worth scrubbing the stale diagram.

8. **`providers.tsx` placement pollutes the route table (contradiction, verified at build).**
   page-router/01 literally shows `src/pages/providers.tsx`. But in the Page Router, ANY
   non-underscore file under `src/pages/` becomes a real route — I confirmed the first
   `next build` emitted a bogus static `/providers` page. shared/07's import path
   (`@/_modules/pages/providers`) is the correct home. I moved it to
   `src/_modules/pages/providers.tsx`; the rebuild then produced only `/`, `/404`, `/users`.
   The page-router/01 example is actively wrong and should be corrected.

## Verification

- `npx tsc --noEmit` → exit 0 (no `as any`, strict mode).
- `next build` (static export) → success; routes: `/`, `/404`, `/users`; `out/` generated.
