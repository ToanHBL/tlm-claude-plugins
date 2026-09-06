# Next.js Project Rules - Finalized Knowledge Base

## 📁 Folder Structure

This knowledge base is organized to support both Next.js routing patterns:

```
ai/
├── README.md                    # This file - navigation guide
├── shared-fe/                   # Cross-stack frontend rules (web + React Native)
│   ├── 01-project-overview.md
│   ├── 02-styling-ui-conventions.md
│   ├── 03-component-patterns.md
│   ├── 04-typescript-enums-constants.md
│   ├── 05-validation-patterns.md
│   ├── 06-development-setup.md
│   ├── 07-ai-workflow-integration.md   # AI/contributor operating manual
│   ├── 08-cross-platform-architecture.md # Web ↔ React Native mapping
│   ├── 09-data-listing.md       # Tables, sort, filter, limit/offset paging, four states
│   ├── 10-images-and-preview.md # Thumbnail → preview modal, no layout shift, visible failures
│   ├── 11-responsive-defaults.md # One drawn width: build it, and don't break below it
│   ├── 12-interactive-affordances.md # Cursor, hover, focus ring, hit target — a post-coding pass
│   ├── 13-mock-data.md          # Label what isn't wired yet; grep -rn MOCK finds every site
│   ├── 14-e2e-testing.md        # Playwright: the no-failing-request sweep + declared refusals
│   ├── 15-zod-contract-first.md # Schemas are the source of truth; responses parsed, never `as T`
│   └── 16-monorepo-turborepo.md # Multi-app products: Turborepo, apps/* + packages/contracts
├── vendor/
│   └── ECC-ADOPTION.md          # everything-claude-code review: provenance + what we turned off
├── templates/                   # Requirement-intake templates
│   ├── input-processing-template.md
│   └── requirement-summary-template.md
├── nextjs/
│   ├── 00-backend-decision.md   # BFF over an existing backend, or backend-first in-app (before the router choice)
│   ├── page-router/             # Page Router specific rules (Next.js 12-15)
│   │   ├── 01-architecture.md            # Mode A: static-export SPA
│   │   ├── 02-routing-structure.md
│   │   ├── 03-api-data-flow.md           # Mode A: client → external backend
│   │   ├── 04-migration-to-app-router.md
│   │   ├── 05-fullstack-nextjs-api-prisma.md  # Mode B: app/api/**/route.ts + Prisma backend
│   │   └── 06-hard-rules.md          # ★ enforceable rule set (tlm-fe-coding inlines the top few)
│   └── app-router/              # App Router specific rules (Next.js 13+)
│       ├── 01-architecture.md
│       ├── 02-routing-structure.md
│       ├── 03-server-actions.md
│       ├── 04-data-fetching.md
│       └── 06-hard-rules.md          # ★ enforceable rule set
└── reactnative/                 # React Native — Expo Router + RN CLI
    ├── README.md
    ├── 01-architecture.md            # Expo stack, _modules, EAS build, state
    ├── 02-styling-stylesheet.md      # StyleSheet, theme constants, scale(), Moti
    ├── 03-navigation-expo-router.md  # Expo Router (navigate-not-push)
    ├── 04-data-and-storage.md        # baseFetch + AsyncStorage, TanStack Query
    ├── 05-validation-forms.md        # RHF + Zod (register-first; Controller only for custom inputs)
    └── 06-hard-rules.md              # ★ enforceable rule set (Expo + CLI differences)
```

> **★ `06-hard-rules.md`** — the enforceable rules per stack. The `tlm-fe-coding` skill inlines the most
> critical ones so they hold without a file read; these files carry the full set plus the reasoning.
> The `tlm-fe-coding` skill detects which stack applies and routes here.

---

## 🎯 How to Use This Knowledge Base

### For New Projects

1. **Choose Your Router Pattern** — policy: **Page Router by default; App Router only when needed**
   (see the `tlm-fe-coding` skill → "Choosing the Next.js router"):
   - **Page Router (default)** — management / admin / internal apps. Stable, proven. Two deployment modes:
     **Mode A** static-export SPA (calls an external backend), or
     **Mode B** fullstack Next.js where the UI stays in Page Router and the API is App Router
     route handlers (`app/api/**/route.ts`) + Prisma (no SSR).
     See `page-router/05-fullstack-nextjs-api-prisma.md` for Mode B.
   - **App Router (only when needed)** — public, SEO-facing "publish" pages (marketing/landing/blog/docs),
     or when SSR/SSG/ISR, streaming, or Server Components/Actions are genuinely required.

