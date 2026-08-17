# Page Router — Hard Rules

The enforceable rules for Next.js Page Router (`src/pages/`, Next.js 12–15). The `fe-coding` skill
inlines the top few; this file is the full set. Deep detail: `01-architecture`, `02-routing-structure`,
`03-api-data-flow`, `04-migration-to-app-router`, `05-fullstack-nextjs-api-prisma` in this folder.

**Applies on top of** `ai/shared-fe/` — `_modules/` architecture, component hierarchy, Link-only
navigation, function minimalism, no `as any`, i18n. Everything here is Page-Router-specific.

> **Page Router is the default** for management / admin / internal apps. Use App Router only when
> genuinely needed — mainly public, SEO-facing "publish" pages. If this is a back-office, dashboard, or
> authenticated tool, you're in the right place. See `ai/README.md` → router policy.

The frontend rules are identical whatever you deploy; what changes is **where the API lives**.

---

## Deployment modes — pick ONE per project

A Page Router project runs in exactly one of these. Decide up front; they don't mix.

| | **Mode A — Static-export SPA** | **Mode B — Fullstack Next.js** |
|---|---|---|
| `next.config` | `output: 'export'` | **no** `output: 'export'` (Node server) |
| Backend | **External** service (owned elsewhere) | **This app** — `app/api/**/route.ts` + Prisma |
| UI location | `src/pages/` (Page Router) | `src/pages/` (Page Router) — same |
| API location | none in-app | `src/app/api/**/route.ts` (App Router handlers) |
| SSR / `getServerSideProps` | ❌ not available | ❌ not used — stay client-rendered |
| Frontend data | `useQuery` → absolute `NEXT_PUBLIC_API_URL` | `useQuery` → same-origin `/api/*` |
| Deploy | static files on any CDN | one Node host (Vercel / container) |

**Detecting your mode:**
- `next.config` has `output: 'export'`, no `app/api/`, calls point at `NEXT_PUBLIC_API_URL` → **Mode A**
- `src/app/api/**/route.ts` exists alongside `src/pages/`, `prisma/schema.prisma` present, `DATABASE_URL`
  in env → **Mode B**

> In **both** modes the frontend is client-rendered and fetches through `_modules/_api/*` TanStack Query
> hooks. Mode B does **not** turn those into `getServerSideProps` — the point of using Next.js as the
> backend is to write the API as **App Router route handlers** (`app/api`) and keep the UI simple, not to
> add SSR. Legacy `pages/api/*` is not used in either mode.

---

## 1. Routing layer stays thin (both modes)

```tsx
// src/pages/products/index.tsx  — thin
import ProductListScreen from '@/_modules/pages/Product/ProductListScreen';
export default function ProductsPage() {
  return <ProductListScreen />;
}
```

Routes: `pages/products/index.tsx` → `/products`, `pages/products/[id].tsx` → `/products/:id`,
`pages/[...slug].tsx` catch-all. Special files: `_app.tsx`, `_document.tsx`.

**The API is never in `pages/`.** Mode B puts it in `app/api/**/route.ts` (§6); Mode A has no in-app
server.

## 2. Data fetching — TanStack Query hooks (both modes)

Server state comes from `apiClient[Domain].ts` hooks, never `getServerSideProps`. The only per-mode
difference is the base URL `baseFetch` targets:

- **Mode A** — absolute external base, `process.env.NEXT_PUBLIC_API_URL` (cross-origin; the backend must
  allow CORS)
- **Mode B** — relative `/api/...` (same-origin; no CORS, cookies flow automatically)

```tsx
// _modules/_api/apiClientProduct.ts
export const useQueryProducts = (params: QueryParams) =>
  useQuery({
    queryKey: [ApiUrl.PRODUCT_LIST, JSON.stringify(params)],
    queryFn: async () => {
      const res = await baseFetch(/* url + params */);
      const json: ModelBaseDetailResponse<ModelProduct[]> = await res.json();
      if (!res.ok) throw Error(json?.message || '');
      return json.data;
    },
  });
```

Mutations: `useMutationCreate/Update/Delete`, `BaseToast.show({ title, color })` on error,
`invalidateQueries` on success. Infinite lists: `useInfiniteQuery`. Full patterns: `03-api-data-flow.md`.

Response types **mirror the backend field-for-field** — no renaming in a mapper. See `ai/shared-fe/07` §7b.

