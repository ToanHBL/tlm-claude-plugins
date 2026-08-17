# Page Router Routing Structure

## Overview

Page Router uses **file-system based routing** where files in the `pages/` directory automatically become routes. This document covers routing patterns, dynamic routes, and navigation for Page Router (Next.js 12-14).

---

## Core Principle: 5-Line Routing Files

**CRITICAL RULE**: Page files are ROUTING ONLY - they import and render Screen components.

```tsx
// ✅ CORRECT: src/pages/index.tsx (5 lines max)
import HomeScreen from '@/_modules/pages/Home/HomeScreen';

export default function Page() {
  return <HomeScreen />;
}

// ❌ WRONG: Never put business logic in page files
export default function Page() {
  const [state, setState] = useState();  // BAD
  const { data } = useQuery(...);        // BAD

  return <div>...</div>;
}
```

**ALL business logic lives in Screen components** (`_modules/pages/[Domain]/[Name]Screen.tsx`).

---

## Directory Structure

```
src/
├── pages/                        # Page Router directory (routing ONLY)
│   ├── _app.tsx                  # App wrapper (providers, layouts)
│   ├── _document.tsx             # HTML document customization
│   ├── index.tsx                 # / route (5 lines max)
│   ├── about.tsx                 # /about route
│   └── products/
│       ├── index.tsx             # /products route
│       └── [id].tsx              # /products/:id route
│                                 # NOTE: no api/ folder — static export has no server
├── _modules/                     # 100% framework-agnostic business logic
│   ├── _api/                     # React Query hooks
│   ├── common/
│   │   └── components/           # Shared components
│   ├── layouts/                  # Layout components
│   └── pages/                    # Screen components (ALL business logic)
│       ├── Home/
│       │   ├── HomeScreen.tsx    # Screen component
│       │   └── components/       # Screen-specific components
│       └── Product/
│           ├── ProductListScreen.tsx
│           ├── ProductDetailScreen.tsx
│           └── components/
│               ├── ProductCard.tsx
│               └── ProductForm.tsx
└── public/                       # Static assets
```

---

## Route Patterns

### 1. Index Routes

```tsx
// src/pages/index.tsx → /
import HomeScreen from '@/_modules/pages/Home/HomeScreen';

export default function Page() {
  return <HomeScreen />;
}

// src/pages/products/index.tsx → /products
import ProductListScreen from '@/_modules/pages/Product/ProductListScreen';

export default function Page() {
  return <ProductListScreen />;
}
```

### 2. Named Routes

```tsx
// src/pages/about.tsx → /about
import AboutScreen from '@/_modules/pages/About/AboutScreen';

export default function Page() {
  return <AboutScreen />;
}

// src/pages/contact.tsx → /contact
import ContactScreen from '@/_modules/pages/Contact/ContactScreen';

export default function Page() {
  return <ContactScreen />;
}
```

### 3. Nested Routes

```tsx
// src/pages/dashboard/analytics.tsx → /dashboard/analytics
import DashboardAnalyticsScreen from '@/_modules/pages/Dashboard/DashboardAnalyticsScreen';

export default function Page() {
  return <DashboardAnalyticsScreen />;
}
```

---

## Dynamic Routes

### 1. Single Dynamic Segment

```tsx
// src/pages/products/[id].tsx → /products/:id
import { useRouter } from 'next/router';
import ProductDetailScreen from '@/_modules/pages/Product/ProductDetailScreen';

export default function Page() {
  const router = useRouter();
  const { id } = router.query;

  if (!id || typeof id !== 'string') {
    return <div>Loading...</div>;
  }

  return <ProductDetailScreen productId={id} />;
}
```

### 2. Multiple Dynamic Segments

```tsx
// src/pages/categories/[categoryId]/products/[productId].tsx
// → /categories/:categoryId/products/:productId

import { useRouter } from 'next/router';
import ProductDetailScreen from '@/_modules/pages/Product/ProductDetailScreen';

export default function Page() {
  const router = useRouter();
  const { categoryId, productId } = router.query;

  if (!categoryId || !productId) {
    return <div>Loading...</div>;
  }

  return (
    <ProductDetailScreen
      categoryId={categoryId as string}
      productId={productId as string}
    />
  );
}
```

