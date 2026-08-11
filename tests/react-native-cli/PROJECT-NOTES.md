# User CRUD — Bare React Native CLI (rules knowledge-base test)

Single `UserListScreen` implementing User CRUD, generated from the `rules/` knowledge base.
Target is **bare React Native CLI** (`@react-native-community/cli`, RN 0.79), **not Expo**.

TypeScript typecheck (`npx tsc --noEmit`) passes clean.

---

## (a) File tree

```
react-native-cli/
├── index.js                     # AppRegistry.registerComponent entry
├── App.tsx                      # Thin entry: QueryClientProvider + SafeAreaProvider → screen
├── app.json                     # RN app name (RulesUserCrud)
├── babel.config.js              # @react-native/babel-preset
├── metro.config.js              # @react-native/metro-config
├── tsconfig.json                # extends @react-native/typescript-config; strict; @/_modules/* alias
├── package.json                 # RN 0.79 + react-query, RHF, zod, safe-area-context, async-storage
└── src/
    ├── env.d.ts                 # ambient process.env.RN_API_BASE_URL typing
    └── _modules/                # 100% framework-agnostic business logic
        ├── _api/
        │   ├── apiUrl.ts        # ApiUrl endpoint consts + QueryKeys
        │   ├── baseFetch.ts     # fetch wrapper; reads auth token from AsyncStorage
        │   └── apiClientUser.ts # useQueryUsers / useMutationCreate|Update|Delete + envelope unwrap
        ├── common/
        │   ├── components/
        │   │   ├── Col.tsx          # structural flex-column (View)
        │   │   ├── Row.tsx          # structural flex-row (View)
        │   │   ├── TextPrimary.tsx  # RN text primitive (== web Text)
        │   │   ├── BaseButton.tsx   # themed TouchableOpacity primitive
        │   │   ├── BaseInput.tsx    # register-first TextInput bridge (name+register+setValue)
        │   │   ├── BaseSelect.tsx   # in-house segmented control for enums
        │   │   └── BaseModal.tsx    # in-house RN Modal wrapper
        │   └── schemas/
        │       └── userSchema.ts    # Zod schema + inferred UserFormData
        ├── screens/
        │   └── User/
        │       ├── UserListScreen.tsx           # ALL business logic; FlatList of cards + modal
        │       └── components/
        │           ├── UserCard.tsx             # domain card: Edit + Delete(Alert.alert)
        │           └── UserFormModalContent.tsx # self-managing create/edit form
        └── values/
            ├── enums.ts         # EUserRole, EUserStatus, EAsyncStorageKey
            ├── interfaces.ts    # ModelUser, ApiEnvelope<T>
            ├── theme.ts         # Colors / FontSize / Radius / Spacing tokens
            └── userMeta.ts      # enum→label/color maps + select options
```

## (b) Key file → rule mapping

