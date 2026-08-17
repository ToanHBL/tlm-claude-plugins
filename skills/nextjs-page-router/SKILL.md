---
name: nextjs-page-router
description: Build and debug Next.js Page Router code (the pages/ directory) following the _modules conventions — thin routing pages, _modules/pages Screens, TanStack Query data hooks, _app.tsx layouts, and next/router navigation. Supports TWO deployment modes: (A) static-export SPA that calls an external backend, and (B) fullstack Next.js where the UI stays in Page Router (pages/) and the API is written as App Router route handlers (app/api/**/route.ts) with Prisma — no SSR. Use when working in pages/, writing _app.tsx, app/api route handlers, Prisma access, or useQuery hooks. Team policy: Page Router is the DEFAULT for management/admin/internal apps; App Router (nextjs-app-router) is only for public/SEO "publish" pages or when SSR/SSG/RSC is genuinely needed.
---

# Next.js Page Router

Applies the shared base (`frontend-conventions` skill) to the **Page Router** (`src/pages/`, Next.js
12-15). The frontend rules are identical whatever you deploy; what changes is **where the API lives**.

**First:** follow the `frontend-conventions` skill — `_modules/` architecture, component hierarchy,
Link-only navigation, function minimalism, no `as any`, i18n. Everything below is Page-Router-specific.

> **Page Router is the default choice** for management/admin/internal apps (see `frontend-conventions` →
> "Choosing the Next.js router"). Use App Router only when genuinely needed — mainly public, SEO-facing
> "publish" pages. If this is a back-office / dashboard / authenticated tool, you're in the right skill.

Deep reference bundled with this plugin: `ai/nextjs/page-router/` (01-architecture, 02-routing-structure,
03-api-data-flow, 04-migration-to-app-router, **05-fullstack-nextjs-api-prisma**).

---

## Deployment modes — pick ONE per project

A Page Router project runs in exactly one of these modes. Decide up front; they don't mix.