### 3. Catch-All Routes

```tsx
// src/pages/docs/[...slug].tsx → /docs/a/b/c
import { useRouter } from 'next/router';
import DocsScreen from '@/_modules/pages/Docs/DocsScreen';

export default function Page() {
  const router = useRouter();
  const { slug } = router.query;

  return <DocsScreen slugPath={slug as string[]} />;
}

// URL: /docs/getting-started/installation
// slug = ['getting-started', 'installation']
```

### 4. Optional Catch-All Routes

```tsx
// src/pages/shop/[[...slug]].tsx → /shop or /shop/a/b
import { useRouter } from 'next/router';
import ShopScreen from '@/_modules/pages/Shop/ShopScreen';

export default function Page() {
  const router = useRouter();
  const { slug } = router.query;

  return <ShopScreen slugPath={(slug as string[]) || []} />;
}

// URL: /shop              → slug = undefined
// URL: /shop/electronics  → slug = ['electronics']
```

---

## Query Parameters

### Reading Query Strings

```tsx
// src/pages/search.tsx
import { useRouter } from 'next/router';
import SearchScreen from '@/_modules/pages/Search/SearchScreen';

export default function Page() {
  const router = useRouter();
  const { q, page } = router.query;

  return (
    <SearchScreen
      query={q as string || ''}
      page={parseInt((page as string) || '1')}
    />
  );
}

// URL: /search?q=laptop&page=2
// router.query = { q: 'laptop', page: '2' }
```

---

## Navigation

### 1. Link Component (ALWAYS PREFERRED)

**CRITICAL RULE**: ALWAYS use `Link` component for navigation. NEVER use `onClick` with `router.push()`.

```tsx
import Link from 'next/link';
import BaseButton from '@/_modules/common/components/BaseButton';

// ✅ CORRECT: Basic link
<Link href="/products" className="no-underline">
  <BaseButton as="span">View Products</BaseButton>
</Link>

// ✅ CORRECT: Dynamic link
<Link href={`/products/${product.id}`} className="no-underline">
  <BaseButton as="span">View Details</BaseButton>
</Link>

// ✅ CORRECT: Link with query params
<Link
  href={{
    pathname: '/search',
    query: { q: 'laptop', page: '2' },
  }}
  className="no-underline"
>
  <BaseButton as="span">Search Laptops</BaseButton>
</Link>

// ❌ WRONG: Using onClick navigation
<BaseButton onClick={() => router.push('/products')}>  // BAD
  View Products
</BaseButton>
```

**Why Link is mandatory:**
- ✅ Middle-click / Ctrl+Click opens in new tab
- ✅ Right-click shows "Open in new tab" menu
- ✅ Browser back/forward works correctly
- ✅ Automatic prefetching for better performance
- ✅ Better accessibility (screen readers)
- ✅ SEO benefits (crawlable links)
- ✅ Native browser behavior (copy link address)

### 2. Programmatic Navigation (Use Sparingly)

**Only for non-link scenarios** (form submissions, conditional redirects, etc.):

```tsx
'use client';

import { useRouter } from 'next/router';

export default function FormScreen() {
  const router = useRouter();

  const handleSubmit = async (data: any) => {
    await saveData(data);

    // ✅ OK: Navigation after form submission
    router.push('/success');
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
    </form>
  );
}
```

### 3. Router API

```tsx
import { useRouter } from 'next/router';

const router = useRouter();

// Navigate
router.push('/dashboard');              // Navigate to route
router.replace('/login');               // Replace history entry
router.back();                          // Go back
router.reload();                        // Reload current route
router.prefetch('/dashboard');          // Prefetch route

// Query & pathname
router.query;                           // { id: '123', page: '2' }
router.pathname;                        // '/products/[id]'
router.asPath;                          // '/products/123?page=2'
```

---

## Layouts

### Global Layout (_app.tsx)

```tsx
// src/pages/_app.tsx
import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import LayoutDefault from '@/_modules/layouts/LayoutDefault';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,  // 1 minute
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <LayoutDefault>
        <Component {...pageProps} />
      </LayoutDefault>
    </QueryClientProvider>
  );
}
```

