# Styling & UI Library Conventions

## CSS Architecture

### 1. Tailwind CSS Configuration
```typescript
// tailwind.config.ts
export default {
  content: ['./src/**/*.{html,js,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
    },
  },
  darkMode: 'class',
  plugins: [],
}
```

### 2. Theme Colors (Tailwind)
Define the design tokens directly in `theme.extend` so every in-house primitive and utility class can
reference them:
```typescript
// tailwind.config.ts — theme.extend
theme: {
  extend: {
    borderRadius: {
      small: '0.375rem',
      medium: '0.75rem',
    },
    fontSize: {
      tiny: '0.625rem',
      small: '0.75rem',
      medium: '1rem',
      large: '1.25rem',
    },
    colors: {
      background: '#FFFFFF',
      foreground: '#25262B',
      primary: {
        DEFAULT: '#33669A',
        foreground: '#FFFFFF',
      },
      secondary: {
        DEFAULT: '#5C5F66',
      },
      custom: {
        white: '#ffffff',
        728: '#728FB6',
        ced: '#CED4DA',
        336: '#33669A',
        // ... more custom colors
      },
    },
  },
}
```

### 3. Tailwind CSS v4 — CSS-first tokens (`@theme`)

On Tailwind v4 projects there is no `tailwind.config.ts` — design tokens live in
the global stylesheet via `@theme`, and every token automatically becomes a
utility class:

```css
/* globals.css */
@import "tailwindcss";

@theme {
  /* Semantic tokens — every entry becomes bg-*/text-*/border-* classes */
  --color-accent: #0075ff;   /* primary buttons, active nav, links */
  --color-title: #1a1f36;    /* page + section titles */
  --color-body: #30313d;     /* body / cell text */
  --color-hairline: #ebeef1; /* row dividers — the default border */

  --radius-badge: 6px;
  --radius-callout: 10px;
}
```