2. **Read These in Order:**
   ```
   1. shared-fe/01-project-overview.md      (Tech stack & philosophy)
   2. [router]/01-architecture.md        (Framework-specific setup)
   3. shared-fe/02-styling-ui-conventions.md (UI patterns)
   4. shared-fe/03-component-patterns.md    (Component rules)
   5. [router]/03-api-data-flow.md       (Data fetching)
   6. shared-fe/05-validation-patterns.md   (Forms & validation)
   ```

3. **Reference As Needed:**
   - TypeScript patterns
   - Development setup
   - Migration guides

### For Existing Projects

**Identify Your Project Type:**

```bash
# Page Router indicators:
- Has src/pages/_app.tsx
- Uses getStaticProps/getServerSideProps
- Router from 'next/router'

# App Router indicators:
- Has src/app/ directory
- Uses async Server Components
- Router from 'next/navigation'
```

Then follow the appropriate `[router]/` folder rules.

---

## 🔑 Key Architectural Principles (All Projects)

### 1. Framework-Agnostic Business Logic

```
✅ CORRECT Structure:
src/
├── [routing-dir]/        # Next.js routing ONLY (pages/ or app/)
│   └── [route]/
│       └── index.tsx     # 5 lines max - imports Screen component
└── _modules/             # 100% portable business logic
    ├── _api/             # API clients
    ├── common/           # Shared components
    ├── pages/            # Screen components (ALL business logic)
    └── server/           # Server-side operations
```

**Why?** Easy migration between frameworks (App Router, Remix, Vite).

### 2. Component Hierarchy

```
Basic Components      → Col, Row, TextPrimary (structural)
  ↓
Base Components      → BaseButton, BaseInput (in-house primitives — Tailwind for web, StyleSheet for RN)
  ↓
Common Components    → Used across 3+ domains
  ↓
Domain Components    → BookForm, ProductCard (domain-specific)
  ↓
Screen Components    → HomeScreen, ProductDetailScreen (pages)
```

### 3. Navigation Rules (CRITICAL)

```tsx
// ✅ ALWAYS use Link component
import Link from 'next/link';

<Link href="/path" className="no-underline">
  <BaseButton as="span">Navigate</BaseButton>
</Link>

// ❌ NEVER use onClick navigation
<BaseButton onClick={() => router.push('/path')}>  // BAD
  Navigate
</BaseButton>
```

**Why?** Native browser behavior (Ctrl+Click, middle-click, prefetch).

### 4. Function Minimalism (YAGNI)

```tsx
// ✅ Inline anonymous functions
<BaseButton
  onClick={() => {
    // TODO: Create function if performance issues arise
    refModal.current?.onOpen(<ModalContent />);
  }}
>
  Edit
</BaseButton>

// ❌ Don't pre-optimize
const handleEdit = () => {  // Don't create this
  refModal.current?.onOpen(<ModalContent />);
};
```

---

## 📊 Page Router vs App Router Comparison

| Feature | Page Router | App Router |
|---------|-------------|------------|
| **Routing Location** | `src/pages/` | `src/app/` |
| **Data Fetching** | `useQuery` hooks | Server Components + `use` |
| **Server Logic** | API routes | Server Actions |
| **Navigation** | `next/router` | `next/navigation` |
| **Layout System** | `_app.tsx` | `layout.tsx` hierarchy |
| **Static Export** | ✅ Full support | ⚠️ Limited |
| **Maturity** | Stable | Evolving |
| **Learning Curve** | Lower | Higher |

---

## 🚀 Quick Start by Project Type

### Static E-Commerce Site (Page Router)
```bash
1. Read: shared-fe/01-project-overview.md
2. Read: page-router/01-architecture.md
3. Read: page-router/02-routing-structure.md
4. Start coding with shared-fe/03-component-patterns.md
```

### SSR Dashboard (App Router)
```bash
1. Read: shared-fe/01-project-overview.md
2. Read: app-router/01-architecture.md
3. Read: app-router/03-server-actions.md
4. Start coding with shared-fe/03-component-patterns.md
```

### Migrating Page Router → App Router
```bash
1. Read: page-router/04-migration-to-app-router.md
2. Follow step-by-step migration checklist
3. Reference app-router/ docs for new patterns
```

---

## 🛠️ Component Naming Conventions (CORRECTED)

### Basic Components (Structural)
```tsx
// Location: _modules/common/components/
Col.tsx              // Flex column wrapper
Row.tsx              // Flex row wrapper
TextPrimary.tsx      // Structural text component (standardized name — import common/components/TextPrimary)
Box.tsx              // Generic container
Stack.tsx            // Stacked elements
```