### Per-Page Layouts

```tsx
// src/_modules/layouts/LayoutDashboard.tsx
import { useRouter } from 'next/router';
import Link from 'next/link';
import Row from '@/_modules/common/components/Row';
import Col from '@/_modules/common/components/Col';

export default function LayoutDashboard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <Row className="min-h-screen">
      {/* Sidebar */}
      <Col className="w-64 bg-gray-100 p-4">
        <nav>
          <Link
            href="/dashboard"
            className={router.pathname === '/dashboard' ? 'font-bold' : ''}
          >
            Overview
          </Link>
          <Link
            href="/dashboard/analytics"
            className={
              router.pathname === '/dashboard/analytics' ? 'font-bold' : ''
            }
          >
            Analytics
          </Link>
        </nav>
      </Col>

      {/* Content */}
      <Col className="flex-1 p-8">{children}</Col>
    </Row>
  );
}
```

> **Never raw HTML.** Semantic/structural elements the design system is missing
> (`<table>`, `<form>`, `<nav>`, …) should be built once as in-house `Base*`
> components (e.g. `BaseTable`, `BaseForm`, `BaseNav`). Those `Base*` components
> are the ONLY layer allowed to emit raw/semantic DOM and ARIA attributes —
> layouts and Screens compose `Base*` / `Col` / `Row`, never bare markup.

```tsx
// src/pages/dashboard/index.tsx
import DashboardScreen from '@/_modules/pages/Dashboard/DashboardScreen';
import LayoutDashboard from '@/_modules/layouts/LayoutDashboard';

export default function Page() {
  return (
    <LayoutDashboard>
      <DashboardScreen />
    </LayoutDashboard>
  );
}
```

---

## Custom Document

```tsx
// src/pages/_document.tsx
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Global meta tags, fonts, etc. */}
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
```

---

## 404 & Error Pages

### Custom 404

```tsx
// src/pages/404.tsx
import Link from 'next/link';
import Col from '@/_modules/common/components/Col';
import BaseButton from '@/_modules/common/components/BaseButton';

export default function NotFound() {
  return (
    <Col className="items-center justify-center min-h-screen">
      <h2 className="text-2xl font-bold mb-4">404 - Page Not Found</h2>
      <Link href="/" className="no-underline">
        <BaseButton as="span">Return Home</BaseButton>
      </Link>
    </Col>
  );
}
```

### Custom Error Page

```tsx
// src/pages/_error.tsx
import { NextPageContext } from 'next';

interface ErrorProps {
  statusCode?: number;
}

function Error({ statusCode }: ErrorProps) {
  return (
    <div>
      <h1>
        {statusCode
          ? `An error ${statusCode} occurred on server`
          : 'An error occurred on client'}
      </h1>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
```

---

## API Routes — NOT available in **Mode A** (static export)

> **Mode B (fullstack) is the opposite:** there, the API lives in **App Router route handlers**
> (`app/api/**/route.ts`, Prisma-backed) while the UI stays in Page Router — see
> `05-fullstack-nextjs-api-prisma.md`. The rule below applies to **Mode A only**. Note: legacy
> `pages/api/*` is not used in either mode.

**In Mode A, do not create server routes (`pages/api/*` or `app/api/*`).** A static export
(`output: 'export'`) has no Node server to run route handlers. The export build strips them (or fails),
so any handler is dead code that silently 404s in production.

```tsx
// ❌ WRONG — will not run in a static export
// src/pages/api/products/[id].ts
export default function handler(req, res) { /* never executes on the CDN */ }
```

Instead, call the **external backend directly** from a TanStack Query hook in `_modules/_api/`:

```tsx
// ✅ CORRECT — src/_modules/_api/apiClientProduct.ts
export const useQueryDetail = (id: string) =>
  useQuery({
    queryKey: ['product-detail', id],
    queryFn: () => baseFetch<Product>(`/products/${id}`), // baseFetch prefixes NEXT_PUBLIC_API_URL
    enabled: !!id,
  });
```

See `03-api-data-flow.md` for the full client pattern. If you genuinely need a server-side handler
(secrets, httpOnly-cookie sessions, hiding a non-CORS backend), that requires **abandoning static export
and deploying to a Node host** — raise it with the user before assuming it.

