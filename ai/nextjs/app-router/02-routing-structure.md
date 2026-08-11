# App Router Routing Structure

## Overview

App Router uses **file-system based routing** with special files like `page.tsx`, `layout.tsx`, `loading.tsx`, and `error.tsx`. This document covers routing patterns, dynamic routes, and navigation.

---

## File Conventions

### Special Files

```
app/
├── layout.tsx          # Shared UI for segment and children
├── page.tsx            # Route UI (makes route publicly accessible)
├── loading.tsx         # Loading UI (suspense boundary)
├── error.tsx           # Error UI (error boundary)
├── not-found.tsx       # 404 UI
└── template.tsx        # Re-rendered layout (use rarely)
```

### File Hierarchy

```
app/
├── layout.tsx          # Root layout (required)
├── page.tsx            # / route
├── dashboard/
│   ├── layout.tsx      # Dashboard layout (wraps all /dashboard/* routes)
│   ├── page.tsx        # /dashboard route
│   ├── loading.tsx     # Loading UI for /dashboard
│   ├── analytics/
│   │   └── page.tsx    # /dashboard/analytics route
│   └── settings/
│       └── page.tsx    # /dashboard/settings route
└── products/
    ├── page.tsx        # /products route
    └── [id]/
        ├── page.tsx    # /products/:id route
        └── edit/
            └── page.tsx # /products/:id/edit route
```

---

## Route Patterns

### 1. Static Routes

**Pattern**: Folder name = route segment

```tsx
// src/app/about/page.tsx
import AboutScreen from '@/_modules/pages/About/AboutScreen';

export default function Page() {
  return <AboutScreen />;
}

// URL: /about
```

### 2. Dynamic Routes

**Pattern**: Folder name with `[param]`

```tsx
// src/app/products/[id]/page.tsx
import ProductDetailScreen from '@/_modules/pages/Product/ProductDetailScreen';

export default function Page({ params }: { params: { id: string } }) {
  return <ProductDetailScreen productId={params.id} />;
}

// URL: /products/123
// params = { id: '123' }
```

### 3. Nested Dynamic Routes

```tsx
// src/app/categories/[categoryId]/products/[productId]/page.tsx
import ProductDetailScreen from '@/_modules/pages/Product/ProductDetailScreen';

export default function Page({
  params,
}: {
  params: { categoryId: string; productId: string };
}) {
  return (
    <ProductDetailScreen
      categoryId={params.categoryId}
      productId={params.productId}
    />
  );
}

// URL: /categories/electronics/products/123
// params = { categoryId: 'electronics', productId: '123' }
```

### 4. Catch-All Routes

**Pattern**: `[...slug]` catches all segments

```tsx
// src/app/docs/[...slug]/page.tsx
import DocsScreen from '@/_modules/pages/Docs/DocsScreen';

export default function Page({ params }: { params: { slug: string[] } }) {
  return <DocsScreen slugPath={params.slug} />;
}

// URL: /docs/getting-started/installation
// params = { slug: ['getting-started', 'installation'] }
```

### 5. Optional Catch-All Routes

**Pattern**: `[[...slug]]` makes catch-all optional

```tsx
// src/app/shop/[[...slug]]/page.tsx
import ShopScreen from '@/_modules/pages/Shop/ShopScreen';

export default function Page({ params }: { params: { slug?: string[] } }) {
  return <ShopScreen slugPath={params.slug || []} />;
}

// URL: /shop              → params = { slug: undefined }
// URL: /shop/electronics  → params = { slug: ['electronics'] }
```

---

## Query Parameters

### Reading Query Strings

```tsx
// src/app/search/page.tsx
import SearchScreen from '@/_modules/pages/Search/SearchScreen';

export default function Page({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  return (
    <SearchScreen
      query={searchParams.q || ''}
      page={parseInt(searchParams.page || '1')}
    />
  );
}

// URL: /search?q=laptop&page=2
// searchParams = { q: 'laptop', page: '2' }
```

### Client-Side Query Access

```tsx
'use client';

import { useSearchParams } from 'next/navigation';

export default function SearchScreen() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1');

  return <div>Search: {query}</div>;
}
```

---

## Navigation

### 1. Link Component (ALWAYS PREFERRED)

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
```

### 2. Programmatic Navigation (Use Sparingly)

**Only for non-link scenarios:**

```tsx
'use client';

import { useRouter } from 'next/navigation';

