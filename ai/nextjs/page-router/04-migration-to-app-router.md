# Migration Guide: Page Router → App Router

## Overview

This guide walks you through migrating a Next.js project from **Page Router** to **App Router**. Thanks to the framework-agnostic `_modules/` architecture, most of your codebase requires ZERO changes.

---

## Migration Effort

### With Framework-Agnostic Architecture

| Component | Changes Required | Effort |
|-----------|-----------------|--------|
| `_modules/` folder | ✅ **ZERO changes** | None |
| `pages/` routing files | Rename/move to `app/` | Low |
| `_app.tsx` | Convert to `layout.tsx` | Low |
| Server actions | Add `'use server'` directive | Minimal |
| Navigation hooks | Update imports | Low |

**Total Effort**: 1-2 days for medium project

---

## Prerequisites

### Verify Your Project Structure

Ensure you have the framework-agnostic architecture:

```
src/
├── pages/                    # Will migrate to app/
│   ├── _app.tsx
│   ├── index.tsx
│   └── products/
│       └── [id].tsx
└── _modules/                 # ✅ NO CHANGES NEEDED
    ├── _api/
    ├── common/
    ├── layouts/
    ├── pages/
    └── server/
```

---

## Step 1: Install Next.js 13+

### Update package.json

```bash
npm install next@latest react@latest react-dom@latest
```

Or with specific versions:

```bash
npm install next@14.0.0 react@18.2.0 react-dom@18.2.0
```

---

## Step 2: Create App Directory

### Create the app/ folder

```bash
mkdir src/app
```

### Project structure during migration

```
src/
├── pages/           # Keep temporarily (both routers can coexist)
│   ├── _app.tsx
│   └── ...
├── app/             # New App Router (migrate routes one by one)
│   ├── layout.tsx
│   └── page.tsx
└── _modules/        # ✅ Unchanged
```

---

## Step 3: Convert _app.tsx to layout.tsx

### Before (Page Router)

```tsx
// src/pages/_app.tsx
import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import LayoutDefault from '@/_modules/layouts/LayoutDefault';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <LayoutDefault>
        <Component {...pageProps} />
      </LayoutDefault>
    </QueryClientProvider>
  );
}
```

### After (App Router)

**Step 1: Create root layout**

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next';
import Providers from './providers';
import LayoutDefault from '@/_modules/layouts/LayoutDefault';
import '@/styles/globals.css';

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

**Step 2: Create providers file** (client components need 'use client')

```tsx
// src/app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
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

---

## Step 4: Migrate Route Files

### Page Router Pattern

```tsx
// src/pages/index.tsx
import HomeScreen from '@/_modules/pages/Home/HomeScreen';

export default function Page() {
  return <HomeScreen />;
}
```

### App Router Pattern

**Rename `index.tsx` → `page.tsx`:**

```tsx
// src/app/page.tsx
import HomeScreen from '@/_modules/pages/Home/HomeScreen';

export default function Page() {
  return <HomeScreen />;
}
```

**That's it!** ✅ Screen component requires ZERO changes.

---

## Step 5: Migrate Dynamic Routes

### Page Router

```tsx
// src/pages/products/[id].tsx
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

### App Router

```tsx
// src/app/products/[id]/page.tsx
import ProductDetailScreen from '@/_modules/pages/Product/ProductDetailScreen';

export default function Page({ params }: { params: { id: string } }) {
  return <ProductDetailScreen productId={params.id} />;
}
```

**Changes:**
- ✅ Folder name: `[id].tsx` → `[id]/page.tsx`
- ✅ Props: `useRouter().query` → `params` prop
- ✅ Screen component: ZERO changes

---

## Step 6: Update Server Actions

### Add 'use server' Directive

```typescript
// src/_modules/server/actions/product.ts

// ADD THIS LINE:
'use server';

export async function fetchProductsAction() {
  return await prisma.product.findMany();
}

export async function createProductAction(data: any) {
  return await prisma.product.create({ data });
}
```

