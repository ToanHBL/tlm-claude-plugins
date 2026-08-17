---
name: frontend-conventions
description: Shared frontend rules for any React / Next.js / React Native code — _modules architecture, component hierarchy, Link-only navigation, function minimalism, Col/Row/TextPrimary + Tailwind CSS styling, TypeScript, and Zod/React-Hook-Form validation. Use whenever creating or editing components, screens, hooks, API clients, or forms in a frontend project.
---

# Frontend Conventions (Shared Base)

These rules apply to **all** frontend code — Next.js (App or Page Router) and React Native.
The framework-specific skills (`nextjs-app-router`, `nextjs-page-router`, `react-native-expo`) build
on this base. When any of those triggers, apply these conventions too.

Deep reference (bundled with this plugin): `ai/shared/` and `ai/README.md`.

## Choosing the Next.js router (team policy)

**Default to Page Router. Reach for App Router only when you genuinely need it — chiefly for public,
SEO-facing "publish" pages.** This is a deliberate org preference, not a neutral "it depends".

| Use **Page Router** (default) | Use **App Router** (only when needed) |
|---|---|
| Management / admin / internal apps — dashboards, CRUD, back-office, authenticated tools | **Public "publish" pages** — marketing, landing, blog, docs, product pages needing SEO / social metadata |
| Behind a login; SEO irrelevant | SSR / SSG / ISR, streaming, or edge rendering genuinely required |
| Want a simple client-rendered SPA, fast iteration, minimal boilerplate | Specifically need Server Components, Server Actions, or nested partial-render layouts |

- **Managed/internal product → Page Router** (skill `nextjs-page-router`). Backend, if any, is that
  skill's Mode B (App Router route handlers under `app/api` + Prisma) — that does **not** make the UI an
  App Router app.
- **Public site / publish pages → App Router** (skill `nextjs-app-router`), for the SEO/SSR wins.
- A product with both an admin area and a public site may **mix**: Page Router for the admin, App Router
  for the public pages (separate apps, or coexisting in one repo). Don't migrate an admin app to App
  Router just for "modernness" — that's not a sufficient reason under this policy.

## 1. Framework-agnostic `_modules/` architecture

Business logic lives in `_modules/`, **never** in the routing layer. Routing files are thin (≤5 lines)
and only import a Screen component.

```
src/
├── [pages/ or app/]      # Next.js routing ONLY — thin, imports a Screen component
└── _modules/             # 100% portable business logic
    ├── _api/             # API clients (apiClient[Domain].ts)
    ├── common/           # Basic + Base + Common components, utils, hooks
    ├── config/           # routeLinks, apiUrl, enums, constants
    ├── pages/            # Screen components (ALL business logic + domain components)
    └── server/           # Server-side operations (App Router)
```

**Why:** portable across frameworks (App Router, Remix, Vite, even RN with shared logic).

## 2. Component hierarchy — put components in the right layer

```
Basic     → Col, Row, TextPrimary, Box, Stack   (structural, no business logic)
Base      → BaseButton, BaseInput, BaseSelect    (in-house primitives styled with Tailwind CSS)
Common    → SearchInput, ConfirmModal            (used across 3+ domains)
Domain    → BookCard, ProductForm                (one domain; in pages/[Domain]/components/)
Screen    → HomeIndexScreen, ProductListScreen   (page-level; in pages/[Domain]/)
```

- Domain components **never** go in `common/components/`.
- **React 19: `ref` is a normal prop — do NOT use `forwardRef` in new code.** Type it as
  `props: OwnProps & { ref?: Ref<HTMLInputElement> }`; it passes through `{...props}` like any prop
  (`register()`/`setValue` still bind fine). `forwardRef` is legacy, for React ≤18 codebases only.
- Create components liberally — even for a single use, if it clarifies boundaries.
- Use abstract folder names (`list/`, `detail/`, `form/`), not specific ones.
- **Never use raw HTML** (`<div>`, `<p>`, `<span>`) — use `Col`/`Row`/`TextPrimary`. If a semantic/
  structural element is missing (e.g. a table), build it as an in-house `Base*` component (`BaseTable`) —
  `Base*` primitives are the **only** layer allowed raw/semantic DOM + ARIA.

## 3. Navigation — Link only, never onClick+push (CRITICAL)

