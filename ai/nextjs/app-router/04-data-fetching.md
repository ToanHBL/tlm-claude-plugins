# Data Fetching (App Router)

## Overview

App Router introduces **Server Components** as the default, enabling efficient server-side data fetching. This document covers fetching patterns, caching strategies, and integration with React Query.

---

## Data Fetching Approaches

### 1. Server Components (Recommended)

**Default in App Router** - Fetch data on the server:

```tsx
// src/app/products/page.tsx — thin route file, NO data fetching
import ProductListScreen from '@/_modules/pages/Product/ProductListScreen';

export default function Page() {
  return <ProductListScreen />;
}

// src/_modules/pages/Product/ProductListScreen.tsx — async Server Component
async function fetchProducts() {
  const res = await fetch('https://api.example.com/products', {
    cache: 'force-cache',  // Static generation
  });

  if (!res.ok) throw new Error('Failed to fetch');

  return res.json();
}

export default async function ProductListScreen() {
  // Fetching lives inside the Screen, not the route file
  const products = await fetchProducts();

  return <div>{/* Render products */}</div>;
}
```

**Benefits:**
- No client bundle increase
- Direct database access
- Automatic request deduplication
- Better SEO

### 2. Client Components with React Query

**For interactive data or mutations:**

```tsx
// src/_modules/pages/Product/ProductListScreen.tsx
'use client';

import * as apiClientProduct from '@/_modules/_api/apiClientProduct';
import ProductCard from './components/ProductCard';

export default function ProductListScreen() {
  const { data: products, isLoading } = apiClientProduct.useQueryList();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="grid grid-cols-3 gap-4">
      {products?.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

### 3. Hybrid Approach (Best of Both)

**Server fetch initial data (in the Screen), client handles updates:**

```tsx
// src/app/products/page.tsx — thin route file
import ProductListScreen from '@/_modules/pages/Product/ProductListScreen';

export default function Page() {
  return <ProductListScreen />;
}

// src/_modules/pages/Product/ProductListScreen.tsx — async Server Component
import ProductListInteractive from './components/ProductListInteractive';

export default async function ProductListScreen() {
  // Server-side fetch inside the Screen
  const initialProducts = await fetchProducts();

  return <ProductListInteractive initialProducts={initialProducts} />;
}
```

```tsx
// src/_modules/pages/Product/components/ProductListInteractive.tsx
'use client';

import * as apiClientProduct from '@/_modules/_api/apiClientProduct';

