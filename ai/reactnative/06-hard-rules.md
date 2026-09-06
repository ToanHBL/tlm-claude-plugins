# React Native — Hard Rules

The enforceable rules for React Native. The `tlm-fe-coding` skill inlines the top few; this file is the full
set. Deep detail: `01-architecture`, `02-styling-stylesheet`, `03-navigation-expo-router`,
`04-data-and-storage`, `05-validation-forms` in this folder.

**Applies on top of** `ai/shared-fe/` — `_modules/` architecture, component hierarchy, function minimalism,
no `as any`, i18n. Everything here is RN-specific.

Covers both **Expo Router** (the default) and **RN CLI + React Navigation**. Where they differ, §1 marks
it; everything else is shared.

## When this applies

`package.json` depends on `react-native`. **Expo Router** if it also has `expo` + `expo-router` and an
`app/` directory whose `_layout.tsx` uses `Stack`/`Tabs`. **RN CLI** if there's no `expo` and navigation
comes from `@react-navigation/*`.

## 1. Navigation

### Expo Router — `router.navigate`, NOT `router.push` (CRITICAL)

`router.push` **always** pushes a new screen on every call, so rapid taps push the same screen twice —
the double-navigate bug, where the user has to press back twice. `router.navigate` "pushes or unwinds to
an existing route": if the target route + params is already current, the second call is a no-op. It is
spam-tap safe by default.

```tsx
// ❌ Spam tap pushes the same screen twice
<Pressable onPress={() => router.push({ pathname: '/vehicle/[id]', params: { id } })} />

// ✅ Second tap is a no-op, no duplicate screen
<Pressable onPress={() => router.navigate({ pathname: '/vehicle/[id]', params: { id } })} />
```

- `<Link>` from `expo-router` already behaves like `navigate` — do **not** add the `push` prop unless
  duplicate screens are intentional.
- Use `push` **only** when a new stack entry for the SAME route + params is the intended UX (drilling
  `/profile/[id]` → `/profile/[id]` where back must retrace every step). `navigate` already pushes when
  the route or params differ, so this is rare.
- **Unwind caveat:** if the target already exists lower in the stack, `navigate` pops back to it instead
  of pushing a new instance. Usually desired — verify flows that need a fresh instance.
- `router.replace` — swap the current screen (after login, redirects). `router.back()` — pop.

Read params with `useLocalSearchParams()`, never `useRoute().params`:

```tsx
import { useLocalSearchParams } from 'expo-router';
const { id } = useLocalSearchParams<{ id: string }>();
```

### RN CLI — React Navigation

`navigation.navigate('Screen', params)` for the same spam-tap-safe reason; `push` only for intentional
duplicates. Params via `useRoute<RouteProp<…>>().params`. Navigators are declared in code
(`_modules/navigation/`) rather than by file convention, but screens still live in
`_modules/pages/[Domain]/*Screen.tsx` and the navigator file stays thin.

## 2. File-based routing (Expo Router)

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
    └── [id].tsx          # Dynamic route → /vehicle/123
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

**`app/` files stay thin** — routing only, importing a Screen:

```tsx
// app/vehicle/[id].tsx
import VehicleDetailScreen from '@/_modules/pages/Vehicle/VehicleDetailScreen';
import { useLocalSearchParams } from 'expo-router';
export default function Page() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <VehicleDetailScreen id={id} />;
}
```

## 3. RN primitives replace HTML/DOM components

The shared "never use raw HTML" rule maps onto RN primitives. There is no `<div>` / `<p>`; the
`Col` / `Row` / `TextPrimary` abstraction is backed by RN:

| Web (Next.js) | React Native |
|---------------|--------------|
| `Col` / `Row` (flex `<div>`) | RN `View` wrappers (`Col`/`Row` built on `View`) |
| `TextPrimary` (renders `<p>`/`<span>`) | RN `Text` (`TextPrimary` built on RN `Text`) |
| `<button>` / in-house Base button (Tailwind) | `Pressable` / `TouchableOpacity` (`Base*` wrappers) |
| Tailwind classes | `StyleSheet.create` + theme constants (no NativeWind) |
| `Link` (next/link) | `Link` (expo-router) |

Keep the same layered hierarchy (Basic → Base → Common → Domain → Screen) in `_modules/`. Screens still
end in `Screen`.

## 4. Lists — `FlatList` for anything data-driven

Any list whose length comes from data (an API response, a store, search results) renders with
`FlatList`, never `ScrollView` + `.map()`. A mapped `ScrollView` mounts every row up front; with a
server-driven feed that's unbounded memory and a slow first render. `FlatList` virtualizes for free.

- **`ScrollView` is for bounded, hand-authored layouts** — detail screens, forms, dashboards of a fixed
  set of sections. A `.slice(0, N)`-capped preview also counts as bounded.
