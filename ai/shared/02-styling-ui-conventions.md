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
