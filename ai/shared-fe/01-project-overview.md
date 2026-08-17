# Project Overview & Architecture (Shared)

> **Applies to**: Both Page Router and App Router projects
>
> **Router-Specific**: See `page-router/01-architecture.md` or `app-router/01-architecture.md` for routing patterns

## Project Summary

This is a **Next.js 15** frontend application built with **TypeScript** and **Tailwind CSS**. The project follows a **framework-agnostic modular architecture** with clear separation between routing, components, and business logic.

## Tech Stack

### Core Framework
- **Next.js 15.1.6** (Page Router or App Router)
- **React 19** with React Hook Form
- **TypeScript 5** with strict configuration

### UI & Styling
- **Tailwind CSS 3.4** with custom theming
- **In-house UI primitives** (BaseButton, BaseInput, etc.) styled with Tailwind CSS
- **Framer Motion** for animations

### Data Management
- **TanStack Query 5.66.5** (data fetching & caching)
- **React Hook Form** for form state
- **Zod** for schema validation
- **nuqs** for URL state management

### Utilities
- **i18next** for internationalization
- **Swiper** for carousels/sliders
- **Moment.js** for date handling
- **jwt-decode** for token parsing

---

## Framework-Agnostic Architecture Principles

### 1. Separation of Concerns

**CRITICAL RULE**: The `_modules/` folder contains ALL business logic and is 100% framework-agnostic.

```
src/
├── [routing-dir]/        # Next.js routing layer (pages/ or app/)
│   └── [routes]/         # ONLY routing - 5 lines max per file
└── _modules/             # Business logic - ZERO framework dependencies
    ├── _api/             # API clients & data fetching
    ├── server/           # Server-side operations
    ├── assets/           # Static assets (SVG, PNG)
    ├── common/           # Shared components & utilities
    ├── config/           # Configuration files
    ├── fonts/            # Font assets
    ├── i18next/          # Internationalization
    ├── layouts/          # Layout components
    ├── pages/            # Screen components (business logic)
    └── values/           # Constants and dummy data
```

**Why This Matters:**
- ✅ Easy migration between Next.js routing patterns (Page → App Router)
- ✅ Can switch to Remix, Vite + React, or any React framework
- ✅ **Portable to React Native (Expo)** — the same `_modules/` powers mobile; only the routing +
  presentation shell change. See [`08-cross-platform-architecture.md`](./08-cross-platform-architecture.md)
  and the [`../reactnative/`](../reactnative/README.md) knowledge base
- ✅ Business logic survives framework changes
- ✅ Clear boundaries prevent mixing concerns

### 2. Routing vs Business Logic

#### Routing Layer (5 Lines Max)
```tsx
// src/pages/product/[slug]/index.tsx (Page Router)
// OR src/app/product/[slug]/page.tsx (App Router)

import ProductDetailScreen from '@/_modules/pages/Product/ProductDetailScreen';

export default function Page() {
  return <ProductDetailScreen />;
}
```

#### Business Logic Layer (No Line Limit)
```tsx
// src/_modules/pages/Product/ProductDetailScreen.tsx
'use client'; // Ready for App Router

import { useParams } from 'next/navigation';
import Col from '@/_modules/common/components/Col';
import { useQueryProductDetail } from '@/_modules/_api/apiClientProduct';

export default function ProductDetailScreen() {
  // ALL hooks, state, business logic here
  const params = useParams<{ slug: string }>();
  const { data: product, error } = useQueryProductDetail({ slug: params?.slug });

  // ALL UI rendering here
  return (
    <Col className="product-detail">
      {/* Complete component implementation */}
    </Col>
  );
}
```

---

## Architecture Patterns

### 1. Component Hierarchy

```
┌─────────────────────────────────────┐
│  Basic Components (Structural)      │
│  Col, Row, TextPrimary, Box         │
└───────────┬─────────────────────────┘
            │
┌───────────▼─────────────────────────┐
│  Base Components (In-House Tailwind)│
│  BaseButton, BaseInput, BaseSelect  │
└───────────┬─────────────────────────┘
            │
┌───────────▼─────────────────────────┐
│  Common Components (Cross-Domain)   │
│  Used in 3+ domains                 │
└───────────┬─────────────────────────┘
            │
┌───────────▼─────────────────────────┐
│  Domain Components (Business)       │
│  BookForm, ProductCard              │
└───────────┬─────────────────────────┘
            │
┌───────────▼─────────────────────────┐
│  Screen Components (Pages)          │
│  HomeScreen, ProductDetailScreen    │
└─────────────────────────────────────┘
```

**Component Location Rules:**

```tsx
// ✅ CORRECT: Basic components in common/components
_modules/common/components/
├── Col.tsx                    // Structural
├── Row.tsx                    // Structural
├── TextPrimary.tsx            // Structural
├── BaseButton.tsx             // In-house primitive (Tailwind)
└── BaseInput.tsx              // In-house primitive (Tailwind)

// ✅ CORRECT: Domain components in domain folder
_modules/pages/Book/components/
├── BookForm.tsx               // Domain-specific
├── BookCard.tsx               // Domain-specific
└── BookModalContent.tsx       // Domain-specific

// ❌ WRONG: Domain components in common folder
_modules/common/components/Book/  // NEVER DO THIS
```

### 2. State Management Strategy