---

## Metadata & SEO

### Static Metadata (Head Component)

```tsx
// src/pages/products/index.tsx
import Head from 'next/head';
import ProductListScreen from '@/_modules/pages/Product/ProductListScreen';

export default function Page() {
  return (
    <>
      <Head>
        <title>Products - My Store</title>
        <meta name="description" content="Browse our amazing products" />
        <meta property="og:title" content="Products - My Store" />
      </Head>
      <ProductListScreen />
    </>
  );
}
```

### Dynamic Metadata

```tsx
// src/pages/products/[id].tsx
import Head from 'next/head';
import { useRouter } from 'next/router';
import ProductDetailScreen from '@/_modules/pages/Product/ProductDetailScreen';
import * as apiClientProduct from '@/_modules/_api/apiClientProduct';

export default function Page() {
  const router = useRouter();
  const { id } = router.query;

  const { data: product } = apiClientProduct.useQueryDetail(id as string);

  if (!product) return <div>Loading...</div>;

  return (
    <>
      <Head>
        <title>{product.name} - My Store</title>
        <meta name="description" content={product.description} />
        <meta property="og:image" content={product.imageUrl} />
      </Head>
      <ProductDetailScreen productId={id as string} />
    </>
  );
}
```

---

## Redirects

### Client-Side Redirect

```tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/new-path');
  }, [router]);

  return <div>Redirecting...</div>;
}
```

### Server-Side Redirect (`getServerSideProps`) — NOT available

`getServerSideProps` runs per-request on a server, which a static export doesn't have. Do redirects
**client-side** (the pattern above) or, for build-time known redirects, configure your static host
(e.g. a `_redirects` / rewrite rule on the CDN). Auth-gating a route is likewise a client concern:
check the session in the Screen/layout and `router.replace('/login')` when absent.

---

## Best Practices

### 1. Keep Page Files Minimal (5 Lines Max)

```tsx
// ✅ CORRECT
export default function Page() {
  return <HomeScreen />;
}

// ❌ WRONG: Business logic in page
export default function Page() {
  const [state, setState] = useState();
  const { data } = useQuery(...);
  return <div>...</div>;
}
```

### 2. Always Use Link for Navigation

```tsx
// ✅ CORRECT
<Link href="/products">Products</Link>

// ❌ WRONG
<button onClick={() => router.push('/products')}>Products</button>
```

### 3. Handle Router Query Loading State

```tsx
// ✅ CORRECT: Handle loading state
export default function Page() {
  const router = useRouter();
  const { id } = router.query;

  if (!id || typeof id !== 'string') {
    return <div>Loading...</div>;
  }

  return <ProductDetailScreen productId={id} />;
}

// ❌ WRONG: Not handling undefined id
export default function Page() {
  const router = useRouter();
  const { id } = router.query;

  return <ProductDetailScreen productId={id as string} />;  // id might be undefined!
}
```

---

## Quick Reference

| Pattern | File | URL |
|---------|------|-----|
| Index | `pages/index.tsx` | `/` |
| Named | `pages/about.tsx` | `/about` |
| Nested | `pages/blog/post.tsx` | `/blog/post` |
| Dynamic | `pages/products/[id].tsx` | `/products/123` |
| Nested Dynamic | `pages/[category]/[product].tsx` | `/electronics/laptop` |
| Catch-All | `pages/docs/[...slug].tsx` | `/docs/a/b/c` |
| Optional Catch-All | `pages/shop/[[...slug]].tsx` | `/shop` or `/shop/a` |

---

## Next Steps

1. **Read**: `page-router/03-api-data-flow.md` (data fetching)
2. **Read**: `page-router/04-migration-to-app-router.md` (migration guide)
3. **Reference**: `shared/03-component-patterns.md` (component rules)

---

**Last Updated**: January 2024
**Next.js Version**: 12-14 (Page Router)

---

## Global Navigation

Application-wide navigation belongs in a **shared layout**, not in a per-page
header component. Render `GlobalNav` once inside the layout that wraps every
route (`LayoutDefault`, mounted in `_app.tsx`) so it mounts once and persists
across navigation.

