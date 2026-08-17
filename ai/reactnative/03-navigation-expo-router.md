# RN Navigation — Expo Router

Expo Router is file-based routing built into Expo SDK 50+ (works like Next.js App Router: files in
`app/` become routes). No extra install.

## Routing layer is thin

`app/` files contain **only** routing config. All business logic lives in `_modules/screens/`.

```tsx
// app/product/[id].tsx — ROUTING ONLY
import ProductDetailScreen from '../../_modules/screens/ProductDetail/ProductDetailScreen';
export default function Page() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ProductDetailScreen id={id} />;
}
```

```tsx
// _modules/screens/ProductDetail/ProductDetailScreen.tsx — ALL BUSINESS LOGIC
export default function ProductDetailScreen({ id }: { id: string }) {
  // hooks, state, logic here
}
```

## File structure

```
app/
├── _layout.tsx          # Root layout — providers, theme, nav chrome
├── index.tsx            # "/" → Home
├── (tabs)/              # Tab group (parentheses = no URL segment)
│   ├── _layout.tsx      # Tab navigator
│   ├── index.tsx        # first tab
│   └── profile.tsx      # "/profile"
├── product/
│   ├── index.tsx        # "/product"
│   └── [id].tsx         # "/product/123"
└── (auth)/
    ├── sign-in.tsx      # "/sign-in"
    └── sign-up.tsx      # "/sign-up"
```

## Navigation — use `router.navigate`, NOT `router.push` (CRITICAL)

`router.push` **always** pushes a new screen on every call → rapid taps push the same screen twice
(double-navigate bug; user must press back twice). `router.navigate` "pushes or unwinds to an existing
route": if the target route+params is already current, the second call is a no-op → spam-tap safe.

```tsx
import { router, useRouter, useLocalSearchParams, Link } from 'expo-router';

// ✅ CORRECT — spam-tap safe
router.navigate({ pathname: '/product/[id]', params: { id: item.id } });
router.navigate('/home');

// ❌ WRONG — pushes a duplicate screen on every tap
router.push({ pathname: '/product/[id]', params: { id: item.id } });

// Other methods (unchanged semantics)
router.replace('/home');   // swap current screen (after login / redirects)
router.back();             // pop
```

- **`<Link>` already behaves like `navigate`** — do NOT add the `push` prop unless duplicate screens
  are intentional.
  ```tsx
  <Link href="/home">Go Home</Link>
  <Link href={{ pathname: '/product/[id]', params: { id: '123' } }}>View Product</Link>
  ```
- Use `push` **only** when a new stack entry for the SAME route+params is the intended UX (e.g. drilling
  `/profile/[id]` → `/profile/[id]` where back must retrace every step).
- Be aware of `navigate`'s unwind: if the target already exists lower in the stack, it pops back to it
  instead of pushing a fresh instance — usually desired; verify flows where a new instance matters.

> This corrects the raw source rules, which used `router.push` freely. It matches the shared
> `expo-router` navigation rule and `06-hard-rules.md` in this folder.

## Read params — `useLocalSearchParams`

```tsx
const { id } = useLocalSearchParams<{ id: string }>();        // replaces useRoute().params
const { category, sortBy } = useLocalSearchParams<{ category?: string; sortBy?: string }>();
router.setParams({ category: 'electronics' });                // write params (no navigation) — replaces nuqs
```

## Root layout with providers

```tsx
// app/_layout.tsx — the single place to mount providers
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../_modules/common/context/AuthContext';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 20000 } } });

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Stack>
          <Stack.Screen name="index"          options={{ title: 'Home' }} />
          <Stack.Screen name="product/[id]"   options={{ title: 'Product' }} />
          <Stack.Screen name="(auth)/sign-in" options={{ headerShown: false }} />
        </Stack>
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

## Tab navigation

```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index"   options={{ title: 'Home',    tabBarIcon: ({ color }) => <Ionicons name="home"   color={color} size={24} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <Ionicons name="person" color={color} size={24} /> }} />
    </Tabs>
  );
}
```

## Route constants — never hardcode paths

```ts
// _modules/values/routes.ts
export const Routes = {
  HOME: '/', SIGN_IN: '/(auth)/sign-in',
  PRODUCT_LIST: '/product', PRODUCT_DETAIL: '/product/[id]', PROFILE: '/(tabs)/profile',
} as const;

router.navigate(Routes.SIGN_IN);
router.navigate({ pathname: Routes.PRODUCT_DETAIL, params: { id: item.id } });
```

## Active route detection

```tsx
import { usePathname } from 'expo-router';
const pathname = usePathname();
const isActive = pathname === '/home';
```

## Best practices
1. `app/` files — routing only; import the Screen and return it.
2. `_modules/screens/` — all business logic, hooks, state.
3. `router.navigate` (not `push`) for user-triggered nav; `<Link>` for declarative nav.
4. `useLocalSearchParams` replaces `useRoute().params` and `nuqs`.
5. Mount providers once in `app/_layout.tsx`.
6. Route constants in `_modules/values/routes.ts`.