export default function FormScreen() {
  const router = useRouter();

  const handleSubmit = async (data) => {
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
'use client';

import { useRouter } from 'next/navigation';

const router = useRouter();

// Navigate
router.push('/dashboard');           // Navigate to route
router.replace('/login');            // Replace history entry
router.back();                       // Go back
router.forward();                    // Go forward
router.refresh();                    // Refresh current route

// Prefetch
router.prefetch('/dashboard');       // Prefetch route
```

---

## Layouts

### Root Layout (Required)

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next';
import Providers from '@/_modules/pages/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'My App',
  description: 'Description',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

### Nested Layouts

```tsx
// src/app/dashboard/layout.tsx
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Row from '@/_modules/common/components/Row';
import Col from '@/_modules/common/components/Col';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <Row className="min-h-screen">
      {/* Sidebar */}
      <Col className="w-64 bg-gray-100 p-4">
        <nav>
          <Link
            href="/dashboard"
            className={pathname === '/dashboard' ? 'font-bold' : ''}
          >
            Overview
          </Link>
          <Link
            href="/dashboard/analytics"
            className={pathname === '/dashboard/analytics' ? 'font-bold' : ''}
          >
            Analytics
          </Link>
        </nav>
      </Col>

      {/* Content */}
      <Col className="flex-1 p-8">
        {children}
      </Col>
    </Row>
  );
}
```

> **Never raw HTML.** Semantic/structural elements the design system is missing
> (`<table>`, `<form>`, `<nav>`, …) should be built once as in-house `Base*`
> components (e.g. `BaseTable`, `BaseForm`, `BaseNav`). Those `Base*` components
> are the ONLY layer allowed to emit raw/semantic DOM and ARIA attributes —
> layouts and Screens compose `Base*` / `Col` / `Row`, never bare markup.

---

## Loading States

### Route-Level Loading

```tsx
// src/app/products/loading.tsx
import Col from '@/_modules/common/components/Col';

export default function Loading() {
  return (
    <Col className="items-center justify-center min-h-screen">
      <div className="animate-spin h-8 w-8 border-4 border-primary" />
      <p>Loading products...</p>
    </Col>
  );
}
```

### Conditional Loading

```tsx
// src/app/dashboard/page.tsx
import { Suspense } from 'react';
import DashboardScreen from '@/_modules/pages/Dashboard/DashboardScreen';
import LoadingSpinner from '@/_modules/common/components/LoadingSpinner';

export default function Page() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <DashboardScreen />
    </Suspense>
  );
}
```

---

## Error Handling

### Route-Level Error Boundary

```tsx
// src/app/products/error.tsx
'use client';

import { useEffect } from 'react';
import BaseButton from '@/_modules/common/components/BaseButton';
import Col from '@/_modules/common/components/Col';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Product error:', error);
  }, [error]);

  return (
    <Col className="items-center justify-center min-h-screen">
      <h2 className="text-xl font-bold mb-4">Something went wrong!</h2>
      <p className="text-gray-600 mb-4">{error.message}</p>
      <BaseButton onClick={reset}>Try again</BaseButton>
    </Col>
  );
}
```

### Global Error Boundary

```tsx
// src/app/global-error.tsx
'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <h2>Global Error: {error.message}</h2>
        <button onClick={reset}>Try again</button>
      </body>
    </html>
  );
}
```

---

## Not Found Pages

### Custom 404

```tsx
// src/app/not-found.tsx
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

### Programmatic 404

```tsx
// src/app/products/[id]/page.tsx
import { notFound } from 'next/navigation';
import ProductDetailScreen from '@/_modules/pages/Product/ProductDetailScreen';

export default async function Page({ params }: { params: { id: string } }) {
  const product = await fetchProduct(params.id);

  if (!product) {
    notFound();  // Triggers not-found.tsx
  }

  return <ProductDetailScreen product={product} />;
}
```

---

## Route Groups

**Pattern**: `(folderName)` - organizes routes without affecting URL

```
app/
├── (marketing)/
│   ├── layout.tsx       # Marketing layout
│   ├── page.tsx         # / (home)
│   ├── about/
│   │   └── page.tsx     # /about
│   └── contact/
│       └── page.tsx     # /contact
└── (dashboard)/
    ├── layout.tsx       # Dashboard layout
    ├── dashboard/
    │   └── page.tsx     # /dashboard
    └── settings/
        └── page.tsx     # /settings
```

**Benefits:**
- Different layouts for different sections
- Organize code without affecting URLs
- Multiple root layouts (advanced)

---

## Parallel Routes

**Pattern**: `@folder` - render multiple pages in same layout

```
app/
├── layout.tsx
├── page.tsx
├── @team/
│   └── page.tsx
└── @analytics/
    └── page.tsx
```

```tsx
// app/layout.tsx
export default function Layout({
  children,
  team,
  analytics,
}: {
  children: React.ReactNode;
  team: React.ReactNode;
  analytics: React.ReactNode;
}) {
  return (
    <>
      {children}
      <div className="grid grid-cols-2 gap-4">
        {team}
        {analytics}
      </div>
    </>
  );
}
```

---

## Intercepting Routes

**Pattern**: `(..)folder` - intercept navigation for modals

