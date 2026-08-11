// E-prefixed string enums — no string literals in interfaces (ai/shared/04).

export enum EUserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}

export enum EUserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

// Typed AsyncStorage keys (ai/reactnative/01-architecture).
export enum EAsyncStorageKey {
  AUTH_TOKEN = 'auth_token',
  USER_PREFS = 'user_prefs',
}