**That's it!** Server actions are now App Router compatible.

---

## Step 7: Update Navigation Hooks

### Components Using useRouter

**Page Router:**

```tsx
'use client';

import { useRouter } from 'next/router';

export default function Component() {
  const router = useRouter();

  const handleClick = () => {
    router.push('/dashboard');
  };

  return <button onClick={handleClick}>Go</button>;
}
```

**App Router:**

```tsx
'use client';

import { useRouter } from 'next/navigation';  // Changed import!

export default function Component() {
  const router = useRouter();

  const handleClick = () => {
    router.push('/dashboard');
  };

  return <button onClick={handleClick}>Go</button>;
}
```

**Changes:**
- ✅ Import: `next/router` → `next/navigation`
- ✅ Everything else: Unchanged

### Accessing Query Params

**Page Router:**

```tsx
import { useRouter } from 'next/router';

const router = useRouter();
const { id } = router.query;
```

**App Router:**

```tsx
import { useParams, useSearchParams } from 'next/navigation';

// Route params
const params = useParams();
const id = params.id;

// Query string
const searchParams = useSearchParams();
const query = searchParams.get('q');
```

---

## Step 8: Update Head/Metadata

### Page Router

```tsx
import Head from 'next/head';

export default function Page() {
  return (
    <>
      <Head>
        <title>My Page</title>
        <meta name="description" content="Description" />
      </Head>
      <ProductListScreen />
    </>
  );
}
```

### App Router

```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Page',
  description: 'Description',
};

export default function Page() {
  return <ProductListScreen />;
}
```

---

## Step 9: Migrate Nested Layouts

### Page Router (Manual Layout per Page)

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

### App Router (Automatic Layout)

```tsx
// src/app/dashboard/layout.tsx
'use client';

import LayoutDashboard from '@/_modules/layouts/LayoutDashboard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LayoutDashboard>{children}</LayoutDashboard>;
}
```

```tsx
// src/app/dashboard/page.tsx
import DashboardScreen from '@/_modules/pages/Dashboard/DashboardScreen';

export default function Page() {
  return <DashboardScreen />;
}
```

**Benefits:**
- ✅ Layout persists across dashboard routes
- ✅ No re-render when navigating between dashboard pages

---

## Step 10: Testing & Validation

### Test Checklist

- [ ] All routes render correctly
- [ ] Navigation works (Link components)
- [ ] Dynamic routes work (params)
- [ ] Query strings work (useSearchParams)
- [ ] Data fetching works (React Query)
- [ ] Mutations work (create/update/delete)
- [ ] Forms validate and submit
- [ ] Nested layouts persist
- [ ] Loading states display
- [ ] Error boundaries catch errors
- [ ] Metadata/SEO tags present

### Run Development Server

```bash
npm run dev
```

Test each route thoroughly.

---

## Step 11: Remove Page Router

### Once Migration is Complete

1. **Delete `pages/` directory** (except `pages/api/` if using API routes)
2. **Update next.config.js** if needed
3. **Clean up unused code**

```bash
# Backup first!
mv src/pages src/pages.backup

# Test everything works
npm run dev

# If all good, remove backup
rm -rf src/pages.backup
```

---

## Common Pitfalls & Solutions

### ❌ Problem: "use client" missing

**Error:**
```
Error: useState is not a function
```

**Solution:** Add `'use client'` to components using React hooks.

```tsx
'use client';  // Add this

import { useState } from 'react';
```

---

### ❌ Problem: Wrong router import

**Error:**
```
Module not found: Can't resolve 'next/router'
```

**Solution:** Update import.

```tsx
// Before
import { useRouter } from 'next/router';

// After
import { useRouter } from 'next/navigation';
```

---

### ❌ Problem: Params undefined

**Error:**
```
Cannot read property 'id' of undefined
```

**Solution:** Params come from props, not useRouter().

