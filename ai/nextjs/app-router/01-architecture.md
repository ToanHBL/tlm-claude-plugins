# App Router Architecture (Next.js 13+)

## Overview

This document covers the **App Router** architecture pattern introduced in Next.js 13+. App Router uses React Server Components, improved layouts, and modern data fetching patterns.

> **Team policy: App Router is the exception, not the default** (see the `tlm-fe-coding` skill →
> "Choosing the Next.js router"). Default to **Page Router** for management/admin/internal apps; use App
> Router only when genuinely needed — chiefly public, SEO-facing "publish" pages.

**When to use App Router (the exception):**
- **Public "publish" pages** — marketing, landing, blog, docs, product pages needing SEO / social metadata
- SSR / SSG / ISR, streaming, or edge rendering genuinely required
- You specifically need Server Components, Server Actions, or nested partial-render layouts

**When NOT to use App Router (stay on Page Router):**
- Management / admin / internal apps, dashboards, back-office tools (SEO irrelevant behind a login)
- You want a simple client-rendered SPA with minimal boilerplate
- You need full static export, or a fullstack app whose API is `app/api` route handlers + Prisma (Page Router Mode B)
- "It's newer / more modern" is **not** a sufficient reason — require a concrete SSR/SEO/RSC need

---

## Directory Structure

```
src/
├── app/                          # App Router directory (routing ONLY)
│   ├── layout.tsx                # Root layout (replaces _app.tsx)
│   ├── page.tsx                  # Home route (5 lines max)
│   ├── dashboard/
│   │   ├── layout.tsx            # Dashboard layout (headers, sidebars)
│   │   └── page.tsx              # Dashboard route (5 lines max)
│   └── products/
│       ├── page.tsx              # Product list route
│       └── [id]/
│           └── page.tsx          # Product detail route
└── _modules/                     # 100% framework-agnostic business logic
    ├── _api/                     # React Query hooks (client-side)
    │   ├── apiClientProduct.ts
    │   └── apiClientFeedback.ts
    ├── common/
    │   └── components/           # Shared components (3+ domains)
    │       ├── Col.tsx
    │       ├── Row.tsx
    │       ├── TextPrimary.tsx
    │       ├── BaseButton.tsx
    │       └── BaseModal.tsx
    ├── layouts/                  # Layout components
    │   ├── LayoutDefault.tsx
    │   └── LayoutDashboard.tsx
    ├── pages/                    # Screen components (ALL business logic)
    │   ├── providers.tsx         # Client providers wrapper ('use client')
    │   ├── Home/
    │   │   ├── HomeScreen.tsx    # Screen component
    │   │   └── components/       # Screen-specific components
    │   │       ├── HeroSection.tsx
    │   │       └── FeatureList.tsx
    │   └── Product/
    │       ├── ProductListScreen.tsx
    │       ├── ProductDetailScreen.tsx
    │       └── components/
    │           ├── ProductCard.tsx
    │           └── ProductForm.tsx
    └── server/                   # Server-side operations
        └── actions/              # Server Actions (App Router)
            ├── feedback.ts
            └── product.ts
```

---

## Core Principles

### 1. Framework-Agnostic Architecture

**CRITICAL**: `_modules/` folder contains ZERO Next.js imports (except type imports).

```tsx
// ✅ CORRECT: _modules/pages/Home/HomeScreen.tsx
'use client';  // Mark as Client Component

import { useState } from 'react';
import Col from '@/_modules/common/components/Col';
import Row from '@/_modules/common/components/Row';

export default function HomeScreen() {
  // ALL business logic lives here
  const [count, setCount] = useState(0);

  return (
    <Col className="min-h-screen">
      <Row className="max-w-4xl mx-auto">
        {/* UI content */}
      </Row>
    </Col>
  );
}

// ❌ WRONG: Never import from 'next/...' in _modules (except types)
import { redirect } from 'next/navigation';  // BAD
```

### 2. App Router Files: 5 Lines Max

**Route files are ROUTING ONLY** - they import and render Screen components.