export default function ProductListInteractive({
  initialProducts,
}: {
  initialProducts: Product[];
}) {
  // Seed React Query with the server-fetched data, then keep it fresh
  const { data: products = initialProducts } = apiClientProduct.useQueryList({
    initialData: initialProducts,
  });

  return (
    <div className="grid grid-cols-3 gap-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

---

## Caching Strategies

### fetch() Options

```typescript
// Static Generation (default)
fetch('https://api.example.com/products', {
  cache: 'force-cache',  // Cache indefinitely
});

// Server-Side Rendering
fetch('https://api.example.com/products', {
  cache: 'no-store',  // Always fresh
});

// Incremental Static Regeneration (ISR)
fetch('https://api.example.com/products', {
  next: { revalidate: 3600 },  // Revalidate every hour
});

// Tagged Caching
fetch('https://api.example.com/products', {
  next: { tags: ['products'] },  // Revalidate by tag
});
```

### Segment-Level Caching

```typescript
// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Force static rendering
export const dynamic = 'force-static';

// Set revalidation time
export const revalidate = 3600;  // 1 hour

// Example:
// src/app/dashboard/page.tsx
// Segment config MUST live in the route file, but data fetching stays in the Screen
export const dynamic = 'force-dynamic';  // Always fresh data

export default function Page() {
  return <DashboardScreen />;
}

// src/_modules/pages/Dashboard/DashboardScreen.tsx — async Server Component
export default async function DashboardScreen() {
  const data = await fetchDashboardData();
  return <div>{/* Render dashboard */}</div>;
}
```

---

## Server Actions for Data Fetching

### Basic Pattern

```typescript
// src/_modules/server/actions/product.ts
'use server';

import { prisma } from '@/lib/prisma';

export async function fetchProductsAction() {
  return await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function fetchProductAction(id: string) {
  return await prisma.product.findUnique({
    where: { id },
  });
}
```

### Wrapped with React Query

```typescript
// src/_modules/_api/apiClientProduct.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import {
  fetchProductsAction,
  fetchProductAction,
} from '@/_modules/server/actions/product';

export const useQueryList = () => {
  return useQuery({
    queryKey: ['product-list'],
    queryFn: () => fetchProductsAction(),
  });
};

export const useQueryDetail = (id: string) => {
  return useQuery({
    queryKey: ['product-detail', id],
    queryFn: () => fetchProductAction(id),
    enabled: !!id,  // Only fetch if ID exists
  });
};
```

---

## Parallel Data Fetching

### Server Components (Automatic)

```tsx
// src/_modules/pages/Home/HomeScreen.tsx — async Server Component
// Fetches run in parallel automatically
export default async function HomeScreen() {
  // These run in parallel
  const productsPromise = fetchProducts();
  const categoriesPromise = fetchCategories();
  const featuredPromise = fetchFeaturedProducts();

  // Wait for all to complete
  const [products, categories, featured] = await Promise.all([
    productsPromise,
    categoriesPromise,
    featuredPromise,
  ]);

  return (
    <HomeContent
      products={products}
      categories={categories}
      featured={featured}
    />
  );
}
```

### React Query (Automatic)

```tsx
'use client';

export default function DashboardScreen() {
  // These queries run in parallel automatically
  const { data: products } = apiClientProduct.useQueryList();
  const { data: orders } = apiClientOrder.useQueryList();
  const { data: analytics } = apiClientAnalytics.useQuerySummary();

  return (
    <div>
      {/* Render when all loaded */}
    </div>
  );
}
```

---

## Sequential Data Fetching

### Dependent Queries

```tsx
'use client';

export default function ProductDetailScreen({ productId }: { productId: string }) {
  // First query
  const { data: product } = apiClientProduct.useQueryDetail(productId);

  // Second query depends on first
  const { data: reviews } = apiClientReview.useQueryList(product?.reviewId, {
    enabled: !!product?.reviewId,  // Only run when product loads
  });

  return <div>{/* Render */}</div>;
}
```

---

## Streaming & Suspense

### Streaming with Suspense

```tsx
// src/app/dashboard/page.tsx
import { Suspense } from 'react';
import ProductList from './ProductList';
import OrderList from './OrderList';
import LoadingSpinner from '@/_modules/common/components/LoadingSpinner';

export default function Page() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Stream ProductList independently */}
      <Suspense fallback={<LoadingSpinner />}>
        <ProductList />
      </Suspense>

      {/* Stream OrderList independently */}
      <Suspense fallback={<LoadingSpinner />}>
        <OrderList />
      </Suspense>
    </div>
  );
}
```

```tsx
// ProductList.tsx (Server Component)
export default async function ProductList() {
  // This can be slow, but won't block OrderList
  const products = await fetchProducts();

  return (
    <div>
      {products.map((p) => (
        <div key={p.id}>{p.name}</div>
      ))}
    </div>
  );
}
```

---

## Error Handling

### Server Component Errors

```tsx
// src/_modules/pages/Product/ProductListScreen.tsx — async Server Component
export default async function ProductListScreen() {
  try {
    const products = await fetchProducts();
    return <div>{/* Render products */}</div>;
  } catch (error) {
    // Bubbles up to the route's error.tsx boundary
    throw new Error('Failed to load products');
  }
}
```

```tsx
// src/app/products/error.tsx
'use client';

export default function Error({ error, reset }: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div>
      <h2>Failed to load products</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

### React Query Errors

```tsx
'use client';

export default function ProductListScreen() {
  const { data, error, isError } = apiClientProduct.useQueryList();

  if (isError) {
    return (
      <div className="text-red-500">
        Error: {error.message}
      </div>
    );
  }

  return <div>{/* Render */}</div>;
}
```

---

## Loading States

### Server Component Loading

```tsx
// src/app/products/loading.tsx
export default function Loading() {
  return <div className="animate-pulse">Loading products...</div>;
}
```

### React Query Loading

```tsx
'use client';

export default function ProductListScreen() {
  const { data: products, isLoading } = apiClientProduct.useQueryList();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      {products?.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

---

## Optimistic Updates

### React Query Pattern

```tsx
'use client';

import { useQueryClient } from '@tanstack/react-query';
import * as apiClientProduct from '@/_modules/_api/apiClientProduct';

export default function ProductCard({ product }: { product: Product }) {
  const queryClient = useQueryClient();
  const mutationUpdate = apiClientProduct.useMutationUpdate();

  const handleToggleFavorite = () => {
    // Optimistic update
    queryClient.setQueryData(['product-list'], (oldData: Product[] = []) => {
      return oldData.map((p) =>
        p.id === product.id ? { ...p, isFavorite: !p.isFavorite } : p
      );
    });

    // Actual mutation
    mutationUpdate.mutate(
      { id: product.id, isFavorite: !product.isFavorite },
      {
        onError: () => {
          // Rollback on error
          queryClient.invalidateQueries({ queryKey: ['product-list'] });
        },
      }
    );
  };

  return (
    <div>
      <button onClick={handleToggleFavorite}>
        {product.isFavorite ? '❤️' : '🤍'}
      </button>
    </div>
  );
}
```

---

## Pagination

### Server Component Pagination

```tsx
// src/app/products/page.tsx — reads searchParams, passes the page number on
import ProductListScreen from '@/_modules/pages/Product/ProductListScreen';

export default function Page({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = parseInt(searchParams.page || '1');
  return <ProductListScreen currentPage={page} />;
}

// src/_modules/pages/Product/ProductListScreen.tsx — async Server Component
export default async function ProductListScreen({
  currentPage,
}: {
  currentPage: number;
}) {
  const products = await fetchProducts({ page: currentPage, limit: 20 });

  return <ProductListPager products={products} currentPage={currentPage} />;
}
```

```tsx
// src/_modules/pages/Product/components/ProductListPager.tsx — client child
'use client';

import Link from 'next/link';
import BaseButton from '@/_modules/common/components/BaseButton';

export default function ProductListPager({
  products,
  currentPage,
}: {
  products: Product[];
  currentPage: number;
}) {
  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <div className="flex gap-2 mt-4">
        <Link
          href={`/products?page=${currentPage - 1}`}
          className="no-underline"
        >
          <BaseButton as="span" disabled={currentPage === 1}>
            Previous
          </BaseButton>
        </Link>

        <Link
          href={`/products?page=${currentPage + 1}`}
          className="no-underline"
        >
          <BaseButton as="span">Next</BaseButton>
        </Link>
      </div>
    </>
  );
}
```

### React Query Pagination

```tsx
'use client';

import { useState } from 'react';
import * as apiClientProduct from '@/_modules/_api/apiClientProduct';

export default function ProductListScreen() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isPreviousData } = apiClientProduct.useQueryList({
    page,
    limit: 20,
  }, {
    keepPreviousData: true,  // Show old data while fetching new
  });

  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        {data?.products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <div className="flex gap-2 mt-4">
        <BaseButton
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </BaseButton>

        <span>Page {page}</span>

        <BaseButton
          onClick={() => setPage((p) => p + 1)}
          disabled={isPreviousData || !data?.hasMore}
        >
          Next
        </BaseButton>
      </div>
    </>
  );
}
```

---

## Infinite Scroll

```tsx
'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchProductsAction } from '@/_modules/server/actions/product';
import { useEffect, useRef } from 'react';

export default function InfiniteProductList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['product-infinite'],
    queryFn: ({ pageParam = 1 }) => fetchProductsAction({ page: pageParam }),
    getNextPageParam: (lastPage, pages) => {
      return lastPage.hasMore ? pages.length + 1 : undefined;
    },
  });

  // Intersection Observer for auto-load
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 1.0 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage]);

  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        {data?.pages.map((page) =>
          page.products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))
        )}
      </div>

      <div ref={loadMoreRef} className="h-10">
        {isFetchingNextPage && <LoadingSpinner />}
      </div>
    </>
  );
}
```

---

## Request Deduplication

**Automatic in Server Components:**

```tsx
// Both components fetch same data - only 1 request made
export default async function Page() {
  return (
    <>
      <ProductList />
      <FeaturedProducts />
    </>
  );
}

async function ProductList() {
  const products = await fetchProducts();  // Request 1
  return <div>{/* Render */}</div>;
}

async function FeaturedProducts() {
  const products = await fetchProducts();  // Deduplicated!
  return <div>{/* Render */}</div>;
}
```

---

## Best Practices

### 1. Prefer Server Components for Initial Data

```tsx
// ✅ CORRECT: Fetch inside the Screen (async Server Component); route stays thin
export default async function ProductListScreen() {
  const products = await fetchProducts();
  return <ProductListInteractive products={products} />;
}

// ❌ WRONG: Fetch in the route file and pass initialX down to the Screen
export default async function Page() {
  const products = await fetchProducts();
  return <ProductListScreen initialProducts={products} />;
}
```

### 2. Use React Query for Interactive Data

```tsx
// ✅ CORRECT: React Query for mutations and real-time updates
'use client';
export default function ProductListScreen({ initialProducts }) {
  const { data } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    initialData: initialProducts,
  });

  const mutationDelete = useMutationDelete();
  // Can handle deletes with optimistic updates
}
```

### 3. Leverage Caching

```tsx
// ✅ CORRECT: Use appropriate cache strategy
fetch('/api/products', {
  next: { revalidate: 3600 },  // ISR with 1-hour cache
});

// ❌ WRONG: Always no-cache hurts performance
fetch('/api/products', {
  cache: 'no-store',  // Avoid unless absolutely necessary
});
```

---

## Quick Decision Tree

**Should I use Server Components or React Query?**

```
Is this initial page load?
├─ Yes → Server Component
└─ No → Is user interaction involved?
    ├─ Yes → React Query
    └─ No → Server Component

Does data change frequently?
├─ Yes → React Query (polling/real-time)
└─ No → Server Component (with caching)

Do I need optimistic updates?
├─ Yes → React Query
└─ No → Either works

Is SEO important?
├─ Yes → Server Component
└─ No → Either works
```

---

## Quick Reference

| Pattern | Use Case | Example |
|---------|----------|---------|
| **Server Component** | Initial fetch, SEO | `const data = await fetch()` |
| **React Query** | Interactive, mutations | `useQuery()`, `useMutation()` |
| **Hybrid** | Best performance | Server fetch + React Query |
| **Suspense** | Independent streaming | `<Suspense fallback={...}>` |
| **ISR** | Static + fresh data | `revalidate: 3600` |

---

## Next Steps

1. **Read**: `shared/03-component-patterns.md` (component rules)
2. **Read**: `shared/05-validation-patterns.md` (form validation)
3. **Reference**: `app-router/03-server-actions.md` (mutations)

---

**Last Updated**: January 2024
**Next.js Version**: 13.0+ (App Router)
