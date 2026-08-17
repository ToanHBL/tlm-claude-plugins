# Page Router Architecture

> **Scope: Mode A (static-export SPA).** This doc describes the Page Router deployed as a static export
> with **no backend in this app**. If your project uses Next.js itself as the backend (App Router route
> handlers `app/api/**/route.ts` + Prisma, UI still in Page Router), you are in **Mode B** — see
> `05-fullstack-nextjs-api-prisma.md`, where server routes and a Node runtime are expected. Mode picker:
> `skills/nextjs-page-router` → "Deployment modes".

## Overview

This project uses **Next.js 15 with Page Router** configured for **static export (SPA mode)**. The architecture is designed to be framework-agnostic, making future migration to App Router or other frameworks straightforward.

> ⚠️ **No server at runtime.** A static export (`output: 'export'`) ships only static files to a CDN.
> There is **no Node server**, therefore **no `pages/api/*` route handlers, no `getServerSideProps`, and
> no server actions** — the export build strips or rejects them. Every bit of server state is fetched
> **directly from the browser** against the **external backend** through `apiClient[Domain].ts` TanStack
> Query hooks. If you find yourself writing `pages/api/*` or a `_modules/server/` runtime layer, stop:
> that code cannot run in this deployment model.

## Static Export Configuration

### next.config.js
```typescript
const nextConfig: NextConfig = {
  output: 'export',           // Static export for SPA
  trailingSlash: true,        // Fix dynamic routes
  images: { unoptimized: true }, // Required for static export

  webpack(config) {
    // SVG handling and other webpack configs
    return config;
  },
};
```

### Build & Deploy
```bash
# Development
yarn dev          # Starts dev server at http://localhost:3000

# Production build
yarn build        # Generates static files in /out directory

# Preview production build
npx serve out     # Serves static files locally
```

The `/out` directory can be deployed to any static hosting: Vercel, Netlify, AWS S3 + CloudFront, GitHub Pages, or any CDN.

## Directory Structure - Framework-Agnostic

```
src/
├── pages/                    # Next.js Page Router - ROUTING ONLY
│   ├── _app.tsx             # Root app component (providers, layout)
│   ├── _document.tsx        # HTML document configuration
│   ├── globals.css          # Global styles
│   ├── index.tsx            # Home route (/)
│   ├── glad-sad-mad/index.tsx
│   └── dashboard/
│       └── posts/index.tsx
│
└── _modules/                 # Framework-agnostic (100% portable)
    ├── _api/                # React Query hooks — call the EXTERNAL backend directly (client-side)
    │   └── apiClientFeedback.ts
    │
    ├── common/              # ONLY truly shared components
    │   ├── components/      # Col, Row, TextPrimary, Base* only
    │   │   ├── Col.tsx
    │   │   ├── Row.tsx
    │   │   ├── TextPrimary.tsx
    │   │   └── Box.tsx
    │   ├── utils/           # UtilsForm, UtilsString, UtilsObject
    │   └── hooks/           # Reusable hooks
    │
    ├── layouts/             # Layout components
    │   └── LayoutDefault.tsx
    │
    └── pages/               # Screen components (business logic)
        ├── providers.tsx             # 'use client' — React Query, BaseToast
        ├── Home/
        │   ├── HomeScreen.tsx         # 'use client'
        │   └── components/            # Screen-specific only
        │       ├── Header.tsx
        │       ├── FormExample.tsx
        │       └── QueryExample.tsx
        │
        ├── GladSadMad/
        │   └── GladSadMadScreen.tsx   # 'use client'
        │
        └── Dashboard/
            └── PostsListScreen.tsx    # 'use client'
```

## Core Architecture Principles

### 1. Routing-Only Pages (CRITICAL - 5 Lines Max)

**CRITICAL RULE**: Page files contain ZERO business logic. They are ONLY for routing.

```tsx
// src/pages/index.tsx - ONLY 5 lines
import HomeScreen from '@/_modules/pages/Home/HomeScreen';

export default function Page() {
  return <HomeScreen />;
}

// ❌ NEVER do this in page files:
// - No useState, useEffect, or any hooks
// - No business logic
// - No data fetching
// - No event handlers
```

