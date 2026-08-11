# RN Data Flow & Storage

> Shares the API-client philosophy with the web (`ai/shared`, `ai/nextjs/*/03-api-data-flow`):
> domain-implicit `apiClient[Domain]`, TanStack Query, invalidate-on-success. RN differences:
> `AsyncStorage` (async) replaces `localStorage`, and the in-house `BaseToast` / `Alert` replaces the web's in-house toast helper.

## baseFetch (with AsyncStorage auth)

```js
// _modules/_api/baseFetch.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EAsyncStorageKey } from '../values/enums';

export const baseFetch = async (input, init, options = {}) => {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || '';
  const authToken = await AsyncStorage.getItem(EAsyncStorageKey.AUTH_TOKEN); // async — await!

  const res = await fetch(baseUrl + input, {
    ...init,
    headers: {
      ...(!options?.formData && { 'Content-Type': 'application/json' }),
      ...init?.headers,
      ...(!options?.publicAPI && !!authToken && { Authorization: `Bearer ${authToken}` }),
    },
  });

  if (res.status === 401) {
    await AsyncStorage.removeItem(EAsyncStorageKey.AUTH_TOKEN);
    // trigger re-auth flow (Context action / navigation reset)
  }
  return res;
};
```

## API client — domain-implicit naming

```js
// _modules/_api/apiClientAuth.js
export const useMutationSignIn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [ApiUrl.AUTH_LOGIN],
    mutationFn: async (params) => {
      const res = await baseFetch(ApiUrl.AUTH_LOGIN, { method: 'POST', body: JSON.stringify(params) }, { publicAPI: true });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Login failed');
      await AsyncStorage.setItem(EAsyncStorageKey.AUTH_TOKEN, json.data.token);
      return json;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [ApiUrl.USER_PROFILE] }),
  });
};
```

Layers: **Server actions** (`_modules/server/actions/` — data ops / mock) → **API client**
(`_modules/_api/` — React Query hooks) → **Screens** (`_modules/screens/`).

## TanStack Query

```js
// setup — QueryClientProvider mounts in app/_layout.tsx (or App.tsx)
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 20000, retry: 2 } } });

// query + mutation hooks
export const useQueryList = () =>
  useQuery({ queryKey: [QUERY_KEYS.FEEDBACK_LIST], queryFn: () => fetchFeedbackAction() });

export const useMutationCreate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => createFeedbackAction(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FEEDBACK_LIST] }),
    onError:  (error) => console.warn('Failed to create feedback:', error.message),
  });
};

// infinite list
export const useInfiniteQueryProductList = (params) =>
  useInfiniteQuery({
    queryKey: [ApiUrl.PRODUCT_LIST, JSON.stringify(params)],
    queryFn: async ({ pageParam = 1 }) => (await baseFetch(`${ApiUrl.PRODUCT_LIST}?page=${pageParam}&pageSize=20`)).json(),
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.pageIndex + 1 : undefined),
  });
```

## Global state — React Context + Query cache

Use React Context (+`useState`/`useReducer`) for global app state; for near-static server data prefer
`useQuery` with `staleTime: Infinity` as a shared cache instead of duplicating in Context.

```tsx
// _modules/common/context/AuthContext.tsx
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const setToken = async (value: string) => { await AsyncStorage.setItem(EAsyncStorageKey.AUTH_TOKEN, value); setTokenState(value); };
  const logout   = async () => { await AsyncStorage.removeItem(EAsyncStorageKey.AUTH_TOKEN); setTokenState(null); };
  return <AuthContext.Provider value={{ token, isGuest: !token, setToken, logout }}>{children}</AuthContext.Provider>;
}
export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider');
  return ctx;
}

// global-cache alternative — same cache in any screen, no prop drilling
export const useQueryCurrentUser = (token: string | null) =>
  useQuery({ queryKey: ['current-user', token], queryFn: () => UtilsApi.get(ApiUrl.AUTH_ME), enabled: !!token, staleTime: Infinity });
```

## AsyncStorage (replaces localStorage — always async)

```js
await AsyncStorage.setItem('auth_token', token);
await AsyncStorage.setItem('user_prefs', JSON.stringify(prefs));
const token = await AsyncStorage.getItem('auth_token');
const prefs = JSON.parse((await AsyncStorage.getItem('user_prefs')) || '{}');
await AsyncStorage.removeItem('auth_token');
```

**Every** operation is async — always `await`; never read synchronously.

## Error handling (RN toast / alert)

```js
mutationFn: async (params) => {
  const res = await baseFetch(url, { method: 'POST', body: JSON.stringify(params) });
  const json = await res.json();
  if (!res.ok) {
    Alert.alert('Error', json?.message || 'Something went wrong');  // or BaseToast.show({ title, color })
    throw new Error(json?.message || '');
  }
  return json;
},
```

Options: `Alert.alert()` for destructive confirms / critical errors, the in-house **`BaseToast`** for
toast-style notifications, or inline error state. `UtilsApi` (`get`/`post`) wraps `baseFetch` + `res.ok`
check, same as web.

**`BaseToast` (in-house — build our own, no external toast lib).** Consistent with the
"build our own components, minimize external deps" policy, RN toasts are a Base component we own — do
**not** pull in `react-native-toast-message`. Mount `<BaseToast />` once at the app root / provider layer
(alongside the other providers in `app/_layout.tsx`), then fire notifications imperatively:

```js
import { BaseToast } from '../common/components/BaseToast';

BaseToast.show({ title: 'Saved', color: Colors.success });
BaseToast.show({ title: json?.message || 'Something went wrong', color: Colors.danger });
```

## Best practices
1. AsyncStorage is async — always `await`.
2. Query keys from constants: `[ApiUrl.X, ...params]`.
3. Invalidate related queries on mutation success.
4. Use TanStack Query states (`isLoading`, `isPending`, `isError`).
5. No `nuqs`/URL state — use `useLocalSearchParams` (see `03-navigation`) or Context.
6. Client env vars must be `EXPO_PUBLIC_`-prefixed.
