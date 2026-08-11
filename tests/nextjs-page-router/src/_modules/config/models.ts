// Domain models + shared API response envelope.
import { EUserRole, EUserStatus } from '@/_modules/config/enums';

export interface ModelUser {
  id: string;
  name: string;
  email: string;
  role: EUserRole;
  status: EUserStatus;
}

// REST envelope: { succeeded, data, message, errors? }
export interface ModelBaseResponse<T> {
  succeeded: boolean;
  data: T;
  message: string;
  errors?: Record<string, string>;
}