```tsx
// ✅ Next.js: always use Link
import Link from 'next/link';
<Link href="/products" className="no-underline">
  <BaseButton as="span">Products</BaseButton>
</Link>

// ❌ NEVER navigate via onClick
<BaseButton onClick={() => router.push('/products')}>Products</BaseButton>
```

**Why:** native browser behavior (Ctrl/middle-click, prefetch, a11y). React Native uses Expo Router's
`router.navigate` — see the `react-native-expo` skill.

## 4. Function minimalism (YAGNI)

Do not pre-create named handler functions or `useCallback`. Use inline anonymous functions with a
`TODO`, and reserve `useMemo` for genuinely expensive computations.

```tsx
<BaseButton
  onClick={() => {
    // TODO: extract to a function only if profiling shows a problem
    refModal.current?.onOpen(<BookModalContent />);
  }}
>
  Edit
</BaseButton>
```

Express loading/empty/error via **props**, not `if (loading) return <Spinner/>` branches that
mount/unmount whole subtrees.

## 5. Styling — Tailwind CSS

- Layout via `Col`/`Row` + Tailwind utility classes; text via `TextPrimary`.
- Build in-house `Base*` primitives styled with Tailwind CSS; screens use those `Base*` components, never raw framework UI kits.
- Design tokens live in ONE place — Tailwind v4: `@theme` in the global CSS; v3: `theme.extend` in
  the config. **Never hardcode hex in components** (`bg-[#0075ff]`, inline styles) — only
  token-backed classes. New colors are a token change, not a per-component decision.
  See `ai/shared/02-styling-ui-conventions.md`.
- Mobile-first, responsive. Wrap all display strings in `t()` (i18next) — never hardcode.

## 6. Naming

| Kind | Convention | Example |
|------|-----------|---------|
| Components | PascalCase + suffix | `ProductCard.tsx`, `ProductListScreen.tsx` |
| Hooks | camelCase `use…` | `useProductFilter.ts` |
| API clients | `apiClient[Domain].ts`, domain implicit | `apiClientBook.useMutationCreate()` |
| Utilities | `Utils[Domain]` | `UtilsForm`, `UtilsNavigation` |
| Models | `Model` prefix | `ModelProduct` |
| Constants/config | camelCase | `routeLinks.ts`, `apiUrl.ts` |

## 7. Import ordering (required)

```tsx
// 1. React (avoid useCallback)
// 2. Next.js / Expo Router
// 3. Third-party (react-i18next, react-hook-form, @tanstack/react-query)
// 4. Internal API      (@/_modules/_api/…)
// 5. Internal components(@/_modules/common/components/…)
// 6. Internal utils    (@/_modules/config/…, @/_modules/common/utils/…)
// 7. Context           (@/_modules/pages/providers)
```

## 8. TypeScript

- **Never use `as any`.** Fix the root cause with proper types, generics, or type guards. Use
  `as unknown as T` only as a last resort, with a comment.
- **Never use `@ts-ignore` / `@ts-expect-error`** unless unavoidable — always comment why.
- Prefer enums/`as const` objects in `config/` over magic strings. See `ai/shared/04`.

## 9. Validation — Zod + React Hook Form

Use `UtilsForm.computeRules` to derive common validation messages / RHF rules from a Zod schema
(includes number support). It is fully typed — it returns RHF `RegisterOptions`, so **no `as any` cast is
needed**. See `ai/shared/05-validation-patterns.md` for the full pattern and the self-managing
modal-content form.

- **Default to `register()`** — wire fields with `<BaseInput {...register('x')} />` (web). Reach for
  `Controller`/`useController` **only** when a field needs heavy customization (custom controlled inputs).

## 10. Data & API clients

- TanStack Query for server state; `apiClient[Domain].ts` exposes `useQuery[Entity]` /
  `useMutationCreate/Update/Delete` (domain implicit from filename).
- API errors: `BaseToast.show({ title, color })` (in-house `@/_modules/common/components/BaseToast`,
  `<BaseToast/>` mounted in providers) + `throw` inside the client; invalidate related queries `onSuccess`.
- See `ai/shared/07-ai-workflow-integration.md` for the full generation template + code-review checklist.

---

**Before finishing any component**, run the checklist in `ai/shared/07-ai-workflow-integration.md §9`:
right folder, `Col/Row/TextPrimary` not HTML, `Link` not onClick, function minimalism, typed (no `as any`),
i18n strings, loading via props.