```
app/
├── page.tsx
├── photos/
│   └── [id]/
│       └── page.tsx          # /photos/123 (full page)
└── @modal/
    └── (..)photos/
        └── [id]/
            └── page.tsx      # Intercepts /photos/123 (modal)
```

**Use case:** Photo gallery with modal overlay on navigation.

> **Data note:** The intercepted, self-managing modal fetches the item by id from
> a real or mock detail endpoint (`GET /photos/:id`) — or, when no per-id endpoint
> exists, resolves it from the already-cached list.

---

## Metadata & SEO

### Static Metadata

```tsx
// src/app/products/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Products - My Store',
  description: 'Browse our amazing products',
};

export default function Page() {
  return <ProductListScreen />;
}
```

### Dynamic Metadata

```tsx
// src/app/products/[id]/page.tsx
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const product = await fetchProduct(params.id);

  return {
    title: `${product.name} - My Store`,
    description: product.description,
    openGraph: {
      images: [product.imageUrl],
    },
  };
}

export default function Page({ params }: { params: { id: string } }) {
  return <ProductDetailScreen productId={params.id} />;
}
```

---

## Best Practices

### 1. Keep Route Files Minimal

```tsx
// ✅ CORRECT: 5 lines max
export default function Page() {
  return <HomeScreen />;
}

// ❌ WRONG: Business logic in route
export default function Page() {
  const [state, setState] = useState();
  const { data } = useQuery(...);
  return <div>...</div>;
}
```

### 2. Pass Route Params to Screens

```tsx
// ✅ CORRECT
export default function Page({ params }: { params: { id: string } }) {
  return <ProductDetailScreen productId={params.id} />;
}

// ❌ WRONG: Don't fetch in route file
export default async function Page({ params }: { params: { id: string } }) {
  const product = await fetchProduct(params.id);
  return <ProductDetailScreen product={product} />;
}
```

### 3. Use Link for All Navigation

```tsx
// ✅ CORRECT
<Link href="/products">Products</Link>

// ❌ WRONG
<button onClick={() => router.push('/products')}>Products</button>
```

---

## Quick Reference

| Pattern | Example | URL |
|---------|---------|-----|
| Static | `app/about/page.tsx` | `/about` |
| Dynamic | `app/products/[id]/page.tsx` | `/products/123` |
| Nested Dynamic | `app/[category]/[product]/page.tsx` | `/electronics/laptop` |
| Catch-All | `app/docs/[...slug]/page.tsx` | `/docs/a/b/c` |
| Optional Catch-All | `app/shop/[[...slug]]/page.tsx` | `/shop` or `/shop/a` |
| Route Group | `app/(marketing)/page.tsx` | `/` |

---

## Next Steps

1. **Read**: `app-router/03-server-actions.md` (data mutations)
2. **Read**: `app-router/04-data-fetching.md` (fetching patterns)
3. **Reference**: `shared/03-component-patterns.md` (component rules)

---

**Last Updated**: January 2024
**Next.js Version**: 13.0+ (App Router)

---

## Global Navigation

Application-wide navigation (a header that appears across pages) belongs in a
**layout**, not in a per-page header component. Render `GlobalNav` once in the
root `layout.tsx` (or a nested `layout.tsx` for a section) and every child route
inherits it — the layout mounts once and survives navigation.

**CRITICAL RULE**: Use layouts for shared headers, not per-page header
components. And navigate with `Link` only — never `onClick={() => router.push(...)}`.

### 1. GlobalNav in the Root Layout

```tsx
// src/app/layout.tsx
import Providers from '@/_modules/pages/providers';
import GlobalNav from '@/_modules/common/components/GlobalNav';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <GlobalNav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

### 2. Conditional / Context-Aware Nav

`GlobalNav` reads the current path with `usePathname()` from `next/navigation`,
so it must be a Client Component (`'use client'`). Hide it on auth routes and
swap the menu items per section.

```tsx
// src/_modules/common/components/GlobalNav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  const pathname = usePathname();

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

Fetch menu items from an API with a React Query hook. `GlobalNav` is already a
Client Component (it uses `usePathname()`), so a client hook fits naturally.
Always render the container — show loading / empty states instead of unmounting.

```tsx
// src/_modules/common/components/GlobalNav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Row from '@/_modules/common/components/Row';
import TextPrimary from '@/_modules/common/components/TextPrimary';
import BaseButton from '@/_modules/common/components/BaseButton';
import { useQueryNavMenu } from '@/_modules/_api/apiClientNav';

export default function GlobalNav() {
  const pathname = usePathname();
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

> **Alternative (Server Component fetch)**: if the menu never depends on client
> state, fetch it in the root `layout.tsx` (a Server Component) and pass the
> items into a small `'use client'` nav that only reads `usePathname()` for the
> active state. Either way, navigation stays on `Link` — no `onClick` pushes.