| | **Mode A — Static-export SPA** | **Mode B — Fullstack Next.js** |
|---|---|---|
| `next.config` | `output: 'export'` | **no** `output: 'export'` (Node server) |
| Backend | **External** service (someone else's API) | **This app** — `app/api/**/route.ts` + Prisma |
| UI location | `src/pages/` (Page Router) | `src/pages/` (Page Router) — same |
| API location | none in-app | `src/app/api/**/route.ts` (App Router handlers) |
| SSR / `getServerSideProps` | ❌ not available | ❌ not used — leverage the page router, stay client-rendered |
| Frontend data | `useQuery` → absolute `NEXT_PUBLIC_API_URL` | `useQuery` → same-origin `/api/*` |
| Deploy | static files on any CDN | one Node host (Vercel / container) |

**How to detect the mode you're in:**
- `next.config` has `output: 'export'`, no `app/api/`, calls point at `NEXT_PUBLIC_API_URL` → **Mode A**.
- `src/app/api/**/route.ts` handlers exist alongside `src/pages/`, `prisma/schema.prisma` present,
  `DATABASE_URL` in env → **Mode B**.

> In **both** modes the frontend is client-rendered (Page Router) and fetches through `_modules/_api/*`
> TanStack Query hooks. Mode B does **not** turn those into `getServerSideProps` — the point of using
> Next.js as the backend is to write the API as **App Router route handlers** (`app/api`) and keep the UI
> simple, not to add SSR. `pages/api/*` (legacy) is not used — write handlers under `app/api`.

---

## 1. Routing layer stays thin (both modes)

`pages/` holds only routing files; business logic lives in `_modules/pages/`.

```tsx
// src/pages/products/index.tsx  — thin
import ProductListScreen from '@/_modules/pages/Product/ProductListScreen';
export default function ProductsPage() {
  return <ProductListScreen />;
}
```

File-based routes: `pages/products/index.tsx` → `/products`, `pages/products/[id].tsx` → `/products/:id`,
`pages/[...slug].tsx` catch-all. Special files: `_app.tsx`, `_document.tsx`. The **API is not in `pages/`
in either mode** — Mode B puts it in `app/api/**/route.ts` (App Router handlers, see §6); Mode A has no
in-app server. Don't use legacy `pages/api/*`.

## 2. Data fetching — TanStack Query hooks (both modes)

Server state comes from `apiClient[Domain].ts` hooks — never from `getServerSideProps`. The **only**
difference between modes is the base URL `baseFetch` targets:

- **Mode A:** absolute external base, `process.env.NEXT_PUBLIC_API_URL` (cross-origin; backend must allow CORS).
- **Mode B:** relative `/api/...` (same-origin Next.js API routes — no CORS, cookies flow automatically).

```tsx
// _modules/_api/apiClientProduct.ts
export const useQueryProducts = (params: QueryParams) =>
  useQuery({
    queryKey: [ApiUrl.PRODUCT_LIST, JSON.stringify(params)],
    queryFn: async () => {
      // baseFetch resolves the base for the active mode (external URL vs same-origin /api)
      const res = await baseFetch(/* url + params */);
      const json: ModelBaseDetailResponse<ModelProduct[]> = await res.json();
      if (!res.ok) throw Error(json?.message || '');
      return json.data;
    },
  });
```

Mutations: `useMutationCreate/Update/Delete` with `BaseToast.show({ title, color })` on error +
`invalidateQueries` on success. Infinite lists: `useInfiniteQuery`. Full patterns:
`ai/nextjs/page-router/03-api-data-flow.md`.

## 3. Navigation (both modes)

Use `Link` for navigation (shared rule). Imperative cases use `next/router`:

```tsx
import { useRouter } from 'next/router';
const router = useRouter();
const { id } = router.query;           // read params via router.query
// router.push / router.replace only for redirects after an action — NOT user-clickable nav (use Link).
```

## 4. Layouts & Global Navigation (both modes)

Wrap pages with a shared `Layout` mounted in `_app.tsx`; put the header/nav there, not per-page. A
`GlobalNav` reads `useRouter().pathname` for conditional / context-aware menus and can load a dynamic
menu via a `useQuery` hook — all navigation via `Link`. Full pattern:
`ai/nextjs/page-router/02-routing-structure.md` → "Global Navigation".

```tsx
// src/pages/_app.tsx
export default function App({ Component, pageProps }: AppProps) {
  return (
    <Providers>
      <LayoutDefault>
        <Component {...pageProps} />
      </LayoutDefault>
    </Providers>
  );
}
```

---

## 5. Mode A — Static-export SPA specifics

- `next.config` sets `output: 'export'`; every page must be static-export compatible.
- **No runtime server**: no `pages/api/*`, no `getServerSideProps`, no server actions — the export build
  strips or rejects them. Use `getStaticProps` + `getStaticPaths` (`fallback: false`) for build-time
  data, or (the norm) client-side `useQuery`.
- The backend is **external and owned elsewhere**. If CORS/auth block a browser call, that's a backend
  config change — do **not** scaffold `pages/api/*` (it can't run here). Needing a real server means
  switching to **Mode B**, an explicit decision to raise with the user.

## 6. Mode B — Fullstack Next.js (`app/api` + Prisma) specifics

UI stays in the **Page Router** (`src/pages/`); the **API is written with App Router route handlers**
(`src/app/api/**/route.ts`) — the modern surface. `pages/` and `app/` coexist. **No SSR** — keep pages
client-rendered and fetch via `useQuery`; server work lives in route handlers, not `getServerSideProps`.

- **`next.config` must NOT set `output: 'export'`** — route handlers need a Node server (Vercel functions,
  a container, etc.).
- **UI in `pages/`, API in `app/api/`.** `app/` holds route handlers only — no `page.tsx`/`layout.tsx`,
  no UI. Don't use legacy `pages/api/*`.
- **Thin handlers, fat services.** A `route.ts` per-method export only does HTTP plumbing (parse,
  validate, map errors → status). Real work lives in `_modules/server/[domain]/*.ts` and hits the DB
  through the **Prisma singleton** (`_modules/server/prisma.ts`) — never `new PrismaClient()` per request.
- **Next.js 15 gotcha:** dynamic-segment `params` is a Promise — `const { id } = await params`.
- **Validate every input** at the boundary with Zod; reject with `400` on failure.
- **`_modules/server/` is server-only.** Never import it (or `@prisma/client`) from a Screen/component.
  Screens reach the backend only through `_modules/_api/*` hooks that fetch `/api/*`.
- **Same-origin auth is easy here**: httpOnly cookies via `cookies()` from `next/headers` (async in v15);
  the browser sends them automatically (no `Authorization` juggling, no CORS).
- **Node runtime for Prisma** — keep the default; never `export const runtime = 'edge'` on DB routes.

Full backend guide — Prisma schema/migrate, the singleton, route handlers, Zod schemas, auth, shared
types: `ai/nextjs/page-router/05-fullstack-nextjs-api-prisma.md`.

```
src/
├── pages/                         # UI (Page Router)
│   └── products/index.tsx         # thin route → Screen
├── app/                           # API ONLY (App Router route handlers)
│   └── api/products/
│       ├── route.ts               # GET list + POST create   → /api/products
│       └── [id]/route.ts          # GET/PUT/DELETE            → /api/products/:id
└── _modules/
    ├── _api/apiClientProduct.ts   # useQuery → fetch('/api/products')  [client]
    └── server/                    # SERVER-ONLY (never imported by UI)
        ├── prisma.ts              # PrismaClient singleton
        └── product/service.ts     # Prisma queries + business logic
prisma/schema.prisma              # models; `prisma migrate dev` / `prisma generate`
```

---

## Migrating to App Router
When asked to migrate, follow `ai/nextjs/page-router/04-migration-to-app-router.md` (incremental phases,
effort table, pitfalls) and switch to the `nextjs-app-router` skill's patterns.

## Checklist

**Both modes**
- [ ] `pages/` files are thin; logic in `_modules/pages/`
- [ ] Data via `useQuery[Entity]` hooks, not `getServerSideProps`
- [ ] Params via `router.query`; navigation via `Link`
- [ ] Shared base rules from `frontend-conventions` applied

**Mode A (static SPA)**
- [ ] `output: 'export'` set; no `pages/api/*`, no `getServerSideProps`, no server actions
- [ ] `baseFetch` uses absolute `NEXT_PUBLIC_API_URL`

**Mode B (fullstack Next.js)**
- [ ] `output: 'export'` NOT set; deployed to a Node host
- [ ] UI in `src/pages/`; API in `src/app/api/**/route.ts` (App Router handlers) — not legacy `pages/api/*`
- [ ] `route.ts` handlers are thin; DB logic in `_modules/server/[domain]/` via the Prisma singleton
- [ ] Dynamic `params` awaited (`const { id } = await params`); every input validated with Zod → `400`
- [ ] `_modules/server/`/`@prisma/client` never imported from UI code; `baseFetch` uses relative `/api/...`