### 2. Screen Components with Business Logic

```tsx
// src/_modules/pages/Home/HomeScreen.tsx
'use client';  // Ready for App Router migration

import { useState } from 'react';
import Col from '@/_modules/common/components/Col';
import Row from '@/_modules/common/components/Row';
import Header from './components/Header';
import FormExample from './components/FormExample';

export default function HomeScreen() {
  // ALL business logic here
  const [state, setState] = useState();

  return (
    <Col className="min-h-screen">
      <Row className="max-w-4xl mx-auto">
        <Header />
        <FormExample />
      </Row>
    </Col>
  );
}
```

### 3. Framework-Agnostic _modules/ Folder

**Key Principle**: Everything in `_modules/` must be portable to any React framework.

```
✅ _modules/pages/Home/HomeScreen.tsx       # Can move to any framework
✅ _modules/common/components/Col.tsx       # Pure React component
✅ _modules/_api/apiClientFeedback.ts       # React Query calling the external backend (framework-agnostic)

❌ src/pages/index.tsx                      # Next.js specific (not portable)
❌ src/pages/api/*                          # Won't run — no server in a static export
```

### 4. Screen-Specific Components

```tsx
// src/_modules/pages/Home/components/Header.tsx
'use client';

import Link from 'next/link';

export default function Header() {
  // This component is ONLY used in HomeScreen
  return (
    <div className="text-center mb-12">
      <h1 className="text-4xl font-bold">Next.js Demo</h1>
      <Link href="/dashboard">Dashboard</Link>
    </div>
  );
}
```

## Root Configuration Files

### _app.tsx - Application Root

```tsx
// src/pages/_app.tsx
import LayoutDefault from '@/_modules/layouts/LayoutDefault';
import { AppProps } from 'next/app';
import './globals.css';
import Providers from '@/_modules/pages/providers';
import i18n from '@/_modules/i18next';
import { I18nextProvider } from 'react-i18next';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <I18nextProvider i18n={i18n}>
      <Providers>
        <LayoutDefault>
          <Component {...pageProps} />
        </LayoutDefault>
      </Providers>
    </I18nextProvider>
  );
}
```

### _document.tsx - HTML Configuration

```tsx
// src/pages/_document.tsx
import { Html, Main, NextScript, Head } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head title="App Title">
        <meta name="title" content="App Title" />
        <meta name="keywords" content="keywords,here" />
        <meta name="description" content="App description" />

        {/* Prevent zoom on mobile */}
        {!process.env.NEXT_PUBLIC_DEV_DEBUG && (
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0"
          />
        )}

        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
      </Head>
      <body className="transition-[font-size] duration-[font-size]-1000 ease-in-out">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
```

### providers.tsx - Provider Setup

```tsx
// src/_modules/pages/providers.tsx
'use client';

import { Fragment } from 'react';
import { NuqsAdapter } from 'nuqs/adapters/next/pages';
import BaseToast from '@/_modules/common/components/BaseToast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Fragment>
      <QueryClientProvider client={queryClient}>
        <NuqsAdapter>
          <BaseToast />
          {children}
        </NuqsAdapter>
      </QueryClientProvider>
    </Fragment>
  );
}
```

## Page Router Capabilities & Limitations

### What Page Router CAN Do
✅ **Static Export (SPA)** - Perfect for CDN deployment
✅ **Dynamic Routes** - `/product/[slug]` works
✅ **Client-side Routing** - Fast navigation
✅ **React Query** - Full client-side state management
✅ **Framework-Agnostic** - Easy to migrate to any React framework

### What Page Router (static export) CANNOT Do
❌ **API routes (`pages/api/*`)** - No server runs; handlers are stripped/rejected at export
❌ **`getServerSideProps`** - No per-request server; use `getStaticProps` or client fetching
❌ **Server Actions / `'use server'`** - Not supported; do writes with client-side mutations to the external backend
❌ **Server Components** - All components are client components
❌ **Streaming** - No React Suspense streaming
❌ **Parallel Routes** - Not available
❌ **Intercepting Routes** - Not available

**Implication:** all data — reads and writes — goes **browser → external backend directly** via
`apiClient[Domain].ts` hooks. There is no same-origin `/api/*` and no BFF layer to lean on.

