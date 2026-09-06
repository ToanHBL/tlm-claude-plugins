# AI Workflow Integration Guidelines

> **Applies to:** Both Page Router and App Router.
> **Naming note:** This file uses the finalized conventions — `TextPrimary` (not `Text`/`TextPrimaryV1`),
> `Col`/`Row` for layout, and the `@/_modules/...` import path (leading underscore). See
> [`shared-fe/03-component-patterns.md`](./03-component-patterns.md) for the component hierarchy.

## Overview

This document is the operating manual for an AI system (or any new contributor) generating code in
this codebase. It defines how to bootstrap on the project, how to generate components and API clients,
the required import order, the testing harness, and a pre-flight code-review checklist. Follow it so
generated code integrates seamlessly with existing patterns.

## AI-Assisted Development Workflow

### 1. Project Analysis Phase

When encountering this project, first build a mental model **before writing any code**:

1. **Read the knowledge base** in this `ai/` folder to understand:
   - Project architecture & the framework-agnostic `_modules/` philosophy (`shared-fe/01`)
   - Styling / UI conventions — Tailwind CSS (`shared-fe/02`)
   - Component patterns & hierarchy (`shared-fe/03`)
   - TypeScript enums & constants (`shared-fe/04`)
   - Validation patterns (`shared-fe/05`)
   - Router-specific data flow (`nextjs/page-router/03` or `nextjs/app-router/04`)

2. **Analyze the codebase structure** — key directories to examine:
   ```bash
   src/_modules/_api/          # API clients (query/mutation hooks)
   src/_modules/common/        # Reusable Basic/Base/Common components
   src/_modules/pages/         # Screen components (ALL business logic)
   src/_modules/config/        # routeLinks, apiUrl, enums, constants
   src/_modules/server/        # Server-side operations (App Router)
   src/pages/  OR  src/app/    # Next.js routing ONLY (thin, imports Screen)
   ```

3. **Identify patterns from existing code** before adding new ones:
   - Base-component patterns (in-house Tailwind primitives)
   - API-client naming (`useQuery[Entity]`, `useMutation[Action]`, domain implicit from filename)
   - State management approach (Context + TanStack Query + React Hook Form)
   - Form handling — `register()` by default (+ `UtilsForm.computeRules` / Zod); `Controller` only for heavy customization

### 2. Code Generation Guidelines

#### Component Generation — Use Structured Components

AI should generate components using `Col`/`Row`/`TextPrimary` instead of raw HTML:

```tsx
'use client';

import { useContext, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ProviderGlobal } from '@/_modules/pages/providers';
import Col from '@/_modules/common/components/Col';
import Row from '@/_modules/common/components/Row';
import TextPrimary from '@/_modules/common/components/TextPrimary';

export default function ExampleScreen() {
  // 1. Hooks
  const { t } = useTranslation(['common']);
  const contextGlobal = useContext(ProviderGlobal);

  // 2. State
  const [localState, setLocalState] = useState('');

  // 3. API Calls (if needed)
  // const { data } = apiClientExample.useQueryExample({ /* params */ });

  // 4. Computed values
  const computedValue = useMemo(() => localState.trim(), [localState]);

  // 5. Event handlers — inline functions with TODO comments (function minimalism)

  // 6. Render — ALWAYS use structured components
  return (
    <Col className="example-screen space-y-6">
      <Row className="items-center justify-between">
        <TextPrimary text={t('Page Title')} className="text-2xl font-bold" />
      </Row>

      <Col className="content-area">
        {/* Use Col/Row for layout, TextPrimary for text. Never raw <div>/<p>/<span> */}
        <TextPrimary text={computedValue} />
      </Col>
    </Col>
  );
}
```

#### API Client Generation — Simplified Naming Convention

Generate API clients with simplified naming — the **domain is implicit from the filename**
(`apiClientBook.ts`, `apiClientProduct.ts`), so hooks do not repeat it:

