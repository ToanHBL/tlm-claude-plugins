import { EUserRole, EUserStatus } from '@/_modules/config/enums';

// API model — enums instead of string literals (see shared/04).
export interface ModelUser {
  id: string;
  name: string;
  email: string;
  role: EUserRole;
  status: EUserStatus;
}
