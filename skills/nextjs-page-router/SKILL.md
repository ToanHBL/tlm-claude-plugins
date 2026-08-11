---
name: nextjs-page-router
description: Build and debug Next.js Page Router code (the pages/ directory) — SPA/static-export architecture, TanStack Query data hooks, API routes, getStaticProps/getStaticPaths, _app.tsx layouts, and next/router navigation — following the _modules conventions. Use when working in pages/, writing _app.tsx, API routes, or useQuery data hooks.
---

# Next.js Page Router

Applies the shared base (`frontend-conventions` skill) to the **Page Router** (`src/pages/`, Next.js
12-14). This project's Page Router setup is a **static-export SPA**. Deep reference bundled with this
plugin: `ai/nextjs/page-router/` (01-architecture, 02-routing-structure, 03-api-data-flow,
04-migration-to-app-router).

**First:** follow the `frontend-conventions` skill — `_modules/` architecture, component hierarchy,
Link-only navigation, function minimalism, no `as any`, i18n. Everything below is Page-Router-specific.

## When this applies
Project has `src/pages/_app.tsx`, uses `getStaticProps`/`getServerSideProps`, or imports from
`next/router`.

## 1. Routing layer stays thin

`pages/` holds only routing files; business logic lives in `_modules/pages/`.

```tsx
// src/pages/products/index.tsx  — thin
import ProductListScreen from '@/_modules/pages/Product/ProductListScreen';
export default function ProductsPage() {
  return <ProductListScreen />;
}
```

File-based routes: `pages/products/index.tsx` → `/products`, `pages/products/[id].tsx` → `/products/:id`,
`pages/[...slug].tsx` catch-all. Special files: `_app.tsx`, `_document.tsx`, `pages/api/*`.

## 2. SPA / static export

- Configured with `output: 'export'` — every page must be static-export compatible.
- No `getServerSideProps` in static export; use `getStaticProps` + `getStaticPaths`
  (`fallback: false` for fully static) or client-side fetching via TanStack Query.
- Client-side data is the norm here: Screens fetch with `useQuery[Entity]` hooks.

## 3. Data fetching — TanStack Query hooks

Server state comes from `apiClient[Domain].ts` hooks, not `getServerSideProps`.

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

Mutations: `useMutationCreate/Update/Delete` with `BaseToast.show({ title, color })` on error +
`invalidateQueries` on success.
Infinite lists: `useInfiniteQuery`. Full patterns: `ai/nextjs/page-router/03-api-data-flow.md`.

## 4. Navigation (Page Router)

Use `Link` for navigation (shared rule). Imperative cases use `next/router`:

```tsx
import { useRouter } from 'next/router';
const router = useRouter();
const { id } = router.query;           // read params via router.query
// router.push / router.replace only for redirects after an action — NOT user-clickable nav (use Link).
```

## 5. Layouts & Global Navigation

Wrap pages with a shared `Layout` mounted in `_app.tsx`; put the header/nav there, not per-page. A
`GlobalNav` reads `useRouter().pathname` for conditional / context-aware menus and can load a dynamic
API-driven menu via a `useQuery` hook — all navigation via `Link`. Full pattern:
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

## 6. API routes (`pages/api/*`) — rarely, static export limits them

Static export does not run API routes at runtime. Use them only in non-exported deployments; otherwise
call the external API directly from `apiClient[Domain].ts`.

## Migrating to App Router
When asked to migrate, follow `ai/nextjs/page-router/04-migration-to-app-router.md` (incremental phases,
effort table, pitfalls) and switch to the `nextjs-app-router` skill's patterns.

## Checklist
- [ ] `pages/` files are thin; logic in `_modules/pages/`
- [ ] Data via `useQuery[Entity]` hooks (static-export safe), not `getServerSideProps`
- [ ] Params via `router.query`; navigation via `Link`
- [ ] Shared base rules from `frontend-conventions` applied