**CRITICAL RULE**: Use layouts for shared headers, not per-page header
components. And navigate with `Link` only — never `onClick={() => router.push(...)}`.

### 1. GlobalNav in the Shared Layout

```tsx
// src/_modules/layouts/LayoutDefault.tsx
import GlobalNav from '@/_modules/common/components/GlobalNav';
import Col from '@/_modules/common/components/Col';

export default function LayoutDefault({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Col className="min-h-screen">
      <GlobalNav />
      <Col className="flex-1">{children}</Col>
    </Col>
  );
}

// src/pages/_app.tsx already wraps <Component /> in <LayoutDefault>,
// so GlobalNav appears on every route automatically.
```

### 2. Conditional / Context-Aware Nav

`GlobalNav` reads the current route with `useRouter().pathname` from
`next/router`. Hide it on auth routes and swap the menu items per section.

```tsx
// src/_modules/common/components/GlobalNav.tsx
import Link from 'next/link';
import { useRouter } from 'next/router';
import Row from '@/_modules/common/components/Row';
import BaseButton from '@/_modules/common/components/BaseButton';

const MAIN_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Products', href: '/products' },
  { label: 'Dashboard', href: '/dashboard' },
];

const DASHBOARD_LINKS = [
  { label: 'Overview', href: '/dashboard' },
  { label: 'Analytics', href: '/dashboard/analytics' },
  { label: 'Settings', href: '/dashboard/settings' },
];

export default function GlobalNav() {
  const router = useRouter();
  const pathname = router.pathname;

  // Hide global nav on auth routes
  if (pathname.startsWith('/auth')) {
    return null;
  }

  // Context-aware: show the dashboard menu inside the dashboard section
  const links = pathname.startsWith('/dashboard') ? DASHBOARD_LINKS : MAIN_LINKS;

  return (
    <Row className="items-center gap-2 sticky top-0 z-50 bg-white shadow-sm px-6 py-4">
      {links.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link key={item.href} href={item.href} className="no-underline">
            <BaseButton
              as="span"
              variant={isActive ? 'solid' : 'light'}
              color={isActive ? 'primary' : undefined}
            >
              {item.label}
            </BaseButton>
          </Link>
        );
      })}
    </Row>
  );
}
```

### 3. Dynamic, API-Driven Menu

Fetch menu items with a TanStack Query hook (`useQuery...`), consistent with the
rest of `_modules/_api/`. Always render the container — show loading / empty
states instead of unmounting the nav.

```tsx
// src/_modules/common/components/GlobalNav.tsx
import Link from 'next/link';
import { useRouter } from 'next/router';
import Row from '@/_modules/common/components/Row';
import TextPrimary from '@/_modules/common/components/TextPrimary';
import BaseButton from '@/_modules/common/components/BaseButton';
import { useQueryNavMenu } from '@/_modules/_api/apiClientNav';

export default function GlobalNav() {
  const router = useRouter();
  const pathname = router.pathname;
  const { data: menu, isLoading } = useQueryNavMenu();

  if (pathname.startsWith('/auth')) {
    return null;
  }

  return (
    <Row className="items-center gap-2 sticky top-0 z-50 bg-white shadow-sm px-6 py-4">
      {isLoading && <TextPrimary text="Loading menu…" className="text-gray-400" />}

      {menu?.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link key={item.id} href={item.href} className="no-underline">
            <BaseButton
              as="span"
              variant={isActive ? 'solid' : 'light'}
              color={isActive ? 'primary' : undefined}
            >
              {item.label}
            </BaseButton>
          </Link>
        );
      })}
    </Row>
  );
}
```

The `useQueryNavMenu` hook follows the standard React Query pattern (see
`page-router/03-api-data-flow.md`):

```tsx
// src/_modules/_api/apiClientNav.ts
import { useQuery } from '@tanstack/react-query';

export interface NavMenuItem {
  id: string;
  label: string;
  href: string;
}

export function useQueryNavMenu() {
  return useQuery<NavMenuItem[]>({
    queryKey: ['nav-menu'],
    queryFn: async () => {
      // Absolute external backend URL — NOT a relative /api/* (no server here)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/nav-menu`);
      return res.json();
    },
  });
}
```
