---
name: nextjs-app-router
description: Build and debug Next.js App Router code (the app/ directory) — Server/Client Components, layouts, Server Actions, streaming/data fetching, route handlers, and revalidation — following the _modules conventions. Use when working in app/, writing layout.tsx/page.tsx/route.ts, 'use server' actions, or async Server Components.
---

# Next.js App Router

Applies the shared base (`frontend-conventions` skill) to the **App Router** (`src/app/`, Next.js 13+).
Deep reference bundled with this plugin: `ai/nextjs/app-router/` (01-architecture, 02-routing-structure,
03-server-actions, 04-data-fetching).

**First:** follow the `frontend-conventions` skill — `_modules/` architecture, component hierarchy,
Link-only navigation, function minimalism, no `as any`, i18n. Everything below is App-Router-specific.

## When this applies
Project has `src/app/`, uses async Server Components, imports from `next/navigation`, or has
`'use server'` / `route.ts` files.

## 1. Routing layer stays thin

`app/` holds only routing files; business logic lives in `_modules/pages/`.

```tsx
// src/app/products/page.tsx  — thin
import ProductListScreen from '@/_modules/pages/Product/ProductListScreen';
export default function Page() {
  return <ProductListScreen />;
}
```

Special files: `layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `route.ts`.
Route groups `(name)/`, dynamic `[id]/`, catch-all `[...slug]/`, parallel `@slot/`, intercepting `(.)`.

## 2. Server vs Client Components

- **Server Component by default** (no directive): can be `async`, fetch data, read secrets, no hooks/state.
- **Client Component** (`'use client'` at top): needs hooks, state, effects, event handlers, browser APIs.
- Keep `'use client'` at the leaves. Fetch in Server Components; pass data down. A Client Component may
  render Server Components only via `children`.
- **Never call `Date.now()` / `new Date()` / `Math.random()` during render** (Server or Client) — the
  server and client produce different values → hydration mismatch, broken prerendering. Compute
  timestamps in the data layer, an event handler, or an effect.

```tsx
// Server Component — fetch on the server
export default async function ProductListScreen() {
  const products = await getProducts();          // server-side, from _modules/server or _api
  return <ProductGrid products={products} />;     // ProductGrid can be 'use client' for interactivity
}
```

## 3. Navigation (App Router)

Use `Link` for navigation (shared rule). For imperative cases use `next/navigation`:

```tsx
'use client';
import { useRouter, usePathname, useParams, useSearchParams } from 'next/navigation';
// router.push / router.replace only for post-action redirects — NOT for user-clickable nav (use Link).
```

Read params with `useParams()` / `useSearchParams()` (client) or the `params`/`searchParams` props
(server), **not** `next/router`.

## 4. Server Actions ('use server')

Prefer Server Actions over API routes for mutations. Keep them in `_modules/server/`.

```tsx
// _modules/server/actions/product.ts
'use server';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function createProduct(formData: FormData) {
  const parsed = ProductSchema.parse(Object.fromEntries(formData)); // Zod
  await db.product.create({ data: parsed });
  revalidatePath('/products');        // or revalidateTag('products')
}
```

- Validate inputs with Zod inside the action.
- Progressive enhancement: bind to `<form action={createProduct}>`; use `useFormStatus`/`useActionState`
  in Client Components for pending/optimistic UI.
- Auth-protect actions (check session at the top). See `ai/nextjs/app-router/03-server-actions.md`.

## 5. Data fetching & caching

- `fetch()` in Server Components is cached by default; opt out with `{ cache: 'no-store' }` or
  `{ next: { revalidate: N, tags: [...] } }`.
- Hybrid: fetch initial data in a Server Component, hydrate a Client Component's TanStack Query for
  interactivity. See `ai/nextjs/app-router/04-data-fetching.md`.
- Stream with `loading.tsx` / `<Suspense>`; handle errors with `error.tsx`.

## 6. Route handlers (`route.ts`) — only when you need an HTTP endpoint

```ts
// src/app/api/products/route.ts
export async function GET() {
  return Response.json({ data: await getProducts() });
}
```
Prefer Server Actions for form mutations; use route handlers for webhooks, third-party callbacks, or
public JSON APIs.

## 7. Layouts & Global Navigation

Shared headers/nav belong in `layout.tsx`, not per-page. A `'use client'` `GlobalNav` reads
`usePathname()` to render context-aware / conditional menus and can pull a dynamic API-driven menu —
all navigation via `Link`. Full pattern: `ai/nextjs/app-router/02-routing-structure.md` → "Global Navigation".

## 8. States are part of the screen (done-criteria)

A screen isn't done with just the happy path. Before calling any screen/route finished:

- new route segment → ships `loading.tsx` + `error.tsx` (streaming fallback + error boundary)
- empty data → the project's shared empty-state component — never an ad-hoc `<div>No data</div>`
- failure surface → the shared error-banner/toast component — never an invented one-off treatment
- forms/actions → pending UI (`useFormStatus`/`useActionState`: disabled submit, optimistic or skeleton refresh)

## Checklist
- [ ] `app/` files are thin; logic in `_modules/pages/`
- [ ] `'use client'` only where hooks/interactivity are needed, pushed to leaves
- [ ] No `Date.now()`/`new Date()`/`Math.random()` during render (hydration)
- [ ] States shipped: `loading.tsx`/`error.tsx`, shared empty-state, pending UI on forms
- [ ] Params via `next/navigation` / props, not `next/router`
- [ ] Mutations via Zod-validated Server Actions + `revalidatePath/Tag`
- [ ] Shared base rules from `frontend-conventions` applied
