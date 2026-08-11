// Domain enums — NEVER use string literals in interfaces (see shared/04).

export enum EUserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}

export enum EUserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

// Display labels — Record<Enum, string> mapping (see shared/04 §"Enum with Display Labels").
export const USER_ROLE_LABELS: Record<EUserRole, string> = {
  [EUserRole.ADMIN]: 'Admin',
  [EUserRole.USER]: 'User',
  [EUserRole.GUEST]: 'Guest',
};

export const USER_STATUS_LABELS: Record<EUserStatus, string> = {
  [EUserStatus.ACTIVE]: 'Active',
  [EUserStatus.INACTIVE]: 'Inactive',
};

// Tailwind badge classes per status (see shared/04 §"Enum with Colors").
export const USER_STATUS_BADGE_CLASSES: Record<EUserStatus, string> = {
  [EUserStatus.ACTIVE]: 'bg-green-50 text-success border border-green-200',
  [EUserStatus.INACTIVE]: 'bg-gray-100 text-secondary border border-gray-200',
};