```tsx
// ✅ CORRECT: src/app/page.tsx
import HomeScreen from '@/_modules/pages/Home/HomeScreen';

export default function Page() {
  return <HomeScreen />;
}

// ✅ CORRECT: src/app/products/[id]/page.tsx
import ProductDetailScreen from '@/_modules/pages/Product/ProductDetailScreen';

export default function Page({ params }: { params: { id: string } }) {
  return <ProductDetailScreen productId={params.id} />;
}

// ❌ WRONG: Never put business logic in route files
export default function Page() {
  const [state, setState] = useState();  // BAD
  const { data } = useQuery(...);        // BAD

  return <div>...</div>;
}
```

---

## App Router Specific Patterns

### Root Layout

**Replaces `_app.tsx` from Page Router:**

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next';
import Providers from '@/_modules/pages/providers';
import LayoutDefault from '@/_modules/layouts/LayoutDefault';
import './globals.css';

export const metadata: Metadata = {
  title: 'My App',
  description: 'App description',
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
          <LayoutDefault>
            {children}
          </LayoutDefault>
        </Providers>
      </body>
    </html>
  );
}
```

### Client Providers

**Separate file for 'use client' providers:**

```tsx
// src/_modules/pages/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,  // 1 minute
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### Nested Layouts

**Create section-specific layouts:**

```tsx
// src/app/dashboard/layout.tsx
'use client';

import { useRouter } from 'next/navigation';
import Row from '@/_modules/common/components/Row';
import BaseButton from '@/_modules/common/components/BaseButton';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <>
      {/* Persistent header for all dashboard routes */}
      <Row className="items-center justify-between bg-white shadow-sm px-6 py-4 sticky top-0 z-50">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <BaseButton
          size="md"
          variant="bordered"
          onClick={() => router.push('/')}
        >
          ← Home
        </BaseButton>
      </Row>

      {/* Child routes render here */}
      {children}
    </>
  );
}
```

---

## Server vs Client Components

### Use 'use server' and 'use client' Explicitly

**ALWAYS indicate component type to avoid mistakes:**

```tsx
// Server Component (default in App Router)
// NO directive needed, but can add for clarity

import ProductCard from './ProductCard';

export default async function ProductListScreen() {
  // Can fetch data directly (Server Component)
  const products = await fetchProducts();

  return (
    <div>
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

// Client Component (needs interactivity)
'use client';

import { useState } from 'react';

export default function ProductCard({ product }) {
  const [liked, setLiked] = useState(false);

  return (
    <div onClick={() => setLiked(!liked)}>
      {product.name}
    </div>
  );
}
```

### When to Use Each

**Server Components (default):**
- Data fetching
- Accessing backend resources
- Keeping sensitive info on server
- Large dependencies that don't need client

**Client Components ('use client'):**
- useState, useEffect, useContext
- Event listeners (onClick, onChange)
- Browser-only APIs
- React Query hooks
- Custom hooks using React hooks

---

## Migration Benefits

### Why App Router?

1. **Better Performance**
   - Server Components reduce bundle size
   - Automatic code splitting
   - Streaming SSR

2. **Improved Layouts**
   - Nested layouts without re-rendering
   - Persistent UI across routes
   - Shared data fetching

3. **Modern Patterns**
   - Server Actions replace API routes
   - Built-in loading/error states
   - Parallel routes & intercepting routes

### Migration Effort

**With framework-agnostic `_modules/` structure:**
- ✅ Move `pages/` → `app/`, rename `index.tsx` → `page.tsx`
- ✅ Convert `_app.tsx` → `layout.tsx`
- ✅ Add `'use server'` to server actions
- ✅ **`_modules/` folder requires ZERO changes** 🎉

---

## Navigation in App Router

### useRouter Hook Changes

```tsx
// Page Router (old)
import { useRouter } from 'next/router';

const router = useRouter();
router.push('/path');
router.query.id;  // Get query params

// App Router (new)
import { useRouter, useParams, useSearchParams } from 'next/navigation';

const router = useRouter();
router.push('/path');  // Navigation only

const params = useParams();  // Get route params
const searchParams = useSearchParams();  // Get query string
```

### Still Use Link Component

**Navigation rules remain the same:**

