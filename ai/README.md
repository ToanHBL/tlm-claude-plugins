# Next.js Project Rules - Finalized Knowledge Base

## 📁 Folder Structure

This knowledge base is organized to support both Next.js routing patterns:

```
ai/
├── README.md                    # This file - navigation guide
├── shared/                      # Rules applicable to BOTH routing patterns
│   ├── 01-project-overview.md
│   ├── 02-styling-ui-conventions.md
│   ├── 03-component-patterns.md
│   ├── 04-typescript-enums-constants.md
│   ├── 05-validation-patterns.md
│   ├── 06-development-setup.md
│   ├── 07-ai-workflow-integration.md   # AI/contributor operating manual
│   └── 08-cross-platform-architecture.md # Web ↔ React Native mapping
├── templates/                   # Requirement-intake templates
│   ├── input-processing-template.md
│   └── requirement-summary-template.md
├── nextjs/
│   ├── page-router/             # Page Router specific rules (Next.js 12-15)
│   │   ├── 01-architecture.md            # Mode A: static-export SPA
│   │   ├── 02-routing-structure.md
│   │   ├── 03-api-data-flow.md           # Mode A: client → external backend
│   │   ├── 04-migration-to-app-router.md
│   │   └── 05-fullstack-nextjs-api-prisma.md  # Mode B: app/api/**/route.ts + Prisma backend
│   └── app-router/              # App Router specific rules (Next.js 13+)
│       ├── 01-architecture.md
│       ├── 02-routing-structure.md
│       ├── 03-server-actions.md
│       └── 04-data-fetching.md
└── reactnative/                 # React Native (Expo) specific rules
    ├── README.md
    ├── 01-architecture.md            # Expo stack, _modules, EAS build, state
    ├── 02-styling-stylesheet.md      # StyleSheet + theme constants, Moti
    ├── 03-navigation-expo-router.md  # Expo Router (navigate-not-push)
    ├── 04-data-and-storage.md        # baseFetch + AsyncStorage, TanStack Query
    └── 05-validation-forms.md        # RHF + Zod (register-first; Controller only for custom inputs)
```

---

## 🎯 How to Use This Knowledge Base

### For New Projects

1. **Choose Your Router Pattern** — policy: **Page Router by default; App Router only when needed**
   (see the `frontend-conventions` skill → "Choosing the Next.js router"):
   - **Page Router (default)** — management / admin / internal apps. Stable, proven. Two deployment modes:
     **Mode A** static-export SPA (calls an external backend), or
     **Mode B** fullstack Next.js where the UI stays in Page Router and the API is App Router
     route handlers (`app/api/**/route.ts`) + Prisma (no SSR).
     See `page-router/05-fullstack-nextjs-api-prisma.md` for Mode B.
   - **App Router (only when needed)** — public, SEO-facing "publish" pages (marketing/landing/blog/docs),
     or when SSR/SSG/ISR, streaming, or Server Components/Actions are genuinely required.

2. **Read These in Order:**
   ```
   1. shared/01-project-overview.md      (Tech stack & philosophy)
   2. [router]/01-architecture.md        (Framework-specific setup)
   3. shared/02-styling-ui-conventions.md (UI patterns)
   4. shared/03-component-patterns.md    (Component rules)
   5. [router]/03-api-data-flow.md       (Data fetching)
   6. shared/05-validation-patterns.md   (Forms & validation)
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
1. Read: shared/01-project-overview.md
2. Read: page-router/01-architecture.md
3. Read: page-router/02-routing-structure.md
4. Start coding with shared/03-component-patterns.md
```

### SSR Dashboard (App Router)
```bash
1. Read: shared/01-project-overview.md
2. Read: app-router/01-architecture.md
3. Read: app-router/03-server-actions.md
4. Start coding with shared/03-component-patterns.md
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
1. shared/01-project-overview.md (tech stack)
2. [router]/01-architecture.md (folder structure)
3. shared/02-styling-ui-conventions.md (Tailwind CSS)

### Intermediate
4. shared/03-component-patterns.md (component rules)
5. [router]/03-api-data-flow.md (data fetching)
6. shared/05-validation-patterns.md (forms)

### Advanced
7. [router]/03-server-actions.md (SSR patterns)
8. shared/04-typescript-enums-constants.md (type safety)
9. [router]/04-migration-to-app-router.md (migrations)

---

## 🔍 Quick Reference Links

### Common Questions

- **Where do I put this component?** → shared/03-component-patterns.md
- **How do I fetch data?** → [router]/03-api-data-flow.md
- **How do I style components?** → shared/02-styling-ui-conventions.md
- **How do I validate forms?** → shared/05-validation-patterns.md
- **How do I navigate?** → [router]/02-routing-structure.md
- **How should an AI/new contributor generate code here?** → shared/07-ai-workflow-integration.md
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

- **v1.0** (2024-01): Initial finalized knowledge base
  - Merged ai/ and docs/ folder rules
  - Separated Page Router and App Router patterns
  - Consolidated component naming conventions
  - Added migration guides
- **v1.1** (2026-08): Closed gaps from the original `resource/` source
  - Added `shared/07-ai-workflow-integration.md` (AI/contributor operating manual:
    import ordering, generation templates, testing harness, code-review checklist)
  - Added `templates/` (input-processing + requirement-summary intake templates)
  - Added Link-compliant Global Navigation sections to both `02-routing-structure.md` files
- **v1.2** (2026-08): Added React Native (Expo) support
  - New `reactnative/` knowledge base (architecture, StyleSheet styling, Expo Router,
    AsyncStorage data flow, RHF+Zod forms) — corrected navigation to `router.navigate`
  - New `shared/08-cross-platform-architecture.md` (web ↔ RN mapping; `_modules/` is portable to RN)
- **v1.3** (2026-08): Standardized the structural text component naming to `TextPrimary`
  - The Basic structural text component is `TextPrimary` (import `common/components/TextPrimary`);
    hierarchy is `Col`/`Row`/`TextPrimary`
  - Notifications standardized to the in-house `BaseToast.show({ title, color })`

---

**Last Updated**: August 2026
**Framework Versions**: Next.js 13-15, React 18-19, TypeScript 5+, React Native 0.79 / Expo ~53
