# Cross-Platform Architecture (Web + React Native)

> The `_modules/` architecture and its core principles are **portable across platforms**: the same
> business-logic layer powers Next.js (App Router / Page Router) on the web and React Native (Expo) on
> mobile. This file states what is shared and maps what each platform swaps out.

## One architecture, two platforms

```
_modules/                 # framework- AND platform-agnostic business logic
├── _api/                 # API clients (apiClient[Domain], baseFetch)
├── common/               # Basic/Base/Common components, hooks, utils, schemas
├── config/ | values/     # routeLinks/routes, apiUrl, enums, theme
├── screens/ | pages/     # Screen components (ALL business logic)
└── server/               # server actions / data operations

[routing layer]           # thin — imports & renders a Screen; platform-specific:
  web:  src/pages/ (Page Router)  or  src/app/ (App Router)
  RN:   app/ (Expo Router)        or  App.tsx
```

The routing layer is always thin (≤5 lines: import Screen, render it). Swapping platforms means
rewriting the routing + presentation shell, **not** the `_modules/` logic.

## Principles shared by ALL platforms

These hold identically on web and RN — learn them once (see the linked shared docs):

- **Thin routing layer; logic in Screen components** — `ai/shared/01`
- **Component hierarchy**: Basic → Base → Common → Domain → Screen — `ai/shared/03`
- **Function minimalism (YAGNI)**: inline handlers + `TODO`, no premature `useCallback`/`useMemo` — `ai/shared/03`
- **Never use raw primitives** for layout/text — use `Col`/`Row` + a text component — `ai/shared/03`
- **Domain-implicit API clients**: `apiClient[Domain]` exposing `useQuery[Entity]` /
  `useMutationCreate/Update/Delete` — `ai/shared/07`, `ai/nextjs/*/03`, `ai/reactnative/04`
- **Server state via TanStack Query**; invalidate related queries on mutation success
- **Forms via React Hook Form + Zod**, schema-first, no manual/state validation — `ai/shared/05`
- **Enums / const objects over string literals** (`E`-prefixed) — `ai/shared/04`
- **Create components liberally** in the domain folder; promote to `common/` only at 3+ reuse

## What each platform swaps (the platform boundary)

| Concern | Web — `ai/nextjs/` | React Native — `ai/reactnative/` |
|---------|--------------------|----------------------------------|
| Routing | `pages/` or `app/` (Next.js) | `app/` (Expo Router) / `App.tsx` |
| Styling | Tailwind CSS (`shared/02`) | `StyleSheet.create` + theme constants (`reactnative/02`) |
| Text component | `TextPrimary` | `TextPrimary` (same role) |
| Navigation | `<Link>` / `router.push` (next) | Expo Router `<Link>` / **`router.navigate`** |
| Params | `useParams`/`router.query` | `useLocalSearchParams` |
| Persistence | `localStorage` (sync) | `AsyncStorage` (async — `await`) |
| Notifications | in-house `BaseToast` (`BaseToast.show`) | `Alert.alert` / `react-native-toast-message` |
| Form inputs | `register()` | register + setValue (Controller only for custom) |
| Shareable state | `nuqs` / URL | `useLocalSearchParams` / Context |
| Env vars | `NEXT_PUBLIC_*` | `EXPO_PUBLIC_*` |
| Responsive | breakpoints | mobile-only; `SafeAreaView`, `Platform.OS` |
| Build/deploy | Next build / static export | EAS build + custom dev client |

## Where to read next
- **Web**: `ai/nextjs/page-router/` or `ai/nextjs/app-router/`
- **React Native**: `ai/reactnative/` (start with its `README.md`)
- Shared conventions apply on both — keep `ai/shared/` as the base for either target.