## 3. Navigation (both modes)

`Link` for navigation (shared rule). Imperative cases use `next/router`:

```tsx
import { useRouter } from 'next/router';
const router = useRouter();
const { id } = router.query;      // read params via router.query
// router.push / router.replace only for redirects after an action — NOT user-clickable nav (use Link).
```

## 4. Layouts & global navigation (both modes)

Wrap pages with a shared `Layout` mounted in `_app.tsx`; the header/nav lives there, not per-page. A
`GlobalNav` reads `useRouter().pathname` for conditional menus and can load a dynamic menu via a
`useQuery` hook — all navigation via `Link`. Full pattern: `02-routing-structure.md` → "Global Navigation".

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

## 5. Mode A — static-export SPA specifics

- `next.config` sets `output: 'export'`; every page must be static-export compatible.
- **No runtime server**: no `pages/api/*`, no `getServerSideProps`, no Server Actions — the export build
  strips or rejects them. Use `getStaticProps` + `getStaticPaths` (`fallback: false`) for build-time
  data, or (the norm) client-side `useQuery`.
- The backend is **external and owned elsewhere**. If CORS or auth blocks a browser call, that's a
  backend config change — do **not** scaffold `pages/api/*`, it can't run here. Needing a real server
  means switching to **Mode B**: an explicit decision to raise with the user, not one to make silently.

## 6. Mode B — fullstack Next.js (`app/api` + Prisma) specifics

UI stays in the **Page Router** (`src/pages/`); the **API is App Router route handlers**
(`src/app/api/**/route.ts`). `pages/` and `app/` coexist. **No SSR** — pages stay client-rendered and
fetch via `useQuery`; server work lives in route handlers, not `getServerSideProps`.

- **`next.config` must NOT set `output: 'export'`** — route handlers need a Node server.
- **UI in `pages/`, API in `app/api/`.** `app/` holds route handlers only — no `page.tsx`, no
  `layout.tsx`, no UI. Don't use legacy `pages/api/*`.
- **Thin handlers, fat services.** A `route.ts` method export does HTTP plumbing only (parse, validate,
  map errors → status). Real work lives in `_modules/server/[domain]/*.ts` and reaches the DB through
  the **Prisma singleton** (`_modules/server/prisma.ts`) — never `new PrismaClient()` per request.
- **Next.js 15 gotcha:** dynamic-segment `params` is a Promise — `const { id } = await params`.
- **Validate every input** at the boundary with Zod; reject with `400`.
- **`_modules/server/` is server-only.** Never import it (or `@prisma/client`) from a Screen or
  component. Screens reach the backend only through `_modules/_api/*` hooks that fetch `/api/*`.
- **Same-origin auth is easy here** — httpOnly cookies via `cookies()` from `next/headers` (async in
  v15); the browser sends them automatically. No `Authorization` juggling, no CORS.
- **Node runtime for Prisma** — keep the default; never `export const runtime = 'edge'` on a DB route.

Full backend guide (Prisma schema/migrate, the singleton, handlers, Zod schemas, auth, shared types):
`05-fullstack-nextjs-api-prisma.md`.

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

Follow `04-migration-to-app-router.md` (incremental phases, effort table, pitfalls), then switch to
`../app-router/06-hard-rules.md`.

## Checklist

**Both modes**
- [ ] `pages/` files are thin; logic in `_modules/pages/`
- [ ] Data via `useQuery[Entity]` hooks, not `getServerSideProps`
- [ ] Params via `router.query`; navigation via `Link`
- [ ] Shared rules from `ai/shared-fe/` applied

**Mode A (static SPA)**
- [ ] `output: 'export'` set; no `pages/api/*`, no `getServerSideProps`, no Server Actions
- [ ] `baseFetch` uses absolute `NEXT_PUBLIC_API_URL`

**Mode B (fullstack Next.js)**
- [ ] `output: 'export'` NOT set; deployed to a Node host
- [ ] UI in `src/pages/`; API in `src/app/api/**/route.ts` — not legacy `pages/api/*`
- [ ] `route.ts` handlers thin; DB logic in `_modules/server/[domain]/` via the Prisma singleton
- [ ] Dynamic `params` awaited; every input Zod-validated → `400`
- [ ] `_modules/server/` and `@prisma/client` never imported from UI; `baseFetch` uses relative `/api/...`