```tsx
// ✅ ALWAYS use Link
import Link from 'next/link';

<Link href="/dashboard" className="no-underline">
  <BaseButton as="span">Go to Dashboard</BaseButton>
</Link>

// ❌ NEVER use onClick navigation
<BaseButton onClick={() => router.push('/dashboard')}>  // BAD
  Go to Dashboard
</BaseButton>
```

---

## Best Practices

### 1. Minimize Client Components

```tsx
// ✅ CORRECT: Only interactive parts are client
// ServerComponent.tsx (no directive)
import ClientCounter from './ClientCounter';

export default function ServerComponent() {
  const data = await fetchData();  // Server-side fetch

  return (
    <div>
      <h1>{data.title}</h1>
      <ClientCounter />  {/* Only this needs 'use client' */}
    </div>
  );
}

// ClientCounter.tsx
'use client';
import { useState } from 'react';

export default function ClientCounter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

### 2. Data Fetching in Server Components

**The route file stays thin — fetching happens INSIDE the Screen**, which is an
async Server Component living in `_modules/pages/[Domain]/`. A `'use client'`
child handles interactivity.

```tsx
// src/app/products/page.tsx — thin route file, NO data fetching
import ProductListScreen from '@/_modules/pages/Product/ProductListScreen';

export default function Page() {
  return <ProductListScreen />;
}

// _modules/pages/Product/ProductListScreen.tsx — async Server Component
import { fetchProducts } from '@/_modules/server/actions/product';
import ProductListInteractive from './components/ProductListInteractive';

export default async function ProductListScreen() {
  // Data fetching lives in the Screen, not the route file
  const products = await fetchProducts();

  // Hand off to a client child for interactivity
  return <ProductListInteractive products={products} />;
}

// _modules/pages/Product/components/ProductListInteractive.tsx
'use client';

import { useState } from 'react';

export default function ProductListInteractive({
  products,
}: {
  products: Product[];
}) {
  const [items, setItems] = useState(products);

  // Can still use React Query for mutations
  // ...

  return <div>{/* Render products */}</div>;
}
```

### 3. Loading States

```tsx
// src/app/products/loading.tsx
export default function Loading() {
  return <div>Loading products...</div>;
}

// Automatically shown while page.tsx is loading
```

### 4. Error Boundaries

```tsx
// src/app/products/error.tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

---

## Common Pitfalls

### ❌ WRONG: Importing client-only code in Server Component

```tsx
// page.tsx (Server Component by default)
import { useState } from 'react';  // ERROR!

export default function Page() {
  const [state, setState] = useState();  // Can't use hooks
  return <div>...</div>;
}
```

**Fix:** Mark as Client Component or move logic to child component.

### ❌ WRONG: Using useRouter from 'next/router'

```tsx
'use client';
import { useRouter } from 'next/router';  // Wrong import!

// Fix:
import { useRouter } from 'next/navigation';
```

### ❌ WRONG: Accessing params without async

```tsx
// page.tsx
export default function Page({ params }) {
  console.log(params.id);  // Might be a Promise in future
}

// Fix: Make component async or use React.use()
export default async function Page({ params }) {
  const { id } = params;  // Safe
}
```

---

## Quick Reference

| Feature | Page Router | App Router |
|---------|-------------|------------|
| **Routing Dir** | `src/pages/` | `src/app/` |
| **Entry File** | `_app.tsx` | `layout.tsx` |
| **Route File** | `index.tsx` | `page.tsx` |
| **Navigation** | `next/router` | `next/navigation` |
| **Data Fetch** | `getServerSideProps` | Server Components |
| **API Routes** | `pages/api/` | Server Actions |
| **Loading UI** | Manual | `loading.tsx` |
| **Error UI** | Manual | `error.tsx` |

---

## Next Steps

1. **Read**: `app-router/02-routing-structure.md` (route patterns)
2. **Read**: `app-router/03-server-actions.md` (data mutations)
3. **Read**: `app-router/04-data-fetching.md` (fetching patterns)
4. **Reference**: `shared-fe/03-component-patterns.md` (component rules)

---

**Last Updated**: January 2024
**Next.js Version**: 13.0+ (App Router stable)
