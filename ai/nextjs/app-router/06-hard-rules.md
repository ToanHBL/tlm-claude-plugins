# App Router — Hard Rules

The enforceable rules for Next.js App Router (`src/app/`, Next.js 13+). The `tlm-fe-coding` skill inlines
the top few; this file is the full set. Deep detail: `01-architecture`, `02-routing-structure`,
`03-server-actions`, `04-data-fetching` in this folder.

**Applies on top of** `ai/shared-fe/` — `_modules/` architecture, component hierarchy, Link-only
navigation, function minimalism, no `as any`, i18n. Everything here is App-Router-specific.

> **App Router is the exception, not the default.** Reach for it when you genuinely need it — chiefly
> **public, SEO-facing "publish" pages** (marketing, landing, blog, docs) wanting SSR/SSG/ISR, streaming,
> or Server Components/Actions. Management/admin/internal apps default to **Page Router**. Don't adopt
> App Router for modernness alone. See `ai/README.md` → router policy.

## When this applies

The project (or a slice of it) is a **public/publish surface** needing SEO/SSR, and has `src/app/` with
`page.tsx`/`layout.tsx`, async Server Components, imports from `next/navigation`, or `'use server'`.

An internal management app belongs in the Page Router rules instead. Note that `app/api/**/route.ts`
**without** `app/page.tsx` is Page Router **Mode B**, not an App Router app — see
`../page-router/05-fullstack-nextjs-api-prisma.md`.

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

- **Server Component by default** (no directive): can be `async`, fetch data, read secrets; no hooks or state.
- **Client Component** (`'use client'` at top): needs hooks, state, effects, event handlers, browser APIs.
- Keep `'use client'` **at the leaves**. Fetch in Server Components and pass data down. A Client
  Component may render Server Components only through `children`.
- **Never call `Date.now()` / `new Date()` / `Math.random()` during render** (Server or Client). Server
  and client produce different values → hydration mismatch and broken prerendering. Compute timestamps
  in the data layer, an event handler, or an effect.

```tsx
// Server Component — fetch on the server
export default async function ProductListScreen() {
  const products = await getProducts();        // server-side, from _modules/server or _api
  return <ProductGrid products={products} />;  // ProductGrid can be 'use client' for interactivity
}
```

## 3. Navigation

`Link` for navigation (shared rule). Imperative cases use `next/navigation`:

```tsx
'use client';
import { useRouter, usePathname, useParams, useSearchParams } from 'next/navigation';
// router.push / router.replace only for post-action redirects — NOT for user-clickable nav (use Link).
```

Read params with `useParams()` / `useSearchParams()` (client) or the `params` / `searchParams` props
(server) — **never** `next/router`.

## 4. Server Actions (`'use server'`)

Prefer Server Actions over route handlers for mutations. Keep them in `_modules/server/`.

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

- Validate inputs with Zod **inside** the action.
- Progressive enhancement: bind to `<form action={createProduct}>`; use `useFormStatus` /
  `useActionState` in Client Components for pending and optimistic UI.
- **Auth-protect every action** — check the session at the top. An exported Server Action is a public
  HTTP endpoint. See `03-server-actions.md`.

## 5. Data fetching & caching

- `fetch()` in Server Components is cached by default; opt out with `{ cache: 'no-store' }` or
  `{ next: { revalidate: N, tags: [...] } }`.
- Hybrid: fetch initial data in a Server Component, hydrate a Client Component's TanStack Query for
  interactivity. See `04-data-fetching.md`.
- Stream with `loading.tsx` / `<Suspense>`; handle errors with `error.tsx`.

## 6. Route handlers (`route.ts`) — only for real HTTP endpoints

```ts
// src/app/api/products/route.ts
export async function GET() {
  return Response.json({ data: await getProducts() });
}
```

Prefer Server Actions for form mutations. Use route handlers for webhooks, third-party callbacks, or a
public JSON API.

## 7. Layouts & global navigation

Shared headers/nav belong in `layout.tsx`, not per-page. A `'use client'` `GlobalNav` reads
`usePathname()` for context-aware menus and can pull a dynamic API-driven menu — all navigation via
`Link`. Full pattern: `02-routing-structure.md` → "Global Navigation".

## 8. States are part of the screen (done-criteria)

A screen isn't done with only the happy path. Before calling any screen/route finished:

- New route segment → ships `loading.tsx` + `error.tsx` (streaming fallback + error boundary)
- **Do NOT add a root `app/loading.tsx` when `app/page.tsx` only redirects.** It wraps the entire app
  in a Suspense boundary, and if nothing resolves it every route paints the skeleton forever and no
  page is reachable — the DOM shows an unresolved `<template id="B:0">` under the fallback. The
  segment has no content of its own to stream, so the file buys nothing and costs the whole app. A
  root `error.tsx` is still worth having: without one, a redirecting root has no error boundary at all.
- Empty data → the project's shared empty-state component, with the section header still rendered
  (`ai/shared-fe/03` → "Empty States") — never an ad-hoc `<div>No data</div>`
- Failure surface → the shared error-banner/toast component, never a one-off treatment
- Forms/actions → pending UI via `useFormStatus` / `useActionState`: disabled submit, optimistic update
  or skeleton refresh

## Checklist

- [ ] `app/` files are thin; logic in `_modules/pages/`
- [ ] `'use client'` only where hooks/interactivity are needed, pushed to the leaves
- [ ] No `Date.now()` / `new Date()` / `Math.random()` during render (hydration)
- [ ] States shipped: `loading.tsx` / `error.tsx`, shared empty state, pending UI on forms
- [ ] No root `app/loading.tsx` over a redirect-only `app/page.tsx` (deadlocks every route)
- [ ] Params via `next/navigation` or props, never `next/router`
- [ ] Mutations via Zod-validated, auth-checked Server Actions + `revalidatePath` / `revalidateTag`
- [ ] Shared rules from `ai/shared-fe/` applied
