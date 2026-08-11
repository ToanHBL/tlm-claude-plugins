import AsyncStorage from '@react-native-async-storage/async-storage';

import { EAsyncStorageKey } from '../values/enums';

interface BaseFetchOptions {
  publicAPI?: boolean;
  formData?: boolean;
}

// Reads the auth token from AsyncStorage (async — always await) and prefixes the
// configured base URL. Mirrors ai/reactnative/04-data-and-storage.md.
// Bare RN reads process.env.RN_API_BASE_URL (see PROJECT-NOTES for env wiring).
export const baseFetch = async (
  input: string,
  init?: RequestInit,
  options: BaseFetchOptions = {},
): Promise<Response> => {
  const baseUrl = process.env.RN_API_BASE_URL || '';
  const authToken = await AsyncStorage.getItem(EAsyncStorageKey.AUTH_TOKEN);

  const res = await fetch(baseUrl + input, {
    ...init,
    headers: {
      ...(!options.formData && { 'Content-Type': 'application/json' }),
      ...init?.headers,
      ...(!options.publicAPI && !!authToken && { Authorization: `Bearer ${authToken}` }),
    },
  });

  if (res.status === 401) {
    await AsyncStorage.removeItem(EAsyncStorageKey.AUTH_TOKEN);
    // TODO: trigger re-auth flow (Context action / navigation reset)
  }

  return res;
};