```typescript
// apiClientBook.ts — call as apiClientBook.useQueryBooks(), apiClientBook.useMutationCreate()

export const useQueryBooks = (params: QueryParams) => {
  return useQuery({
    queryKey: [ApiUrl.BOOK_LIST, JSON.stringify(params)],
    queryFn: async () => {
      const queryParams = {
        ...params,
        'api-version': process.env.NEXT_PUBLIC_API_VERSION,
      };

      const url = joinTextNoSpace(
        ApiUrl.BOOK_LIST,
        '?',
        createSearchParams(objectFilterNull(queryParams)).toString(),
      );

      const res = await baseFetch(url);
      const json: ModelBaseDetailResponse<ModelBook[]> = await res.json();

      if (!res.ok) {
        throw Error(json?.message || '');
      }

      return json.data;
    },
  });
};

// Standard CRUD mutations — no domain repetition needed
export const useMutationCreate = () => {
  return useMutation({
    mutationKey: [ApiUrl.BOOK_CREATE],
    mutationFn: async (params: MutationParams) => {
      const payload = {
        'api-version': process.env.NEXT_PUBLIC_API_VERSION,
        ...params,
      };

      const url = joinTextNoSpace(ApiUrl.BOOK_CREATE);
      const res = await baseFetch(url, {
        body: JSON.stringify(payload),
        method: 'POST',
      });

      const json: ModelBaseDetailResponse<ModelBook> = await res.json();

      if (!res.ok) {
        // BaseToast: in-house Base component — import BaseToast from '@/_modules/common/components/BaseToast'
        BaseToast.show({
          title: json.errors ? Object.values(json.errors)?.join('. ') : json.message,
          color: 'danger',
        });
        throw Error(json.message);
      }

      BaseToast.show({ title: json.message, color: json.succeeded ? 'success' : 'danger' });
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ApiUrl.BOOK_LIST] });
    },
  });
};

export const useMutationUpdate = () => {
  return useMutation({
    mutationFn: ({ id, ...params }: { id: string } & MutationParams) =>
      UtilsApi.put<ModelBook>(`${ApiUrl.BOOK_UPDATE}/${id}`, params),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [ApiUrl.BOOK_LIST] }),
  });
};

export const useMutationDelete = () => {
  return useMutation({
    mutationFn: (id: string) => UtilsApi.delete(`${ApiUrl.BOOK_DELETE}/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [ApiUrl.BOOK_LIST] }),
  });
};

// Usage: import * as apiClientBook from '@/_modules/_api/apiClientBook';
// apiClientBook.useMutationCreate(), apiClientBook.useMutationUpdate(), etc.
```

### 3. AI Code Generation Rules

#### Naming Conventions
- **Components**: PascalCase with a suffix (`Screen`, `Card`, `Form`, `Modal`)
- **Hooks**: camelCase starting with `use` (`useProductFilter`, `useCartTransference`)
- **API Clients**: `useQuery[Entity]` / `useMutation[Action]` (domain implicit from filename)
- **Utilities**: `Utils[Domain]` (`UtilsForm`, `UtilsNavigation`)
- **Types/Models**: PascalCase, `Model` prefix for API models (`ModelBook`); `I` prefix only for local interfaces if the codebase already does so

#### API Client Naming Rules
- **Domain implicit**: `apiClientBook.useMutationCreate()` — NOT `useMutationBookCreate()`
- **Standard CRUD**: `useMutationCreate()`, `useMutationUpdate()`, `useMutationDelete()`
- **Descriptive actions**: `useMutationCreateShipping()` for domain-specific operations
- **Query patterns**: `useQueryBooks()`, `useQueryBookDetail()`, `useQueryBooksByCategory()`

#### File Organization
```
When generating a new feature, create:
src/_modules/pages/[Domain]/
├── [Domain]ListScreen.tsx          # Main list/index screen
├── [Domain]DetailScreen.tsx        # Detail view screen
├── components/                     # Domain-specific components ONLY
│   ├── [Domain]Modal.tsx          # Common modal (top level of domain)
│   ├── [Domain]Form.tsx           # Common form (top level of domain)
│   ├── list/                      # Components for list/grid contexts
│   │   ├── [Domain]Card.tsx
│   │   └── [Domain]Grid.tsx
│   └── detail/                    # Components for detail/single contexts
│       ├── [Domain]Info.tsx
│       └── [Domain]Actions.tsx
└── hooks/                         # Domain-specific hooks
    ├── use[Domain]Filter.ts
    └── use[Domain]Actions.ts

