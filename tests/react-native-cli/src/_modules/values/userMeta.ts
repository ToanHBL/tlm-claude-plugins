import { EUserRole, EUserStatus } from './enums';
import { Colors } from './theme';

// Theme-coupled enum maps (label + color per enum value) — ai/reactnative/01.

export const USER_ROLE_LABELS: Record<EUserRole, string> = {
  [EUserRole.ADMIN]: 'Admin',
  [EUserRole.USER]: 'User',
  [EUserRole.GUEST]: 'Guest',
};

export const USER_STATUS_LABELS: Record<EUserStatus, string> = {
  [EUserStatus.ACTIVE]: 'Active',
  [EUserStatus.INACTIVE]: 'Inactive',
};

export const USER_STATUS_COLORS: Record<EUserStatus, string> = {
  [EUserStatus.ACTIVE]: Colors.success,
  [EUserStatus.INACTIVE]: Colors.muted,
};

export const USER_ROLE_OPTIONS = [
  { label: USER_ROLE_LABELS[EUserRole.ADMIN], value: EUserRole.ADMIN },
  { label: USER_ROLE_LABELS[EUserRole.USER], value: EUserRole.USER },
  { label: USER_ROLE_LABELS[EUserRole.GUEST], value: EUserRole.GUEST },
];

export const USER_STATUS_OPTIONS = [
  { label: USER_STATUS_LABELS[EUserStatus.ACTIVE], value: EUserStatus.ACTIVE },
  { label: USER_STATUS_LABELS[EUserStatus.INACTIVE], value: EUserStatus.INACTIVE },
];
