---
name: react-native-expo
description: Build and debug React Native apps with Expo Router — file-based routing in app/, Stack/Tabs navigators, router.navigate (spam-tap safe) vs push, useLocalSearchParams, and the _modules conventions adapted to RN primitives. Use when working in an Expo/React Native project, editing app/ screens or _layout.tsx, or wiring navigation.
---

# React Native + Expo Router

Applies the shared base (`frontend-conventions` skill) to **React Native with Expo Router**. Expo
Router is file-based routing (like Next.js) for native + web. Deep reference for the navigation rules:
this plugin's `expo-router` guidance below and the project rule files.

**First:** follow the `frontend-conventions` skill for architecture (`_modules/`), component hierarchy,
function minimalism, no `as any`, and i18n. The RN-specific differences are below.

## When this applies
Project uses `expo-router` / `expo`, has an `app/` dir with `_layout.tsx` using `Stack`/`Tabs`, or
imports from `expo-router` / `react-native`.

## 1. Navigation — `router.navigate`, NOT `router.push` (CRITICAL)

`router.push` **always** pushes a new screen on every call → rapid taps push the same screen twice
(the double-navigate bug: user must press back twice). `router.navigate` "pushes or unwinds to an
existing route" — if the target route+params is already current, the second call is a no-op, so it is
spam-tap safe by default.

```tsx
// ❌ Wrong — spam tap pushes the same screen twice
<Pressable onPress={() => router.push({ pathname: '/vehicle/[id]', params: { id } })} />

// ✅ Correct — second tap is a no-op, no duplicate screen
<Pressable onPress={() => router.navigate({ pathname: '/vehicle/[id]', params: { id } })} />
```

- `<Link>` (from `expo-router`) already behaves like `navigate` — do **not** add the `push` prop unless
  duplicate screens are intentional.
- Use `push` **only** when a new stack entry for the SAME route+params is the intended UX (e.g. drilling
  a chain of `/profile/[id]` → `/profile/[id]` where back must retrace every step).
- Be aware of `navigate`'s unwind: if the target already exists lower in the stack, it pops back to it
  instead of pushing a new instance — usually desired; verify flows where a fresh instance matters.
- `router.replace` — swap current screen (after login / redirects). `router.back()` — pop.

## 2. Read params with `useLocalSearchParams()`

```tsx
import { useLocalSearchParams } from 'expo-router';
const { id } = useLocalSearchParams<{ id: string }>();   // NOT useRoute().params
```

## 3. File-based routing (`app/`)

```
app/
├── _layout.tsx           # Root navigator (Stack or Tabs)
├── index.tsx             # "/"
├── (tabs)/
│   ├── _layout.tsx       # Tabs navigator
│   ├── index.tsx         # Home tab
│   └── explore.tsx       # Explore tab
├── (auth)/
│   ├── _layout.tsx       # Separate stack
│   └── login.tsx
└── vehicle/
    └── [id].tsx          # Dynamic route  → /vehicle/123
```

```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
    </Tabs>
  );
}
```

Route groups `(name)/` organize without affecting the URL. Modals via a `Stack.Screen` with
`options={{ presentation: 'modal' }}`.

## 4. RN primitives replace HTML/DOM components

The shared "never use raw HTML" rule maps to RN primitives. There is no `<div>`/`<p>`; the `Col`/`Row`/
`TextPrimary` abstraction is backed by RN:

| Web (Next.js) | React Native |
|---------------|--------------|
| `Col` / `Row` (flex `<div>`) | RN `View` wrappers (`Col`/`Row` built on `View`) |
| `TextPrimary` (renders `<p>/<span>`) | RN `Text` (`TextPrimary` built on RN `Text`) |
| `<button>` / in-house Base button (Tailwind) | `Pressable` / `TouchableOpacity` (Base* wrappers) |
| Tailwind classes | `StyleSheet.create` + theme constants (no NativeWind) |
| `Link` (next/link) | `Link` (expo-router) |

Keep the same layered hierarchy (Basic → Base → Common → Domain → Screen) in `_modules/`. Screens still
end in `Screen`; keep logic out of the `app/` routing files (thin wrappers importing a Screen).

```tsx
// app/vehicle/[id].tsx — thin
import VehicleDetailScreen from '@/_modules/pages/Vehicle/VehicleDetailScreen';
import { useLocalSearchParams } from 'expo-router';
export default function Page() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <VehicleDetailScreen id={id} />;
}
```

## 5. Data, forms, TypeScript

- Server state: TanStack Query + `apiClient[Domain].ts` hooks (same pattern as web).
- Forms: React Hook Form + Zod via `UtilsForm.computeRules` (in-house `Base*` RN inputs). Default to
  `register` (+ `setValue` through the in-house `BaseInput`); use `Controller` only for custom
  controlled inputs (e.g. an OTP field).
- Function minimalism, no `as any`, i18n via i18next — all from the shared base.

## 6. Preferred libraries

Build our own `Base*`/`Common` components; minimize external UI deps. When a native capability is
needed, prefer these vetted libraries over alternatives:

- `react-native-safe-area-context` — safe-area insets
- `@react-native-async-storage/async-storage` — persistence
- `expo-splash-screen`, `expo-status-bar` — app chrome
- `react-native-otp-entry` — OTP input (the custom-controlled `Controller` case above)
- `react-native-svg` — vector graphics
- `expo-router` — file-based navigation (already the routing base)

## Checklist
- [ ] User-tap navigation uses `router.navigate` / default `<Link>`, never `push` (unless intentional dupes)
- [ ] Params via `useLocalSearchParams()`
- [ ] `app/` files thin; logic in `_modules/pages/…Screen`
- [ ] RN primitives (`View`/`Text`/`Pressable`) via the `Col`/`Row`/`TextPrimary`/`Base*` wrappers, no raw styles scattered
- [ ] Shared base rules from `frontend-conventions` applied