# Component placement rules:
# - Domain components: NEVER in /_modules/common/components/
# - Common components:  /_modules/common/components/ ONLY if used across 3+ domains
# - Base components:    Always in /_modules/common/components/
# - Use abstract folder names ('list', 'detail', 'form'), not specific names
```

#### Import Ordering (REQUIRED)
```tsx
// 1. React imports — avoid useCallback (function minimalism)
import { useState, useEffect, useMemo } from 'react';

// 2. Next.js imports
import { useRouter } from 'next/router';          // Page Router
// import { usePathname } from 'next/navigation';  // App Router

// 3. Third-party libraries
import { useTranslation } from 'react-i18next';
import { useForm, useWatch } from 'react-hook-form';

// 4. Internal API imports
import * as apiClientBook from '@/_modules/_api/apiClientBook';

// 5. Internal component imports
import BaseButton from '@/_modules/common/components/BaseButton';
import Box from '@/_modules/common/components/Box';

// 6. Internal utility imports
import { RouteLinks } from '@/_modules/config/routeLinks';
import UtilsForm from '@/_modules/common/utils/UtilsForm';

// 7. Context imports
import { ProviderGlobal } from '@/_modules/pages/providers';
```

### 4. AI Decision-Making Framework

#### When to Create New Components — Don't Hesitate

**Basic Components (`common/components`) — Always create:** simple, no business logic, high reuse —
`Spacer`, `Container`, `Card`, `Stack`, `Grid`, `Section`.

```tsx
export default function Section(props: PropsWithChildren & { className?: string }) {
  return (
    <section className={`default-styles ${props.className || ''}`} data-component="Section">
      {props.children}
    </section>
  );
}
```

**Domain Components (`pages/[Domain]/components`) — Create liberally**, even for single use:
`BookCard`, `BookFilters`, `BookActions`, `ProductGallery`, `OrderStatus`. Do not hesitate to create
for logical separation, clear boundaries, or testable units.

**Common Components (`common/components`) — only when cross-domain** (used in 3+ domains):
`SearchInput`, `LoadingState`, `ErrorBoundary`, `ConfirmModal`.

#### When to Create/Extend Base Components
Add or extend an in-house Base primitive (styled with Tailwind CSS) when creating variants, applying
project-specific styling, adding shared functionality, or maintaining design-system consistency.

#### API Client Organization
Create a new API-client file when adding a new business domain, when a file would exceed ~500 lines,
or when a domain has distinct auth/permission requirements.

### 5. Error Handling & Function Minimalism

#### Function Minimalism — CRITICAL rule
Avoid defining named handler functions. Use inline anonymous functions with a `TODO` for later tuning,
and always use `Col`/`Row`/`TextPrimary` instead of raw HTML:

```tsx
export default function BookListScreen() {
  const { data: books } = apiClientBook.useQueryBooks({});
  const deleteMutation = apiClientBook.useMutationDelete();

  return (
    <Col className="book-list-screen space-y-6">
      <Row className="header-actions items-center justify-between">
        <TextPrimary text={t('Books')} className="text-2xl font-bold" />

        <BaseButton
          onClick={() => {
            // TODO: Move to a function if performance tuning is needed
            refModalChildComponent.current?.onOpen(
              <BookModalContent onCancel={() => refModalChildComponent.current?.onClose()} />,
            );
          }}
        >
          {t('Add Book')}
        </BaseButton>
      </Row>

      <BookGrid className="books-grid">
        {books?.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            onDelete={(b: ModelBook) => {
              // TODO: Extract delete logic to a function if needed
              if (window.confirm(t('Are you sure?'))) deleteMutation.mutate(b.id);
            }}
          />
        ))}
      </BookGrid>

      {/* Always render the same structure — express states via props, not mount/unmount */}
      <Col className="book-content">
        <TextPrimary
          text={books?.length ? t('Books found') : t('No books')}
          className="text-center py-8"
        />
      </Col>
    </Col>
  );
}

