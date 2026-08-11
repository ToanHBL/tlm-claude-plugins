// Centralized API endpoint paths (relative to NEXT_PUBLIC_API_BASE_URL).
export const ApiUrl = {
  USER_LIST: '/users',
  USER_CREATE: '/users',
  USER_UPDATE: (id: string) => `/users/${id}`,
  USER_DELETE: (id: string) => `/users/${id}`,
} as const;