| File | Rule(s) applied |
|------|-----------------|
| `App.tsx` | Thin routing/entry layer, ≤ providers only — `shared/01`, `reactnative/01`. Mounts `QueryClientProvider` + `SafeAreaProvider` (spec). |
| `index.js` | Bare-CLI entry via `AppRegistry` (platform note; replaces Expo Router `app/`). |
| `_modules/screens/User/UserListScreen.tsx` | ALL business logic in the Screen — `shared/01`, `reactnative/01`. Function minimalism: inline handlers + `TODO` — `shared/03`. `Col`/`Row`/`TextPrimary` not raw `View`/`Text` — `reactnative/02`. Loading via `ActivityIndicator`/empty component, not text swaps — `shared/03`. `Alert.alert` delete confirm — `reactnative/04`. |
| `_modules/screens/User/components/UserCard.tsx` | Domain component in screen's `components/`, abstract minimal props — `shared/03`. Enum→label/color via `Record<Enum,T>` maps — `shared/04`. StyleSheet + theme tokens, no inline/hardcoded — `reactnative/02`. |
| `_modules/screens/User/components/UserFormModalContent.tsx` | Self-managing modal content owning form+mutations, closes on success — `shared/03`. RHF + Zod `zodResolver`, `reset`-free close, `isLoading` on submit — `shared/05`, `reactnative/05`. **register-first via BaseInput** for name/email; **Controller only** for the custom enum selects — `reactnative/05`. |
| `_modules/common/components/BaseInput.tsx` | The register-first RN bridge: takes `name`+`register`+`setValue`, `register(name)` once, pushes edits via `setValue` inside `onChangeText` — `reactnative/05` (the "honest RN part"). |
| `_modules/common/components/BaseButton/Select/Modal.tsx` | In-house `Base*` primitives, minimize external UI deps — `reactnative/01` dependency policy, `shared/03`. Themed via `StyleSheet.create` + tokens — `reactnative/02`. |
| `_modules/common/components/Col/Row/TextPrimary.tsx` | Structural primitives replacing raw `View`/`Text` — `reactnative/02`. |
| `_modules/_api/baseFetch.ts` | fetch wrapper reading auth token from AsyncStorage (async/await), 401 clears token — `reactnative/04`. |
| `_modules/_api/apiClientUser.ts` | Domain-implicit `apiClientUser` exposing `useQueryUsers` + `useMutationCreate/Update/Delete`; invalidate `USER_LIST` on success; `Alert.alert` on error; envelope `{succeeded,data,message,errors?}` unwrap — `shared/07`(implicit), `reactnative/04`. Re-exports enums/model — `shared/04`. |
| `_modules/common/schemas/userSchema.ts` | Schema-first Zod, `z.nativeEnum` for enums — `shared/05`, `reactnative/05`. |
| `_modules/values/enums.ts` | E-prefixed string enums, `EAsyncStorageKey` typed keys — `shared/04`, `reactnative/01`. |
| `_modules/values/theme.ts` | `Colors/FontSize/Radius/Spacing` tokens — `reactnative/02`. |
| `_modules/values/userMeta.ts` | Theme-coupled enum label/color maps — `shared/04`, `reactnative/01`. |
| `tsconfig.json` | strict, no `as any` anywhere (only one typed `as PathValue<>` cast w/ comment) — `shared` TS rule. |

---

## (c) RULES FEEDBACK

Every place the RN rules assumed Expo / Expo-Router and did not fit bare React Native CLI,
plus other gaps/ambiguity found while generating:

1. **Navigation doc is 100% Expo-Router; unusable as-written for bare CLI.**
   `ai/reactnative/03-navigation-expo-router.md` and both skills center on `app/` file-based
   routing, `router.navigate`, `useLocalSearchParams`, `Stack`/`Tabs`, and `_layout.tsx` provider
   mounting. None exist in bare CLI. For this single screen no router is needed (App.tsx renders the
   screen directly). **Gap:** there is no rule covering navigation for bare RN CLI. If navigation were
   required you'd install `@react-navigation/native` + a navigator (native-stack/bottom-tabs) and mount
   the container in `App.tsx` — the KB should add a "non-Expo RN" note or a `@react-navigation` variant,
   because the `router.navigate`-not-`push` guidance (the doc's headline rule) has **no equivalent** in
   React Navigation (there it's `navigation.navigate` vs `push`, similar spirit but different API).

2. **Provider-mounting instruction points at a file that doesn't exist here.**
   Rules say "mount providers once in `app/_layout.tsx`" (`reactnative/03`, `reactnative/04`). Bare CLI
   has no `app/_layout.tsx`; the correct home is `App.tsx`. The docs do parenthetically allow
   "(or App.tsx)" in one spot (`reactnative/04`), but the primary instruction and the skill checklists
   only mention `app/`. Should call out `App.tsx` as the first-class location for non-Expo.

3. **Entry point mismatch.** `reactnative/01` lists `index.js` + `App.tsx` but frames App.tsx as
   "Root navigator". In bare CLI `index.js` must call `AppRegistry.registerComponent(appName, () => App)`
   with `appName` from `app.json` — a detail absent from the KB (Expo hides it via `expo-router/entry`).

4. **Env var prefix rule is Expo-specific.** Every data/arch doc mandates `EXPO_PUBLIC_*`
   (`reactnative/01`, `04`, `shared/08`). Bare CLI has **no** built-in env inlining — `EXPO_PUBLIC_` does
   nothing. The spec's `RN_API_BASE_URL` requires `react-native-dotenv` (babel) or
   `react-native-config`. I read `process.env.RN_API_BASE_URL` and added `src/env.d.ts` to type it, but
   **it will be `undefined` at runtime until a babel env plugin is wired** — the KB has no guidance for
   env in non-Expo RN. (Left as scaffolding gap per the task's "prioritize CRUD" instruction.)

5. **Build/run commands are all Expo/EAS.** `reactnative/01` §Build & Run uses `npx expo start`,
   `expo run:android`, `eas build`. Bare CLI uses `react-native start` / `run-android` / `run-ios` and
   Xcode/Gradle. No native `android/`/`ios/` folders were generated (per task), so the app can't
   actually boot without `npx @react-native-community/cli init` scaffolding — the KB offers nothing for
   the bare toolchain.

6. **Preferred-libraries list leans on Expo packages.** `expo-splash-screen`, `expo-status-bar`,
   and `expo-router` are "preferred" but are Expo-only. In bare CLI the equivalents are RN's built-in
   `StatusBar` (used here) and `react-native-bootsplash`. Only `react-native-safe-area-context` and
   `@react-native-async-storage/async-storage` (both used) are genuinely CLI-compatible. The list should
   split "works in bare CLI" vs "Expo-only".

7. **The register-first BaseInput bridge is well-specified — good — but has a real edit-mode gap.**
   `reactnative/05`'s abridged `BaseInput` registers via `useEffect` + `setValue` and shows a controlled
   `value` prop, yet the screen example passes neither `value` nor initial data. For **pre-filled edit**
   there's no stated way to seed the field: an uncontrolled `TextInput` won't reflect RHF `defaultValues`
   on its own. I bridged this by threading `defaultValue` into `TextInput` (uncontrolled initial value)
   alongside RHF `defaultValues`. Works, but the KB should specify the edit-mode seeding path explicitly
   (defaultValue vs controlled `value` from `watch`), since it's the #1 ambiguity when building CRUD.

8. **`as any` in the validation docs conflicts with the TypeScript rule.** `shared/05` and `shared/03`
   repeatedly show `...register('x', UtilsForm.computeRules(...) as any)`, but `frontend-conventions`
   §8 and the global TS rule say **never `as any`**. Direct contradiction. I avoided both: Zod resolver
   instead of `computeRules`, and the only cast is a typed `as PathValue<T, Path<T>>` (documented) inside
   BaseInput. The KB should fix its own examples to not use `as any`.

9. **Text component naming is inconsistent across the KB.** `shared/03` says "CORRECTED: use `Text.tsx`,
   not TextPrimary", while `reactnative/02` and `shared/08` mandate `TextPrimary` for RN. Followed
   `TextPrimary` (RN-specific doc wins). Minor, but a fresh generator could pick either.

10. **`UtilsForm` referenced but never defined for RN.** Docs point to
    `src/_modules/common/utils/UtilsForm.ts` and i18n `t()` for validation messages, but no RN
    implementation/i18n setup is given, and `frontend-conventions` mandates wrapping all strings in
    `t()`. For a self-contained bare-CLI POC I used plain Zod messages and literal UI strings (no i18next).
    The KB assumes i18next is always present; it should note i18n is optional for a minimal app.

11. **API-client layering doc (`shared/07`) was referenced but not in the provided read-set.**
    `reactnative/04` and `frontend-conventions` cite `ai/shared/07-ai-workflow-integration.md` for the
    generation template + review checklist, but it wasn't in the task's file list. Built the
    `apiClient[Domain]` shape from the examples in `reactnative/04`; the envelope `{succeeded,...}` shape
    came from the feature spec, not the rules (the KB examples use ad-hoc `json.data.token` /
    `json?.message` without a documented standard envelope). A canonical envelope type in the KB would help.

12. **`Col`/`Row` themselves use an inline style object** (`{ flexDirection: 'column' }`) — this is
    straight from the `reactnative/02` reference snippet, so it's followed as-authored, but it technically
    violates the same doc's "never inline style objects" headline. Minor internal inconsistency in the KB.