### Base Components (In-House Primitives — Tailwind for web, StyleSheet for RN)
```tsx
// Location: _modules/common/components/
BaseButton.tsx       // Extended Button
BaseInput.tsx        // Extended Input
BaseSelect.tsx       // Extended Select
BaseModal.tsx        // Extended Modal
```

### Domain Components (Business Logic)
```tsx
// Location: _modules/pages/[Domain]/components/
// Use DOMAIN PREFIX for clarity

BookForm.tsx         // Book creation/edit form
BookCard.tsx         // Book display card
ProductList.tsx      // Product listing component
OrderSummary.tsx     // Order summary display
```

### Screen Components (Page Logic)
```tsx
// Location: _modules/pages/[Domain]/
// Pattern: [Feature][Context]Screen.tsx

HomeIndexScreen.tsx        // Home page
ProductListScreen.tsx      // Product listing page
ProductDetailScreen.tsx    // Product detail page
AuthLoginScreen.tsx        // Login page
```

---

## 📝 File Naming Patterns

```
Components:     PascalCase.tsx        (ProductCard.tsx)
Utilities:      camelCase.ts          (utilsForm.ts)
Hooks:          camelCase.ts          (useAuth.ts)
Constants:      camelCase.ts          (routeLinks.ts)
API Clients:    camelCase.ts          (apiClientProduct.ts)
Types/Models:   PascalCase.ts         (ModelProduct.ts)
```

---

## 🎓 Learning Path

### Beginner
1. shared-fe/01-project-overview.md (tech stack)
2. [router]/01-architecture.md (folder structure)
3. shared-fe/02-styling-ui-conventions.md (Tailwind CSS)

### Intermediate
4. shared-fe/03-component-patterns.md (component rules)
5. [router]/03-api-data-flow.md (data fetching)
6. shared-fe/05-validation-patterns.md (forms)

### Advanced
7. [router]/03-server-actions.md (SSR patterns)
8. shared-fe/04-typescript-enums-constants.md (type safety)
9. [router]/04-migration-to-app-router.md (migrations)

---

## 🔍 Quick Reference Links

### Common Questions

- **Where do I put this component?** → shared-fe/03-component-patterns.md
- **How do I fetch data?** → [router]/03-api-data-flow.md
- **How do I style components?** → shared-fe/02-styling-ui-conventions.md
- **How do I validate forms?** → shared-fe/05-validation-patterns.md
- **How do I navigate?** → [router]/02-routing-structure.md
- **How should an AI/new contributor generate code here?** → shared-fe/07-ai-workflow-integration.md
- **How do I build a list with sort/filter/paging?** → shared-fe/09-data-listing.md
- **How do I render an image, or a photo preview?** → shared-fe/10-images-and-preview.md
- **The design only drew one width — what about mobile?** → shared-fe/11-responsive-defaults.md
- **Did I miss cursor / focus / hit targets?** → shared-fe/12-interactive-affordances.md
- **How do I show data that has no API yet?** → shared-fe/13-mock-data.md
- **Should I write an e2e test, and what does it assert?** → shared-fe/14-e2e-testing.md
- **No Figma, but the feature exists in another repo?** → skills/tlm-fe-coding STEP 1.5
- **How do I type/validate an API response?** → shared-fe/15-zod-contract-first.md
- **Second app (portal / mobile twin) — same repo or new one?** → shared-fe/16-monorepo-turborepo.md
- **Does the backend go in this Next.js app or is it a BFF?** → nextjs/00-backend-decision.md
- **How do I turn a user story / API spec into tasks?** → templates/input-processing-template.md
- **How do I normalize cURL/JSON into a spec?** → templates/requirement-summary-template.md

### Best Practices Checklist

- [ ] Component in correct folder (_modules structure)
- [ ] Using Link for navigation (not onClick)
- [ ] Domain components in domain folder (not common)
- [ ] Inline functions (not pre-optimized)
- [ ] Type-safe APIs with TypeScript
- [ ] Proper error handling with try-catch
- [ ] Loading states with TanStack Query
- [ ] Accessible markup with ARIA labels

---

## 📞 Support

For questions or clarifications:
1. Search this knowledge base using keywords
2. Check the specific router pattern docs
3. Review component pattern examples
4. Consult the migration guide if switching routers

---

## 🔄 Version History

