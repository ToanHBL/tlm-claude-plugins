// REST API configuration — base URL comes from env (server-only in App Router).

export const API_CONFIG = {
  BASE_URL: process.env.API_BASE_URL ?? 'https://api.example.com/',
  VERSION: process.env.API_VERSION ?? '1.0',
} as const;

// Endpoint builders — const object with computed members (see shared/04).
export const ApiUrl = {
  USER_LIST: 'users',
  USER_CREATE: 'users',
  USER_UPDATE: (id: string) => `users/${id}`,
  USER_DELETE: (id: string) => `users/${id}`,
} as const;