// ❌ NEVER pre-create these:
// const handleEdit = () => {};
// const handleClick = () => {};
// ❌ NEVER use conditional returns that mount/unmount whole subtrees:
// if (loading) return <LoadingSpinner />;
// if (error) return <ErrorMessage />;
```

#### Independent Modal Content Pattern
Modal content components manage their own data fetching and mutations (pass an `id`, not data). The
"pass an `id`, fetch detail" flow is backed by a real or **mock** `GET /:id` detail endpoint (or resolves
the item from the cached list) when no `GET /:id` exists:

```tsx
export default function BookModalContent({ id, onSuccess, onCancel }: BookModalContentProps) {
  const { data } = apiClientBook.useQueryBookDetail(id || '', { enabled: !!id });
  const useMutationCreate = apiClientBook.useMutationCreate();
  const useMutationUpdate = apiClientBook.useMutationUpdate();

  const form = useForm<FormData>({
    defaultValues: { title: safeString(data?.title), author: safeString(data?.author) },
  });

  const handleSubmit = form.handleSubmit(async (formData) => {
    try {
      if (id) await useMutationUpdate.mutateAsync({ id, ...formData });
      else await useMutationCreate.mutateAsync(formData);
      onSuccess?.();
    } catch (error) {
      console.error('Error saving book:', error); // the mutation surfaces the BaseToast
    }
  });

  return (
    <form onSubmit={handleSubmit}>
      <BookForm title={data?.title ?? undefined} author={data?.author ?? undefined} onCancel={onCancel} />
      <BaseButton type="submit">{id ? t('Update') : t('Create')}</BaseButton>
    </form>
  );
}
```

#### API Error Handling
```tsx
if (!res.ok) {
  // BaseToast: in-house Base component — import BaseToast from '@/_modules/common/components/BaseToast'
  BaseToast.show({
    title: json.errors ? Object.values(json.errors)?.join('. ') : json.message,
    color: 'danger',
  });
  throw Error(json.message);
}
```

Notifications are standardized on the in-house Base component `BaseToast`: mount `<BaseToast />` once in
the app providers, then call `BaseToast.show({ title, color })` anywhere. Keep the `throw` after
`BaseToast.show` so callers still see the rejected promise.

### 6. Performance Optimization

Use `useMemo` **only** for genuinely expensive computations. Avoid `useCallback`; prefer inline
functions with a `TODO`. Manage query keys carefully (include user context when relevant):

```tsx
const expensiveValue = useMemo(() => computeExpensiveValue(data), [data]);

const queryKey = [ApiUrl.ENTITY_ACTION, JSON.stringify(params), userContext?.userId];
```

### 7. Testing Guidelines

Wrap components in a `QueryClientProvider` via a `renderWithProviders` helper (retries off):

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ComponentName from './ComponentName';

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe('ComponentName', () => {
  it('renders correctly', () => {
    renderWithProviders(<ComponentName />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles user interaction', () => {
    renderWithProviders(<ComponentName />);
    fireEvent.click(screen.getByRole('button', { name: 'Action' }));
  });
});
```