- **Horizontal lists use `FlatList horizontal`, never a horizontal `ScrollView` + `.map()`.** The rule is
  orientation-agnostic: a row of data-driven items (status-filter chips with counts, a card carousel, a
  chip rail) is still a list — give it `horizontal`, `showsHorizontalScrollIndicator={false}`, a stable
  `keyExtractor`, and `contentContainerStyle` for gap/padding. A horizontal `ScrollView` is only for a
  truly fixed, hand-authored set that never grows.
- **Everything above the list scrolls with it** via `ListHeaderComponent` (title, filter chips, hero
  cards). Never stack a `ScrollView` and a `FlatList`, and never nest a `FlatList` inside a `ScrollView`.
- **`keyExtractor`** returns a stable id from the data — never the array index.
- **Row spacing** via `ItemSeparatorComponent` or `gap` on `contentContainerStyle` — not `marginBottom`
  on each row.
- **`ListEmptyComponent`** for the empty case (this satisfies the empty-state rule in `ai/shared-fe/03`).
- **Long lists (50+)**: tune `initialNumToRender` / `windowSize`, set `removeClippedSubviews`.

```tsx
// ❌ Server-driven list mounted eagerly
<ScrollView contentContainerStyle={styles.content}>
  <Header />
  {groups.map((g) => <AlertGroupCard key={g.vehicleId} group={g} />)}
</ScrollView>

// ✅ Virtualized; header scrolls with the list
<FlatList
  data={groups}
  keyExtractor={(g) => g.vehicleId}
  renderItem={({ item }) => <AlertGroupCard group={item} />}
  ItemSeparatorComponent={ItemSeparator}
  ListHeaderComponent={listHeader}
  ListEmptyComponent={<BaseEmptyState title={t('noAlerts')} />}
  contentContainerStyle={styles.content}
/>

// ❌ Horizontal row of data-driven items mounted eagerly
<ScrollView horizontal contentContainerStyle={styles.row}>
  {chips.map((ch) => <Chip key={ch.key} {...ch} />)}
</ScrollView>

// ✅ Horizontal list — same rule, with `horizontal`
<FlatList
  data={chips}
  horizontal
  showsHorizontalScrollIndicator={false}
  keyExtractor={(ch) => ch.key}
  renderItem={({ item }) => <Chip {...item} />}
  contentContainerStyle={styles.row}
/>
```

## 5. Styling & sizing

`StyleSheet.create` always, never inline style objects. Theme constants for every color and spacing —
never a hardcoded hex. **`scale()` on every icon size and fixed dimension**, `scaleFont()` on font
sizes; theme tokens are pre-scaled once at definition and never scaled again. Mid-layout conditional
blocks reserve space with `minHeight: scale(n)` instead of mounting and unmounting.

Full detail: `02-styling-stylesheet.md`.

## 6. Data, forms, TypeScript

- Server state: TanStack Query + `apiClient[Domain].ts` hooks (same pattern as web). Types mirror the
  backend response field-for-field — see `ai/shared-fe/07` §7b.
- Persistence: AsyncStorage (always `await`). See `04-data-and-storage.md`.
- Forms: React Hook Form + Zod via `UtilsForm.computeRules`, with in-house `Base*` RN inputs. Default to
  `register` + `setValue` through `BaseInput`; reach for `Controller` only for genuinely custom
  controlled inputs (e.g. an OTP field).

  > Raw RN `TextInput` uses `onChangeText`, not `onChange`, so `register()` can't bind to it directly.
  > That's precisely what `BaseInput` adapts internally — which is why screens stay register-first. If a
  > project has no `BaseInput`, `Controller` is required at every field until one exists.

- Function minimalism, no `as any`, i18n via i18next — all from `ai/shared-fe/`.

## 7. Preferred libraries

Build our own `Base*` / `Common` components; minimize external UI deps. When a native capability is
needed, prefer these over alternatives:

- `react-native-safe-area-context` — safe-area insets
- `@react-native-async-storage/async-storage` — persistence
- `expo-splash-screen`, `expo-status-bar` — app chrome
- `react-native-otp-entry` — OTP input (the custom-controlled `Controller` case above)
- `react-native-svg` — vector graphics
- `expo-router` — file-based navigation (Expo projects)

## Checklist

- [ ] User-tap navigation uses `router.navigate` / default `<Link>`, never `push` (unless intentional dupes)
- [ ] Params via `useLocalSearchParams()` (Expo) / `useRoute().params` (CLI)
- [ ] `app/` files thin; logic in `_modules/pages/…Screen`
- [ ] Data-driven lists use `FlatList` with a stable `keyExtractor` and a `ListEmptyComponent` — including horizontal rows (`FlatList horizontal`, not a horizontal `ScrollView` + `.map()`)
- [ ] RN primitives via `Col` / `Row` / `TextPrimary` / `Base*` wrappers; no scattered raw styles
- [ ] Icon sizes and fixed dimensions wrapped in `scale()` (fonts `scaleFont()`); theme tokens not re-scaled
- [ ] Shared rules from `ai/shared-fe/` applied