Prefer **semantic names** (`accent`, `title`, `hairline`) over raw palette
names so a rebrand is a token edit, not a codebase sweep. An alternative when
adopting a design system over an existing codebase: **remap a stock palette**
(e.g. redefine `--color-zinc-*` to the brand's neutrals) so every existing
`zinc-*` class inherits the new system with zero component changes.

### 4. Never hardcode hex in components (CRITICAL)

Components reference tokens only — `bg-accent`, `text-title`,
`border-hairline` (or the project's palette classes). A raw hex value in a
component (`bg-[#0075ff]`, inline styles) bypasses the design system and
breaks theming/rebranding. New colors are a **token change** in the style
guide, never a per-component decision.

## Component Styling Patterns

### 1. Base Component Variants
All Base components are in-house primitives styled with Tailwind CSS. Encapsulate variants with a small
class map (e.g. via `clsx`/`cn`), keeping `primary`/`md` as the defaults:

```tsx
// BaseButton.tsx — in-house primitive styled with Tailwind CSS
const colorClasses = {
  secondary: 'bg-transparent text-secondary',
  primary: 'bg-primary text-white',
  white: 'bg-white text-primary',
};
const variantClasses = {
  bordered: 'bg-transparent border-1 border-primary text-primary',
  light: 'bg-transparent border-none !min-w-1 !px-0 text-primary',
  shaded: 'shadow-sm border-secondary bg-transparent text-secondary',
};
const sizeClasses = {
  md: 'text-md px-3 rounded-small',
  lg: 'text-2xl px-8 py-8 rounded-small',
  xl: 'py-6 px-6 text-xl font-bold rounded-small',
};

export default function BaseButton({
  color = 'primary',
  variant,
  size = 'md',
  className,
  ...props
}: BaseButtonProps) {
  return (
    <button
      className={`${colorClasses[color]} ${variant ? variantClasses[variant] : ''} ${sizeClasses[size]} ${className || ''}`}
      {...props}
    />
  );
}
```

### 2. Input Component Pattern
```tsx
// BaseInput.tsx — in-house primitive styled with Tailwind CSS
const inputColorClasses = {
  primary: 'indent-[1rem] focus:text-secondary text-medium placeholder:text-custom-adb',
};
const inputSizeClasses = {
  md: 'p-0 h-[2.375rem] rounded-md',
};

export default function BaseInput({
  color = 'primary',
  size = 'md',
  className,
  ...props
}: BaseInputProps) {
  return (
    <input
      className={`mt-0 ${inputColorClasses[color]} ${inputSizeClasses[size]} ${className || ''}`}
      {...props}
    />
  );
}
```

## Global CSS Patterns

### 1. Responsive Scaling
```css
/* globals.css */
html {
  font-size: calc(var(--scale-width) * 16px);
}

:root {
  --scale-width: 1;
  --scroll-bar-width: 0;
}
```

### 2. Component-Specific Classes
```css
/* Swiper Customization */
.swiper-slide {
  display: flex !important;
  flex-direction: column;
  align-items: stretch;
  height: auto !important;
}

.swiper-button-prev,
.swiper-button-next {
  width: 1.4rem;
  height: 2rem;
  color: hsl(var(--custom-adb)) !important;
}

/* Pagination Bullets */
.sliderDefault .swiper-pagination-bullet.swiper-pagination-bullet-active {
  background-color: hsl(var(--color-primary));
}
```

### 3. Utility Classes
```css
/* Icons */
.icon24 {
  width: 1.5rem;
  height: 1.5rem;
}

/* Text Effects */
.heading-text-shadow {
  text-shadow: 0 2px 3px rgba(0, 0, 0, 0.4);
}

/* Custom Borders */
.diagonal-line {
  background: linear-gradient(to top left,
      transparent calc(50% - 1px),
      black,
      transparent calc(50% + 1px));
}
```

## Layout & Spacing Conventions

### 1. Container Padding
```tsx
// LayoutDefault.tsx - Responsive padding pattern (existing implementation)
// Note: For new components, prefer Col instead of raw div
<Header className="px-2 lg:px-[9.531rem] h-[6rem]" />
<div className="px-2 sm:px-2 lg:px-[9.531rem] flex flex-col flex-1">
  {children}
</div>
<Footer className="px-0 lg:px-[9.531rem] pt-[3.75rem] pb-[1.875rem]" />
```

### 2. Responsive Breakpoints
- **Mobile**: `< 640px` (sm breakpoint)
- **Tablet**: `640px - 1024px`
- **Desktop**: `> 1024px` (lg breakpoint)
- **Large Desktop**: Custom scaling at 1920px base width

### 3. Spacing Scale
- **Small**: `0.375rem` (6px)
- **Medium**: `0.75rem` (12px)
- **Large**: `1.5rem` (24px)
- **XLarge**: `3rem` (48px)

## Asset Management

### 1. SVG Handling
```typescript
// next.config.ts - SVG as React components
webpack(config) {
  config.module.rules.push(
    // SVG with ?url suffix = file URL
    {
      test: /\.svg$/i,
      resourceQuery: /url/,
    },
    // SVG without suffix = React component
    {
      test: /\.svg$/i,
      resourceQuery: { not: [/url/] },
      use: ['@svgr/webpack'],
    },
  );
}
```

### 2. Asset Export Pattern
```typescript
// src/modules/assets/index.ts
import IcArrowDownSvg from './svg/ic_arrow_down.svg';
import imgBgBrandSrc from './svg/img_bg_brand.svg?url';
import LogoSvg from './svg/logo.svg';

export {
  IcArrowDownSvg,    // React component
  imgBgBrandSrc,     // URL string
  LogoSvg,           // React component
};
```

## Animation & Transitions

### 1. Framer Motion Integration
```tsx
// Used in modal and page transitions
import { motion } from 'framer-motion';
```

### 2. CSS Transitions
```css
/* Body transitions for font scaling */
body {
  transition-[font-size] duration-[font-size]-1000 ease-in-out;
}

/* Loading states */
.transition-delay-150 {
  transition-delay: 150ms;
}
```

## Print Styles
```css
@media print {
  html,
  body {
    height: 100vh;
    padding: 10px;
    font-size: 12px;
  }
}
```

## Conditional UI — Avoid Layout Flicker

Blocks that appear and disappear **in the middle** of a layout (error banners, validation messages,
hints, badges) must NOT be conditionally mounted and unmounted as a whole. Mounting/unmounting changes
the container height, which shifts every component below it — a visible flicker/jump on every keystroke
or refetch.

**Instead: always render the container** with space reserved via `min-height`, and conditionally render
only the **content inside**. Hide the decoration (background/border) with a transparent style when
inactive — do not remove it from the tree.

```tsx
// ❌ Mount/unmount toggles layout height → flicker, everything below jumps
{formError ? (
  <Row className="items-center gap-2 rounded-md bg-danger-50 px-3 py-2" role="alert">
    <IconWarning className="size-4 text-danger" />
    <TextPrimary className="text-sm text-danger">{formError}</TextPrimary>
  </Row>
) : null}

// ✅ Container always occupies space; only the inner content toggles
<Row
  role="alert"
  className={`min-h-11 items-center gap-2 rounded-md px-3 py-2 ${
    formError ? 'bg-danger-50' : 'bg-transparent'
  }`}
>
  {formError && <IconWarning className="size-4 text-danger" />}
  {formError && <TextPrimary className="text-sm text-danger">{formError}</TextPrimary>}
</Row>
```

- Use **`min-height`**, not a fixed `height`, so multi-line content can still grow. Size the reserve for
  the common case; very long text may still shift.
- The reserved height is a **token-backed class** (`min-h-11`), never a hardcoded inline pixel value —
  same rule as colors.
- **React Native:** same pattern, with `minHeight: scale(45)` in the `StyleSheet` and a
  `backgroundColor: 'transparent'` override when inactive. See `ai/reactnative/02-styling-stylesheet.md`.
- **Exception:** a block at the **end** of a layout (nothing below it to push) can be conditionally
  rendered normally — reserving space is unnecessary there.

## Display Strings — Null-Safe Composition

Values coming from an API, an optional field, or user input are rendered constantly, and any of them
can be `null`, `undefined`, or the *string* `"null"`. Raw template literals leak those straight into the
UI (`"Heading null"`, `"· updated"`). Two helpers own this; every project should have them in its
shared utils (`_modules/common/utils/`).

```ts
import { safeString, joinWith } from '@/_modules/common/utils/utilsString';
```

| Helper | Behavior | Use for |
|--------|----------|---------|
| `safeString(value)` | Renders `''` for `null` / `undefined` / `'null'` / `'undefined'` | Any single dynamic value rendered in the UI |
| `joinText(...parts)` | Drops empty parts, joins with a **space** | Space-joined fragments, no separator |
| `joinWith(sep, ...parts)` | Drops empty parts, joins with `sep` **padded by spaces** | Multi-segment strings with a `·` / `—` / `/` separator |

Both helpers already run every argument through `safeString`, so pass raw values — do not pre-wrap them.

### 1. Wrap every dynamic value

```tsx
// ❌ Raw interpolation can print "null" or "undefined" to the user
<TextPrimary>{vehicle.heading}</TextPrimary>

// ✅
<TextPrimary>{safeString(vehicle.heading)}</TextPrimary>
```

### 2. Never hardcode a separator — and never pass it positionally

A separator between values must come from `joinWith`. Hardcoding it in a template literal or as a JSX
text node means the separator survives when its neighbour is empty, leaving a dangling `"· updated"`.
Passing it *positionally* to `joinText` is the same bug: `joinText` filters the empty neighbour but
keeps the separator argument.

```tsx
// ❌ Separator hardcoded in a template literal
`${safeString(v.registrationNumber)} · ${vehicleLabel(v)}`
// ❌ Separator as a literal JSX text node between expressions
<TextPrimary>{safeString(v.registrationNumber)} · {vehicleLabel(v)}</TextPrimary>
// ❌ Separator as a POSITIONAL joinText argument — dangles when a part is empty
joinText(suburb, '·', updated)          // suburb === '' → "· updated"

// ✅ joinWith owns the separator and drops it along with the missing part
<TextPrimary>{joinWith('·', v.registrationNumber, vehicleLabel(v))}</TextPrimary>
const locationLine = joinWith('·', suburb, updated);   // suburb === '' → "updated"
```

Pass just the operator (`'·'`), not a pre-spaced `' · '` — `joinWith` adds the padding.

### 3. No nested ternaries inside template literals

```ts
// ❌ Unreadable, and every branch is a separate null-safety hole
const sub = `${status === 'moving' ? 'Heading ' + heading : status === 'idle' ? 'Idle' : 'Parked'} · updated ${ageLabel(ts)}`;

// ✅ Flat, null-safe, each branch a single joinWith call
const updated = joinText(t('updated'), ageLabel(ts));
const sub =
  vehicle.status === EVehicleStatus.MOVING
    ? joinWith('·', t('heading'), vehicle.heading, `${vehicle.speedKmh} km/h`, updated)
    : joinWith('·', statusText(vehicle.status), updated);
```

Mapping an enum to a label is a `Record<EnumType, T>` lookup, never a ternary chain — see
`ai/shared-fe/04-typescript-enums-constants.md`.

### 4. Template literals are still fine for a single guaranteed value

`` `${count} items` `` and `` `${Math.round(v.speed)} km/h` `` are correct — the value is always
present. Such a template can itself be one argument to `joinText` / `joinWith`.

### 5. Don't create single-use boolean variables

```ts
// ❌ Indirection for one comparison
const isMoving = vehicle.status === EVehicleStatus.MOVING;
label={isMoving ? t('moving') : t('parked')}

// ✅ Use the comparison directly
label={vehicle.status === EVehicleStatus.MOVING ? t('moving') : t('parked')}
```

Remember all display strings still go through `t()` (i18next) — `safeString` / `joinWith` compose the
**translated** fragments, they do not replace i18n.

## Navigation & Link Styling

### 1. Link Components Pattern

**CRITICAL RULE**: Always use Next.js `Link` component for navigation, NOT `onClick` handlers with `router.push()`.

**Router-Specific Note**: Link component implementation differs between Page Router and App Router. See router-specific folders for details.

#### ✅ CORRECT: Link with Button Styling
```tsx
import Link from 'next/link';

<Link href="/path" className="no-underline">
  <BaseButton as="span" color="primary">
    Navigate
  </BaseButton>
</Link>
```

#### ❌ WRONG: onClick Navigation
```tsx
// DON'T DO THIS - Prevents opening in new tabs
<BaseButton onClick={() => router.push('/path')}>
  Navigate
</BaseButton>
```

### 2. NavLink Component

Use the `NavLink` component for navigation menu items:

```tsx
// src/_modules/common/components/NavLink.tsx
import NavLink from '@/_modules/common/components/NavLink';

<NavLink href="/home" label="Home" />
<NavLink href="/about" label="About" isActive={true} />
```

**Props:**
- `href` - Link destination (required)
- `label` - Button text (required)
- `variant` - Button variant (optional, default: 'light')
- `size` - Button size (optional, default: 'md')
- `className` - Additional classes (optional)
- `isActive` - Force active state (optional, auto-detected by default)

### 3. Link Styling Rules

#### Remove Underlines
Always add `no-underline` class to Link components:

```tsx
<Link href="/path" className="no-underline">
  <BaseButton as="span">Text</BaseButton>
</Link>
```

#### Button as Span
When wrapping buttons with Link, use `as="span"` to avoid nested interactive elements:

```tsx
// ✅ CORRECT
<Link href="/path">
  <BaseButton as="span">Text</BaseButton>
</Link>

// ❌ WRONG - Creates nested buttons
<Link href="/path">
  <BaseButton>Text</BaseButton>
</Link>
```

#### Hover States
Links inherit hover states from wrapped components:

```tsx
<Link href="/path" className="no-underline">
  <BaseButton
    as="span"
    className="hover:bg-blue-500 transition-colors"
  >
    Hover Me
  </BaseButton>
</Link>
```

### 4. Navigation Component Patterns

#### Global Navigation Bar
```tsx
// Sticky navigation with gradient
<nav className="sticky top-0 z-50 bg-gradient-to-r from-blue-600 to-blue-700">
  <div className="flex items-center justify-between px-6 py-3">
    <Link href="/" className="flex items-center gap-3">
      <Logo />
    </Link>
    <div className="flex items-center gap-2">
      <NavLink href="/" label="Home" />
      <NavLink href="/docs" label="Docs" />
    </div>
  </div>
</nav>
```

#### Dropdown Menu Links
```tsx
<div className="absolute bg-white rounded-lg shadow-xl">
  {items.map(item => (
    <Link
      key={item.id}
      href={item.path}
      onClick={() => setDropdownOpen(false)}
      className="no-underline"
    >
      <BaseButton as="span" size="sm">
        {item.label}
      </BaseButton>
    </Link>
  ))}
</div>
```

#### Mobile Menu
```tsx
<div className="md:hidden">
  {menuItems.map(item => (
    <Link
      key={item.path}
      href={item.path}
      onClick={() => setMenuOpen(false)}
      className="block px-6 py-4 no-underline hover:bg-gray-100"
    >
      <TextPrimary text={item.label} />
    </Link>
  ))}
</div>
```

### 5. Active Link Styling

#### Using usePathname for Active State

**Router-Specific Note**: `usePathname` usage differs between Page Router and App Router. See router-specific folders for implementation details.

```tsx
// Example pattern (router-specific implementation varies)
import { usePathname } from 'next/navigation'; // or next/router

function NavItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link href={href} className="no-underline">
      <BaseButton
        as="span"
        variant={isActive ? 'solid' : 'light'}
        color={isActive ? 'primary' : undefined}
        className={isActive ? '' : 'text-gray-600 hover:text-gray-900'}
      >
        {label}
      </BaseButton>
    </Link>
  );
}
```

#### Active Indicators
```tsx
// Border highlight
<Link
  href="/path"
  className={`no-underline ${
    isActive ? 'border-l-4 border-blue-500' : 'border-l-4 border-transparent'
  }`}
>
  <span>Item</span>
</Link>

// Background highlight
<Link
  href="/path"
  className={`no-underline ${
    isActive ? 'bg-blue-100' : 'hover:bg-gray-50'
  }`}
>
  <span>Item</span>
</Link>
```

### 6. Link Prefetching

Next.js automatically prefetches links in the viewport. Control this behavior:

```tsx
// Disable prefetch for rarely used links
<Link href="/admin" prefetch={false}>
  <BaseButton as="span">Admin</BaseButton>
</Link>

// Enable prefetch (default behavior)
<Link href="/home" prefetch={true}>
  <BaseButton as="span">Home</BaseButton>
</Link>
```

### 7. External Links

For external links, use proper attributes:

```tsx
<Link
  href="https://example.com"
  target="_blank"
  rel="noopener noreferrer"
  className="no-underline"
>
  <BaseButton as="span" variant="bordered">
    External Site
  </BaseButton>
</Link>
```

### 8. Accessibility for Links

#### Focus Indicators
```tsx
<Link
  href="/path"
  className="no-underline focus:outline-2 focus:outline-offset-2 focus:outline-blue-500"
>
  <BaseButton as="span">Accessible</BaseButton>
</Link>
```

#### ARIA Labels
```tsx
<Link
  href="/delete"
  aria-label="Delete item permanently"
  className="no-underline"
>
  <BaseButton as="span" color="danger">
    Delete
  </BaseButton>
</Link>
```

### 9. Why Links Over onClick

**Benefits of Link Components:**

1. **User Experience**
   - Middle-click opens in new tab
   - Ctrl+Click opens in new tab
   - Right-click shows context menu
   - Browser back/forward works correctly

2. **Performance**
   - Automatic prefetching
   - Faster perceived navigation
   - Better code splitting

3. **Accessibility**
   - Screen readers announce as links
   - Keyboard navigation (Tab key)
   - Standard web conventions

4. **SEO**
   - Crawlable navigation
   - Proper link structure
   - Better indexing

**When onClick is Acceptable:**
- Modal open/close (not navigation)
- Dropdown toggle (not navigation)
- Form submission with validation
- Custom logic before navigation (with `e.preventDefault()`)

### 10. Link Testing Checklist

Before committing navigation code, verify:

- [ ] Uses Next.js `Link` component
- [ ] Has `no-underline` class
- [ ] Button uses `as="span"` prop
- [ ] Works with middle-click (new tab)
- [ ] Works with Ctrl+Click (new tab)
- [ ] Right-click menu appears
- [ ] URL preview shows on hover
- [ ] Active state styling works
- [ ] Mobile tap works normally
- [ ] Keyboard Tab navigation works
- [ ] Focus indicators visible

## Best Practices

### 1. Color Usage
- Use Tailwind theme colors (via utility classes / CSS variables)
- Custom colors defined in `tailwind.config.ts` theme extension
- Consistent color naming convention (primary, secondary, custom-*)

### 2. Component Variants
- Always provide sensible defaults for each variant prop (e.g. `primary` / `md`)
- Use descriptive variant names (bordered, light, shaded)
- Group related styling into shared Tailwind class maps

### 3. Responsive Design
- Mobile-first approach with Tailwind
- Use consistent breakpoint names (sm, md, lg)
- Implement responsive padding/margins consistently

### 4. Performance
- Unoptimized images for static export
- CSS-in-JS avoided in favor of Tailwind classes
- Minimal custom CSS outside of component-specific needs
- Use Link components for automatic prefetching

### 5. Navigation
- **Always use Link components** for navigation (never onClick with router.push)
- Remove underlines with `no-underline` class
- Use `as="span"` on buttons inside links
- Leverage automatic prefetching for better performance
- Test new tab functionality (Ctrl+Click, middle-click)