### 7b. API Types Mirror the Backend — Never Rename Fields in a Mapper (MUST)

When consuming an API/SSE response, type it with the **field names the backend actually sends** and use
them directly. Do NOT write a mapping function that renames or re-derives a property under a different
name — it silently drifts from the real payload, and nobody notices until the UI shows wrong data to a
user.

This is the single rule that prevents "vibe coded" integrations from quietly shipping wrong data. It is
a MUST, not a style preference.

- **No separate app-side DTO.** Do not create a parallel "DTO" that responses get converted into before
  use. The interface mirrors the response exactly — field names, nesting, optionality. Only the casing
  convention adapts (PascalCase C# → camelCase JSON). **The backend field name IS the app's field name.**
- **No property overrides during mapping.** Never take one backend field and re-expose it under a
  different name, or under a silently different meaning. If a value needs deriving for display, compute
  it **inline at the render/call site** from the untouched source field — never hide the source field
  behind a renamed derived one in a shared mapper.
- **Edit the existing files.** When wiring a real endpoint that a mock previously stood in for, edit the
  shared type file and the mock directly so both sides agree on the same true field names. Leaving the
  mock's invented shape untouched next to a differently-shaped real type — just to avoid editing
  existing code — is exactly how the drift happens.

```ts
// ❌ Renames `name` → `vehicle` and invents a fallback chain that masks the real field.
// The type said `vehicleName` but the API actually sends `name`; the mismatch went
// unnoticed for weeks because the fallback always "worked".
function fleetVehicleToInstall(v: FleetVehicle): Install {
  return {
    vehicle: v.vehicleName || [v.make, v.model].join(' ') || 'Unknown vehicle',
    ...
  };
}

// ✅ Type the field as the API actually sends it, and use it as-is
export interface ModelVehicleTelemetry {
  name?: string; // matches the payload exactly — not a guessed or prettified name
}
```

A second real failure from the same cause: `Install.rego` was computed as
`registrationNumber ?? String(id)`. Any vehicle missing `registrationNumber` silently displayed its
numeric `id` **as if it were a licence plate**. The fix was to delete the derived/renamed field and read
`registrationNumber` straight from the API type.

If a display value genuinely needs derivation (a computed label, a formatted total), keep the source
field on the type **as well** and derive inline at the render site.

### 8. AI Context Awareness

When working in this project, keep in mind:

1. **Business context**: E-commerce platform with B2B and B2C features
2. **User types**: Guest, individual members, corporate members, Ariba users
3. **Key features**: Product catalog, cart, checkout, profiles, orders
4. **Internationalization**: Multiple languages via i18next — never hardcode display strings
5. **Responsive design**: Mobile-first with Tailwind CSS
6. **Static export**: Page Router pages must be static-export compatible

### 9. Code Review Checklist (run before finalizing generated code)

- [ ] Follows established naming conventions
- [ ] Uses appropriate TypeScript types (no `as any`)
- [ ] Uses `Col`/`Row`/`TextPrimary` instead of raw HTML elements
- [ ] Creates components liberally, in the correct folder (basic/base/common/domain)
- [ ] Implements function minimalism (no unnecessary named functions)
- [ ] Navigation uses `Link`, never `onClick` + `router.push`
- [ ] Proper error handling (`BaseToast.show` + throw in API clients)
- [ ] Loading/empty states expressed via props (no mount/unmount branching); empty sections keep their
      header and render a visible empty state — never `data.length > 0 ? … : null`
- [ ] API types mirror the backend response field-for-field — no renaming/re-deriving in a mapper (§7b)
- [ ] Mid-layout conditional blocks transition in/out (`grid-rows-[0fr→1fr]` + opacity,
      `motion-reduce:transition-none`) — they do NOT hold a permanent `min-height` gap
- [ ] Backend responses parsed through their Zod schema at the service boundary — never
      `res.json() as T`; fixtures pinned with `satisfies` (see `15-zod-contract-first.md`)
- [ ] Dynamic display values wrapped in `safeString`; separators come from `joinWith`, never hardcoded
- [ ] Uses the required import ordering
- [ ] Responsive + accessible (ARIA) markup — semantic elements and ARIA/HTML attributes live inside `Base*` primitives (e.g. `BaseTable`, `BaseForm`), never as raw markup in screens
- [ ] Uses established utility functions (`UtilsForm`, `joinTextNoSpace`, etc.)
- [ ] Strings wrapped in `t()` for i18n
- [ ] **Every pressable element has its affordances** — see §9a. Tailwind v4 does NOT give a
      `<button>` a pointer cursor; you have to ask for it
- [ ] **No destructuring inside a function body** — see §9b. Props are the exception and stay
      destructured
- [ ] **Every unwired value carries `BaseMockBadge`, and `grep -rn MOCK src/` finds it** — see §9c
- [ ] **Below the drawn width the layout does not break** — no horizontal page scroll, no clipped
      text, `min-w-0` on flex children that truncate — see `11-responsive-defaults.md`

### 9a. Affordance pass (run in the browser, after the component compiles)

The affordance boxes above cannot be confirmed by reading a diff — a button missing its pointer cursor
reads perfectly in source. Tailwind v4's Preflight sets `cursor: default` on `<button>`, so a v3→v4
upgrade silently removed the hand cursor from every button in the app and nothing failed.

Run the six-step pass in [`12-interactive-affordances.md`](./12-interactive-affordances.md) §5 with the
screen open — hover, tab through, check disabled states, measure the smallest hit target — and state in
one line what you checked and anything you left failing.

### 9b. No destructuring inside a function body

Destructure **props** — that is the component's signature and it stays as it is. Inside the body,
read through the object instead.

```tsx
// ✅ Props destructured — the signature IS the contract
export default function VehicleDetailScreen({ vehicleId }: { vehicleId: number }) {
  const query = useQueryVehiclePage(vehicleId);

  // ✅ Read through the object. Where the value came from stays on screen.
  return <VehicleHeroBand device={query.data.detail.device} />;
}
```

```tsx
// ❌ A shadow set of bare names, detached from where they came from
const { detail, installRecord, lastPosition, connectedTo } = data;
// …200 lines later, `detail` could be anything, and renaming a backend field
// no longer shows you every place that reads it.
```

**Why.** A bare local name loses its provenance. `detail` does not say it came from the page payload,
so a reader has to scroll back to the destructuring line to find out, and a rename in the API no
longer surfaces at the call sites — which is exactly the drift §7b exists to prevent. Reading through
the object keeps the path visible and makes every consumer greppable by field name.

**The one carve-out: a hook's own return.** `const { t } = useTranslation()` and
`const { register, handleSubmit } = useForm()` stay — those names are the hook's published API, not
fields of a record, and every one of those libraries documents them that way. Everything else in a
body — API payloads, records, nested state — is read through.

Framework-mandated shapes are not exceptions to invent: `const { vehicleId } = await params` in a
Next.js route handler is the documented signature and stays.

### 9c. Mock data is labelled

Mock is scoped to **the field that has no endpoint**, never to the screen and never behind a
mock/live switch. What is wired renders live and unmarked; what is not renders from the mock — so the
screen is not blocked — with a `BaseMockBadge` beside it, in every environment. Reuse a backend record
for the unwired shape where one exists rather than inventing a parallel one.

`grep -rn MOCK src/` must find every site. Full rule: [`13-mock-data.md`](./13-mock-data.md).

### 10. Documentation Standards

When generating new code, also: update relevant docs if patterns change, add JSDoc for complex
functions, include usage examples for new shared components, document API changes, and keep type
definitions current.

---

This workflow ensures any AI system (or human) working with this codebase maintains consistency,
follows established patterns, and produces code that integrates seamlessly with the architecture.