```tsx
// Before (Page Router)
const router = useRouter();
const { id } = router.query;

// After (App Router)
export default function Page({ params }: { params: { id: string } }) {
  const { id } = params;  // From props!
}
```

---

### ❌ Problem: Server Action not found

**Error:**
```
Functions cannot be passed directly to Client Components
```

**Solution:** Ensure server action has `'use server'` directive.

```typescript
// src/_modules/server/actions/product.ts
'use server';  // Add this!

export async function createProductAction(data: any) {
  // ...
}
```

---

## Migration Checklist

### Pre-Migration

- [ ] Verify `_modules/` folder is framework-agnostic
- [ ] All Screen components use only React imports
- [ ] No direct Next.js imports in `_modules/` (except types)
- [ ] Backup project (`git commit` or copy folder)

### During Migration

- [ ] Install Next.js 13+
- [ ] Create `app/` directory
- [ ] Convert `_app.tsx` to `layout.tsx` + `providers.tsx`
- [ ] Migrate route files (rename to `page.tsx`)
- [ ] Update dynamic route patterns
- [ ] Add `'use server'` to server actions
- [ ] Update `useRouter` imports
- [ ] Convert `Head` to `metadata`
- [ ] Test all routes

### Post-Migration

- [ ] Remove `pages/` directory
- [ ] Update documentation
- [ ] Train team on App Router patterns
- [ ] Monitor for errors in production

---

## Incremental Migration Strategy

### Phase 1: Coexistence (Week 1)

- ✅ Both Page Router and App Router work simultaneously
- ✅ Migrate low-risk pages first (static pages, about, contact)
- ✅ Keep Page Router for complex pages

### Phase 2: Main Migration (Week 2-3)

- ✅ Migrate dynamic routes
- ✅ Migrate dashboard/admin pages
- ✅ Test thoroughly

### Phase 3: Cleanup (Week 4)

- ✅ Remove Page Router
- ✅ Optimize App Router features (streaming, etc.)
- ✅ Documentation updates

---

## Benefits After Migration

### 1. Better Performance

- ✅ Server Components reduce bundle size
- ✅ Automatic code splitting
- ✅ Streaming SSR

### 2. Better DX

- ✅ Nested layouts without manual wrapping
- ✅ Built-in loading/error states
- ✅ Server Actions replace API routes

### 3. Future-Proof

- ✅ Modern React patterns
- ✅ Better Next.js support going forward
- ✅ Easier to adopt new features

---

## Quick Migration Summary

| Step | Action | Effort |
|------|--------|--------|
| 1 | Install Next.js 13+ | 5 min |
| 2 | Create `app/` directory | 1 min |
| 3 | Convert `_app.tsx` to `layout.tsx` | 10 min |
| 4 | Migrate route files | Low (per route) |
| 5 | Update dynamic routes | Low (per route) |
| 6 | Add `'use server'` to actions | 5 min |
| 7 | Update navigation hooks | Low (per component) |
| 8 | Update metadata | Low (per route) |
| 9 | Migrate layouts | Medium |
| 10 | Test & validate | High |
| 11 | Remove Page Router | 5 min |

**Total**: 1-2 days for medium project (thanks to framework-agnostic architecture!)

---

## Need Help?

### Common Issues

1. **Check**: Is `'use client'` added to components using hooks?
2. **Check**: Are imports from `next/navigation` (not `next/router`)?
3. **Check**: Do server actions have `'use server'` directive?
4. **Check**: Are params accessed from props (not useRouter)?

### Resources

- **Next.js App Router Docs**: https://nextjs.org/docs/app
- **Migration Guide (Official)**: https://nextjs.org/docs/app/building-your-application/upgrading/app-router-migration

---

## Next Steps

1. **Start Migration**: Follow this guide step-by-step
2. **Read**: `app-router/01-architecture.md` (new patterns)
3. **Read**: `app-router/03-server-actions.md` (data mutations)
4. **Optimize**: Use Server Components for better performance

---

**Last Updated**: January 2024
**Next.js Version**: 13.0+ (App Router)
