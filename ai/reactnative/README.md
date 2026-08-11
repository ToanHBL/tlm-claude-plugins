# React Native (Expo) Knowledge Base

Platform-specific rules for building **React Native + Expo** apps following the shared house conventions.
This is the RN counterpart to `ai/nextjs/`. The **cross-platform principles** it shares with the web
live in `ai/shared/` — read those first; this folder only documents what RN does *differently*.

```
ai/
├── shared/           # Cross-platform principles (web + RN) — read first
│   └── 08-cross-platform-architecture.md   # web ↔ RN mapping
├── nextjs/           # Web-specific (App Router / Page Router)
└── reactnative/      # ← you are here (RN/Expo platform mechanics)
    ├── 01-architecture.md          # Expo tech stack, _modules, EAS build, state, env
    ├── 02-styling-stylesheet.md    # StyleSheet + theme constants, Base components, optional animation
    ├── 03-navigation-expo-router.md# Expo Router (navigate-not-push), params, tabs
    ├── 04-data-and-storage.md      # baseFetch + AsyncStorage, TanStack Query, BaseToast/Alert
    └── 05-validation-forms.md      # RHF + Zod (register-first; Controller for custom fields)
```

## What carries over from `shared/` (do NOT re-learn here)
- Framework-agnostic `_modules/` architecture and the thin routing layer
- Component hierarchy (Basic → Base → Common → Domain → Screen)
- **Function minimalism** (inline handlers + `TODO`, no `useCallback`/`useMemo` unless needed)
- Domain-implicit API clients (`useMutationCreate`, not `useMutationBookCreate`)
- TanStack Query for server state; React Hook Form + Zod for forms
- Enums / const objects over string literals (`E`-prefixed enums)

## What is different on React Native (documented here)
| Web (`nextjs/`) | React Native (`reactnative/`) |
|-----------------|-------------------------------|
| Tailwind CSS | `StyleSheet.create` + theme constants |
| `Text` component | `TextPrimary` component (same role — RN naming) |
| `<Link>` / `router.push` (next) | Expo Router `<Link>` / **`router.navigate`** |
| `localStorage` | `AsyncStorage` (async — always `await`) |
| web's in-house toast helper | in-house `BaseToast` / `Alert.alert` |
| `register()` inputs | `register()` + `setValue` via `BaseInput` (Controller only for custom fields) |
| `usePathname`, `nuqs` | `usePathname` / `useLocalSearchParams` (expo-router) |
| responsive breakpoints | mobile-only; `SafeAreaView`, `Platform.OS` |

## Conventions applied here (corrections vs the raw source)
1. **Navigation uses `router.navigate`, not `router.push`** for user-triggered navigation
   (spam-tap safe). The raw source used `push` freely — corrected throughout `03-navigation-expo-router.md`.
   See the rationale there and the shared expo-router rule.
2. Component named `TextPrimary` here to match the actual RN codebase (the web KB calls the equivalent
   `Text`). They play the same role — see the mapping table above.
