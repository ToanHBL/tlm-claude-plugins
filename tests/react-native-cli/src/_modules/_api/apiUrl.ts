// Endpoint constants — never hardcode paths in clients (ai/shared/04).
export const ApiUrl = {
  USER_LIST: '/users',
  USER_CREATE: '/users',
  USER_UPDATE: (id: string) => `/users/${id}`,
  USER_DELETE: (id: string) => `/users/${id}`,
} as const;

// TanStack Query keys.
export const QueryKeys = {
  USER_LIST: 'user-list',
} as const;