```typescript
// Different state types → Different solutions

// 1. Server State (API data)
const { data } = useQuery(['products'], fetchProducts);

// 2. URL State (shareable/bookmarkable)
const [category] = useQueryState('category', { defaultValue: '' });

// 3. Global State (auth, user)
const authContext = useContext(AuthContext);

// 4. Local State (component-specific)
const [isOpen, setIsOpen] = useState(false);

// 5. Form State (form inputs)
const form = useForm<FormData>();

// 6. Persistent State (localStorage)
localStorage.setItem('theme', 'dark');
```

### 3. Data Flow Architecture

```
┌──────────────────┐
│   API Layer      │  baseFetch → API endpoints
└────────┬─────────┘
         │
┌────────▼─────────┐
│  TanStack Query  │  useQuery / useMutation
└────────┬─────────┘
         │
┌────────▼─────────┐
│  React Context   │  Global state providers
└────────┬─────────┘
         │
┌────────▼─────────┐
│   Components     │  Screen → Domain → Base → Basic
└──────────────────┘
```

---

## Build & Deployment Configuration

### Static Export Mode

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: 'export',              // Generate static HTML/CSS/JS
  trailingSlash: true,           // Fix dynamic routes
  images: { unoptimized: true }, // No image optimization
};
```

**Characteristics:**
- ✅ Suitable for CDN deployment
- ✅ No server required
- ✅ Fast performance
- ❌ No server-side rendering
- ❌ No API routes
- ❌ No Image Optimization API

### Development vs Production

| Mode | Command | Features |
|------|---------|----------|
| **Development** | `npm run dev` | Hot reload, debug tools, verbose logging |
| **Production** | `npm run build` | Static export, optimized bundles, minification |
| **Static Serve** | `npm run start_spa` | Serve built static files locally |

---

## Key Dependencies Explained

### UI & Styling
- **Tailwind CSS**: Utility-first CSS framework — the sole styling system for the web
- **In-house UI primitives**: `Base*` components (BaseButton, BaseInput, BaseSelect, BaseModal) styled with Tailwind CSS

### Data Fetching
- **@tanstack/react-query**: Server state management, caching, auto-refetch
- **nuqs**: Type-safe URL state management with React hooks

### Forms & Validation
- **react-hook-form**: Performant form state management
- **@hookform/resolvers**: Integration with validation libraries
- **zod**: TypeScript-first schema validation

### Development Tools
- **@svgr/webpack**: Convert SVG files to React components
- **husky**: Git hooks for code quality checks
- **prettier**: Automatic code formatting
- **volta**: Node.js version management

---

## Environment Configuration

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_BASE_URL_API=https://api.example.com/
NEXT_PUBLIC_API_VERSION=1.0
NEXT_PUBLIC_DEV_DEBUG=true
```

**Rules:**
- `NEXT_PUBLIC_*` variables are exposed to browser
- Non-prefixed variables are server-only (App Router)
- Set during build time for static export

---

## TypeScript Configuration

### Strict Mode Enabled

```json
{
  "compilerOptions": {
    "strict": true,              // Enable all strict checks
    "target": "ES2017",
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve"
  }
}
```

### Path Aliases

```json
{
  "paths": {
    "@/_modules/*": ["./src/_modules/*"],
    "@/components/*": ["./src/_modules/common/components/*"],
    "@/*": ["./src/*"]
  }
}
```

---

## Important JavaScript/TypeScript Rules

### 1. No Index File Exports

```tsx
// ❌ WRONG: Index files for re-exporting
// _modules/common/components/index.ts
export { default as BaseButton } from './BaseButton';
export { default as BaseInput } from './BaseInput';

// ✅ CORRECT: Direct imports
import BaseButton from '@/_modules/common/components/BaseButton';
import BaseInput from '@/_modules/common/components/BaseInput';
```

**Why?** Reduces circular dependencies and makes imports explicit.

### 2. No Object Destructuring for Props

```tsx
// ❌ WRONG: Destructuring props
function BookCard({ book }: { book: Book }) {
  const { title, author, isbn } = book;
  return <div>{title}</div>;
}

// ✅ CORRECT: Direct property access
function BookCard({ book }: { book: Book }) {
  return <div>{book.title}</div>;
}
```

**Why?** Better for React shallow comparison and rerenders.

### 3. Explicit Undefined Types

```tsx
// ❌ LESS CLEAR: Optional properties
interface FormProps {
  title?: string;
  onSubmit?: () => void;
}

// ✅ MORE CLEAR: Explicit undefined for external data
interface FormProps {
  title: string | undefined;        // External data - may be null
  author: string | undefined;       // External data - may be null
  onSubmit: () => void;             // Internal callback - required
  onCancel: () => void;             // Internal callback - required
}
```

**Why?** Better IDE autocomplete and clearer trust boundaries.

---

## Next Steps

1. **Choose Your Router**: Read `page-router/01-architecture.md` or `app-router/01-architecture.md`
2. **Learn Components**: Read `shared-fe/03-component-patterns.md`
3. **Understand Styling**: Read `shared-fe/02-styling-ui-conventions.md`
4. **Master Data Flow**: Read `[router]/03-api-data-flow.md`

---

**Version**: 1.0
**Last Updated**: January 2024
**Applies To**: Next.js 13-15, React 18-19, TypeScript 5+