- **v1.7** (2026-09): E2E, sibling-repo UI, and states that get clipped
  - New `shared-fe/14-e2e-testing.md` — Playwright. Every common page asserts **no undeclared 4xx or
    5xx**; endpoints that are supposed to refuse assert their **exact** status, because a swallowed
    403 gets diagnosed as a 502 outage. Seed the session, never drive the login form
  - New hook `hooks/e2e-watch.mjs` — fires on an edit to a page, layout, route handler or `*Screen`
    in a project that already has a suite, and asks whether the suite is now wrong. Silent otherwise
  - `tlm-fe-coding` STEP 1.7 — offer e2e **in the plan**, once; never after the code is written
  - `tlm-fe-coding` STEP 1.5 — when there is no Figma and a sibling repo already ships the screen, that
    UI is the design: match its information order, groupings and labels, but build it with THIS
    project's conventions. Authority runs Figma → sibling repo's shipped UI → the `09`–`13` defaults
  - `shared-fe/12` §4b — a hover, focus, visited or active state must not be clipped by an
    `overflow-hidden` ancestor, painted over by a neighbour, hidden under a sticky bar, or shift the
    layout by adding a border that was not there at rest

- **v1.6** (2026-09): Responsive, affordances, mock visibility, business context
  - New `shared-fe/11-responsive-defaults.md` — a design drawn at one width is built at that width
    AND must not break below it; mobile-first ordering, `flex-wrap` vs `auto-fit` grid, `min-w-0`,
    tables scroll rather than stack. Never a licence to invent a mobile design that exists in Figma
  - New `shared-fe/12-interactive-affordances.md` — Tailwind v4's Preflight sets `cursor: default`
    on `<button>`, so every pressable must ask for the pointer back; plus hover, `focus-visible`,
    disabled, WCAG 2.2 hit targets, and a six-step pass run with the screen open
  - New `shared-fe/13-mock-data.md` — mock is scoped to the field that has no endpoint, not the
    screen; badge in every environment; `grep -rn MOCK src/` finds every site
  - `tlm-fe-coding` STEP 1.6 — business understanding across the repos in `ecosystem-map.md`: draft
    first, ask 3–5 questions once, persist to `.claude/business-context.md`, recap one line per task
  - New `vendor/ECC-ADOPTION.md` — review of `everything-claude-code`: provenance, what overlaps,
    what conflicts, and why nothing was copied (the repo ships no LICENSE)

- **v1.5** (2026-09): Rules for frontend work with no design input
  - New `shared-fe/09-data-listing.md` — a listing is a `BaseTable`; the server sorts, filters and
    pages; `limit`/`offset` live in the URL verbatim; filters commit on Apply; four states, with
    filtered-empty as its own
  - New `shared-fe/10-images-and-preview.md` — a thumbnail opens a full-size preview; `BaseModal`
    owns the APG dialog contract once; images reserve their box and fail visibly
  - `tlm-figma-to-code` PHASE 0.5 — a Figma 429 is a wait, not a wall: honour `Retry-After`, full-jitter
    backoff, chunk by node id, cache to the scratchpad, and a bounded stop condition
  - Corrected two pagination examples that were still TanStack Query v4 (`keepPreviousData: true`
    → `placeholderData: keepPreviousData`) and used local state, raw grids and untranslated labels
  - `shared-fe/07-ai-workflow-integration.md` §9a/§9b/§9c — three passes to run AFTER the code works:
    pressable affordances (Tailwind v4 stopped giving `<button>` a pointer cursor; plus hover, focus
    ring, disabled cursor and a 24px hit target), no destructuring inside a function body (props and
    a hook's own return excepted), and mock data labelled `mock` on screen and `MOCK:` in the code

- **v1.0** (2024-01): Initial finalized knowledge base
  - Merged ai/ and docs/ folder rules
  - Separated Page Router and App Router patterns
  - Consolidated component naming conventions
  - Added migration guides
- **v1.1** (2026-08): Closed gaps from the original `resource/` source
  - Added `shared-fe/07-ai-workflow-integration.md` (AI/contributor operating manual:
    import ordering, generation templates, testing harness, code-review checklist)
  - Added `templates/` (input-processing + requirement-summary intake templates)
  - Added Link-compliant Global Navigation sections to both `02-routing-structure.md` files
- **v1.2** (2026-08): Added React Native (Expo) support
  - New `reactnative/` knowledge base (architecture, StyleSheet styling, Expo Router,
    AsyncStorage data flow, RHF+Zod forms) — corrected navigation to `router.navigate`
  - New `shared-fe/08-cross-platform-architecture.md` (web ↔ RN mapping; `_modules/` is portable to RN)
- **v1.3** (2026-08): Standardized the structural text component naming to `TextPrimary`
  - The Basic structural text component is `TextPrimary` (import `common/components/TextPrimary`);
    hierarchy is `Col`/`Row`/`TextPrimary`
  - Notifications standardized to the in-house `BaseToast.show({ title, color })`

---

**Last Updated**: August 2026
**Framework Versions**: Next.js 13-15, React 18-19, TypeScript 5+, React Native 0.79 / Expo ~53
