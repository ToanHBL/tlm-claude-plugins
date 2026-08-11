# Project Notes — Next.js App Router User CRUD

Generated from the `ai/` knowledge base + `skills/` (frontend-conventions, nextjs-app-router).
Feature: a single **Users** screen (list + add/edit/delete) backed by a REST API and Server Actions.

## (a) File Tree

```
nextjs-app-router/
├── package.json                     # Next 15, React 19, TanStack Query, RHF, Zod, Tailwind
├── tsconfig.json                    # strict; path aliases @/_modules/*, @/components/*, @/*
├── next.config.ts                   # App Router (NOT static export)
├── tailwind.config.ts               # Tailwind theme (primary/secondary/danger/success)
├── postcss.config.mjs
├── next-env.d.ts
├── .env.example                     # API_BASE_URL / API_VERSION (server-only)
└── src/
    ├── app/                         # ROUTING LAYER ONLY (thin, ≤5 lines)
    │   ├── layout.tsx               # Root layout → Providers + LayoutDefault + globals.css
    │   ├── page.tsx                 # / → redirect('/users')
    │   ├── globals.css              # Tailwind directives
    │   └── users/
    │       └── page.tsx             # Server Component: fetches users, renders Screen
    └── _modules/                    # 100% framework-agnostic business logic
        ├── _api/
        │   └── apiClientUser.ts     # React Query hooks wrapping Server Actions (+toast)
        ├── common/
        │   ├── components/
        │   │   ├── Col.tsx Row.tsx Box.tsx Text.tsx   # Basic (structural)
        │   │   ├── BaseButton.tsx BaseInput.tsx        # Base primitives (Tailwind)
        │   │   ├── BaseSelect.tsx BaseModal.tsx        # Base primitives (Tailwind)
        │   │   └── Toast.tsx                           # In-house toast() + <ToastViewport/>
        │   ├── interfaces/
        │   │   ├── ModelUser.ts               # User model (enum-typed)
        │   │   └── ModelBaseResponse.ts       # { succeeded, data, message, errors? }
        │   ├── schemas/
        │   │   └── userSchemas.ts             # Zod schema shared client + server
        │   └── utils/
        │       └── cn.ts                      # className joiner
        ├── config/
        │   ├── enums.ts             # EUserRole, EUserStatus + label/badge maps
        │   ├── apiUrl.ts            # API_CONFIG (env) + ApiUrl endpoint builders
        │   └── queryKeys.ts         # QueryKeys.USER_LIST
        ├── layouts/
        │   └── LayoutDefault.tsx    # App shell
        ├── pages/
        │   ├── providers.tsx        # 'use client' QueryClient + ToastViewport
        │   └── User/
        │       ├── UserListScreen.tsx          # Screen ('use client') — all logic
        │       └── components/
        │           ├── UserTable.tsx           # Domain: list rows + Edit/Delete
        │           ├── UserModalContent.tsx    # Domain: self-managing create/update
        │           └── UserForm.tsx            # Domain: register-first RHF + Zod form
        └── server/
            └── actions/
                └── user.ts          # 'use server' CRUD, Zod-validated, revalidatePath
```

## (b) Key File → Rule Mapping

| File | Rule satisfied |
|------|----------------|
| `src/app/users/page.tsx`, `src/app/page.tsx` | App Router routing layer ≤5 lines, imports a Screen (shared/01, app-router/01-02). List page is a **Server Component** that fetches server-side (app-router/04). |
| `src/app/layout.tsx` | Root layout replaces `_app.tsx`; wraps `Providers` + `LayoutDefault` (app-router/01-02). |
| `src/_modules/pages/providers.tsx` | Client providers wrapper: `QueryClientProvider` + in-house toast viewport (app-router/01). |
| `src/_modules/pages/User/UserListScreen.tsx` | ALL business logic in `_modules/pages/[Domain]/`; `Col/Row/Text` not raw HTML; function minimalism (inline handlers + TODO); hybrid initialData pattern (shared/01, shared/03, app-router/04). |
| `src/_modules/pages/User/components/UserTable.tsx` | Domain component in `pages/User/components/`; `Text`/`BaseButton`; enum label/badge maps (shared/03, shared/04). |
| `src/_modules/pages/User/components/UserModalContent.tsx` | Self-managing modal content owns its mutations, closes on success, passes minimal props (shared/03, shared/07). |
| `src/_modules/pages/User/components/UserForm.tsx` | Zod + RHF **register-first** (no Controller); enum-driven selects; explicit-undefined trust boundaries (shared/05, shared/04, shared/03). |
| `src/_modules/common/components/Base*.tsx` | In-house Tailwind primitives, no external UI kit; `forwardRef` so `register()` binds directly (shared/01, shared/03). |
| `src/_modules/common/components/{Col,Row,Text,Box}.tsx` | Basic structural components with `data-component` (shared/03). |
| `src/_modules/common/components/Toast.tsx` | In-house `toast({ title, color })` helper, no third-party lib (shared/05, shared/07). |
| `src/_modules/config/enums.ts` | String enums instead of literals; `Record<Enum,T>` label/color maps (shared/04). |
| `src/_modules/config/apiUrl.ts` | API base from env; const-object endpoint builders (shared/01, shared/04). |
| `src/_modules/common/schemas/userSchemas.ts` | Single Zod schema shared client (zodResolver) + server (safeParse/parse) (shared/05). |
| `src/_modules/server/actions/user.ts` | `'use server'` CRUD, Zod-validated, `revalidatePath`, REST envelope unwrap (app-router/03, shared/05). |
| `src/_modules/_api/apiClientUser.ts` | `apiClient[Domain]` with domain-implicit `useQueryList`/`useMutationCreate/Update/Delete`; toast + `invalidateQueries` (shared/07, app-router/03). |
| `tsconfig.json` | strict; path aliases; no index re-export files (shared/01). |
| Everywhere | No `as any`; no `@ts-ignore`; strings not in interfaces; `Link` unused because screen has no navigation (only actions) (typescript rules, shared/07). |

