# Rules Comparison Overview: AI vs Docs

## Executive Summary

Both `ai/` and `docs/` folders contain similar Next.js 15 project documentation with **95% content overlap**. The key difference lies in **architectural emphasis** and **documentation purpose**.

---

## Major Architectural Differences

### 1. **Framework-Agnostic Architecture** (AI folder ONLY)

**AI Folder** emphasizes a critical architectural pattern missing in docs:

- **`_modules/` folder** explicitly designed to be 100% framework-agnostic
- Can migrate to App Router, Remix, Vite without touching business logic
- **Pages directory** restricted to ONLY 5-line routing files
- ALL business logic lives in `_modules/pages/[ScreenName]Screen.tsx`

```tsx
// AI: Strict 5-line max routing
import ProductDetailScreen from '@/_modules/pages/Product/ProductDetailScreen';

export default function Page() {
  return <ProductDetailScreen />;
}

// Docs: No such restriction mentioned
```

**Impact**: This makes the AI folder rules more suitable for long-term maintainability and framework migrations.

---

### 2. **Server Actions Layer** (AI folder ONLY)

**AI Folder** introduces a complete server actions architecture:

```
_modules/
├── _api/              # React Query hooks (client-side)
└── server/
    └── actions/       # Server actions (Next.js App Router ready)
```

- Explicitly separates server-side operations from client-side hooks
- Provides migration guide for different frameworks (Remix, Express, etc.)
- Ready for Next.js App Router pattern with 'use server' directive

**Docs Folder** has simpler structure without server actions layer.

**Impact**: AI folder is better prepared for modern Next.js patterns and SSR requirements.

---

### 3. **Navigation Philosophy** (Critical Difference)

**AI Folder** has extensive Link-based navigation rules (300+ lines):

- **CRITICAL RULE**: ALWAYS use Next.js `Link` component
- NEVER use `onClick` with `router.push()`
- Detailed benefits: middle-click support, prefetching, accessibility
- Complete NavLink component implementation
- Mobile menu patterns, dropdown patterns
- 10-item testing checklist for navigation

**Docs Folder** allows programmatic navigation with `router.push()` freely.

**Impact**: AI folder enforces better UX and performance through native browser behavior.

---

### 4. **Component Location Rules** (AI folder more strict)

**AI Folder** has stricter component organization:

- Screen components MUST live in `_modules/pages/[ScreenName]/components/`
- NEVER create domain components in `common/components/`
- Abstract naming within domain context (e.g., `Form.tsx` instead of `BookForm.tsx`)

**Docs Folder** is more lenient about component placement.

---

### 5. **Form Validation Enhancement** (AI folder ONLY)

**AI Folder** has expanded `UtilsForm.computeRules` with number validation:

```tsx
// AI: Enhanced with number/integer validation
{...register('userId', UtilsForm.computeRules('User ID', {
  isInteger: true,  // NEW
  min: 1,           // NEW
  max: 1000         // NEW
}))}
```

**Docs Folder** only supports string validation (minLength, maxLength, pattern).

---

## Minor Differences

### 6. **Text Component Naming**
- **AI**: `TextPrimary` (consistent with current codebase)
- **Docs**: `TextPrimaryV1` (versioned naming)

### 7. **Module Path Reference**
- **AI**: `@/_modules/` (underscore prefix)
- **Docs**: `@/modules/` (no underscore)

### 8. **Styling Documentation**
- **Docs**: More extensive navigation styling section (600+ lines vs 300)
- Includes complete Link styling guide, accessibility patterns

### 9. **AI Workflow Integration** (Docs ONLY)
- File: `07-ai-workflow-integration.md`
- Documentation on using AI tools with the codebase
- **Not present** in AI folder

---

## Recommended Actions

### Option 1: Merge with AI Folder as Base ✅ RECOMMENDED

**Keep from AI folder:**
1. Framework-agnostic architecture emphasis
2. Server actions layer structure
3. Strict navigation rules (Link-based only)
4. Strict component location rules
5. Enhanced form validation with numbers

**Add from Docs folder:**
1. Extensive navigation styling guide (merge into AI's styling doc)
2. AI workflow integration document (new file)

### Option 2: Keep Both (Not Recommended)
- Leads to confusion about which rules to follow
- Inconsistent enforcement between AI and human developers

---

## Key Statistics

| Metric | AI Folder | Docs Folder |
|--------|-----------|-------------|
| Total Files | 10 | 7 |
| Unique Concepts | 3 major | 1 major |
| Navigation Rules | Strict (Link-only) | Flexible |
| Architecture Depth | Framework-agnostic | Standard Next.js |
| Form Validation | String + Number | String only |
| Line Count (approx) | ~6,500 | ~5,200 |

---

## Migration Path

1. **Immediate**: Use AI folder rules as primary reference
2. **Week 1**: Merge navigation styling content from docs into AI folder
3. **Week 2**: Add AI workflow integration doc to AI folder
4. **Week 3**: Archive or remove docs folder to avoid confusion
5. **Ongoing**: Maintain single source of truth in AI folder

---

## Conclusion

**AI folder rules are more comprehensive** with:
- Better long-term architecture (framework-agnostic)
- Stricter conventions (Link navigation, component placement)
- Enhanced features (number validation, server actions)

**Docs folder** has valuable **navigation styling content** that should be merged into AI folder's styling documentation.

**Final Recommendation**: Consolidate into AI folder as primary rules, augment with docs styling content, then archive docs folder.
