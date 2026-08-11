// Enums & const objects — single source of truth for User domain value sets.
// Rule: no string literals in interfaces (shared/04-typescript-enums-constants.md).

export enum EUserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}

export enum EUserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export const USER_ROLE_LABELS: Record<EUserRole, string> = {
  [EUserRole.ADMIN]: 'Admin',
  [EUserRole.USER]: 'User',
  [EUserRole.GUEST]: 'Guest',
};

export const USER_STATUS_LABELS: Record<EUserStatus, string> = {
  [EUserStatus.ACTIVE]: 'Active',
  [EUserStatus.INACTIVE]: 'Inactive',
};

export interface EnumOption {
  value: string;
  label: string;
}

export const USER_ROLE_OPTIONS: EnumOption[] = Object.values(EUserRole).map((value) => ({
  value,
  label: USER_ROLE_LABELS[value],
}));

export const USER_STATUS_OPTIONS: EnumOption[] = Object.values(EUserStatus).map((value) => ({
  value,
  label: USER_STATUS_LABELS[value],
}));