## (c) RULES FEEDBACK

1. **`providers.tsx` location contradicts itself across files.** `app-router/01` and `02` import it as
   `@/pages/providers` (i.e. `src/pages/providers.tsx`), but `shared/07`'s import-ordering example uses
   `@/_modules/pages/providers`. The former is actively dangerous in an App Router project: a file under
   `src/pages/` makes Next.js enable the Page Router and try to treat `providers.tsx` as a route
   (`/providers`). I placed it at `_modules/pages/providers.tsx` to stay coherent. The rules should pick
   one path and drop the `src/pages/` variant for App Router.

2. **"Fetch in the route file" is directly contradicted between two rule files.** `app-router/04`
   (and `01`) show the `page.tsx` Server Component doing `const products = await fetchProducts()` and
   passing `initialProducts`. `app-router/02` §"Best Practices → Don't fetch in route file" shows the
   exact opposite as WRONG. The task spec sided with 04 (fetch server-side), so I did — but a route file
   that fetches is no longer "≤5 lines of pure routing". The rules need to reconcile "thin routing layer"
   with "Server Component fetches in page.tsx".

3. **`as any` is mandated by the rules yet forbidden by the TypeScript rule.** `shared/03` and `shared/05`
   repeatedly show `UtilsForm.computeRules(...) as any` in `register()`. The global/typescript rule and
   the checklist in `shared/07 §9` say "no `as any`". I avoided the conflict entirely by using
   `zodResolver` instead of `UtilsForm`, but the rules ship a pattern that violates their own checklist.
   `UtilsForm.computeRules` should return a typed `RegisterOptions` so the cast is unnecessary.

4. **"No object destructuring for props" (shared/01) conflicts with nearly every other example.** shared/01
   says access `props.title` directly (better for shallow comparison), but the Base-component examples in
   shared/03 (`BaseButton({ color, variant, ... })`) and the form examples all destructure. It's ambiguous
   which layers the rule applies to. I destructured in Base primitives (needed to separate `...rest` for
   DOM spreading) and used `props.x` in Basic/domain components. A clear "destructure in primitives that
   spread rest props; otherwise use `props.x`" statement would remove the guesswork.

5. **`Col`/`Row`/`Text` can't carry ARIA/semantic props, but the a11y checklist requires them.** The
   documented signatures only accept `className` + `children`, so a dialog needing `role="dialog"`/
   `aria-modal` can't be built from `Col`. I resolved it by treating Base primitives (BaseModal) as the
   layer allowed to touch raw DOM — consistent with BaseInput/BaseButton wrapping `<input>`/`<button>` —
   but the rules never state this explicitly. Recommend: (a) say Base primitives may use semantic raw
   elements, and/or (b) let `Col/Row` spread through extra HTML/ARIA attributes.

6. **"Never use raw `<div>/<p>/<span>`" doesn't address tables/forms.** There is no Basic component for
   `<table>/<tr>/<td>` or `<form>/<label>/<option>`. I used semantic table + form markup (better a11y).
   The rule should clarify that the ban targets `div/p/span` specifically and semantic elements are fine.

7. **Modal pattern assumes a detail endpoint that this spec doesn't have.** shared/03/07 push "pass an
   `id`, let the modal fetch its own detail". The feature spec only exposes `GET /users` (list), no
   `GET /users/:id`. I passed the already-loaded `user` object into `UserModalContent` for pre-fill.
   The rules could note the fallback when no detail endpoint exists.

8. **Two competing modal architectures.** shared/03 documents a centralized imperative
   `refModalChildComponent.current?.onOpen(...)` handle, while also praising self-managing modal-content
   components. I used a controlled `BaseModal` (`isOpen`/`onClose`) + self-managing content, which is
   simpler and more type-safe than an untyped imperative ref, but it isn't the documented `refModal`
   API. Guidance on when to use which would help.

9. **Toast import path is inconsistent.** app-router/03 imports `from '@/_modules/common/components/Toast'`
   while shared/05/07 say the helper lives in `@/_modules/common/utils`. I put it in `common/components`
   (it renders a viewport component). Pick one home for it.