## Best Practices

### 1. Component Organization

```
❌ Wrong:
src/
├── pages/
│   └── index.tsx          # Contains business logic
├── components/            # Shared components folder
│   ├── Header.tsx
│   └── Form.tsx

✅ Correct:
src/
├── pages/
│   └── index.tsx          # Only imports HomeScreen
└── _modules/
    └── pages/
        └── Home/
            ├── HomeScreen.tsx       # Business logic
            └── components/          # Screen-specific
                ├── Header.tsx
                └── Form.tsx
```

### 2. Avoid Page-Specific Logic

```tsx
// ❌ Wrong: Business logic in page file
export default function Page() {
  const [data, setData] = useState();
  useEffect(() => { ... }, []);
  return <div>{data}</div>;
}

// ✅ Correct: Only routing
export default function Page() {
  return <MyScreen />;
}
```

### 3. Use 'use client' Directive

```tsx
// Always add to screen components for App Router readiness
'use client';

export default function MyScreen() {
  // Your component
}
```

### 4. Data mutations are client-side (external backend)

There are **no server actions** in a static export. Writes are TanStack Query mutations in
`apiClient[Domain].ts` that POST/PUT/DELETE **directly to the external backend**. Keep the CRUD surface
consistent so a *future* App Router migration could wrap these as server actions — but do **not** create
a `_modules/server/` runtime folder today; it would be dead code here.

```typescript
// src/_modules/_api/apiClient[Domain].ts  — client-side, calls external backend
export const useQueryList   = () => useQuery({ /* GET external */ });
export const useMutationCreate = () => useMutation({ /* POST external */ });
export const useMutationUpdate = () => useMutation({ /* PUT external */ });
export const useMutationDelete = () => useMutation({ /* DELETE external */ });
```

## When to Use Page Router vs App Router

> **Team policy: Page Router is the default; App Router is the exception** (see the `frontend-conventions`
> skill → "Choosing the Next.js router"). Default to Page Router for management/admin/internal apps; use
> App Router only when genuinely needed — chiefly public, SEO-facing "publish" pages.

### Choose Page Router When (the default):
- **Management / admin / internal app** — dashboard, CRUD, back-office, authenticated tool (SEO irrelevant behind a login)
- You want a simple client-rendered SPA with fast iteration and minimal boilerplate
- Static-export CDN deploy (**Mode A**) *or* a fullstack app whose API is App Router route handlers under `app/api` + Prisma (**Mode B**)
- Simpler mental model (no Server/Client Component distinction) and maximum hosting flexibility

### Choose App Router When (only when needed):
- **Public "publish" pages** — marketing, landing, blog, docs, product pages that need SEO / social metadata
- SSR / SSG / ISR, streaming/Suspense, or edge rendering is genuinely required
- You specifically need Server Components, Server Actions, or nested partial-render layouts

> Not sufficient reasons to switch an admin app to App Router: "it's newer", "cutting-edge", or general
> "better performance". Under this policy, migrate only when a concrete SSR/SEO/RSC need appears.

## Migration Readiness

The current Page Router setup is **100% ready** for App Router migration because:

✅ All business logic is in `_modules/` (portable)
✅ All screen components have `'use client'` directive
✅ Data access is isolated in `apiClient[Domain].ts` hooks (can later be wrapped as server actions)
✅ Pages are routing-only (easy to convert to `app/page.tsx`)
✅ No page-specific logic to refactor

## Summary

| Aspect | Page Router (Current) | App Router (Future) |
|--------|----------------------|---------------------|
| Directory | `pages/` | `app/` |
| Route file | `index.tsx` | `page.tsx` |
| Server actions | Not supported | `'use server'` |
| Components | All client | Server + Client |
| Static export | Yes (SPA) | Optional |
| _modules folder | Same | Same ✅ |
| Screen components | Same | Same ✅ |
| Business logic | Same | Same ✅ |

**Key Takeaway**: The framework-agnostic architecture means migrating to App Router is mostly:
1. Rename `pages/` to `app/`
2. Rename `index.tsx` to `page.tsx`
3. Optionally move data-access hooks behind `'use server'` server actions (App Router only)
4. Done!
