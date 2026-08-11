import { EUserRole, EUserStatus } from './enums';

// Domain model — enums instead of string literals (ai/shared/04).
export interface ModelUser {
  id: string;
  name: string;
  email: string;
  role: EUserRole;
  status: EUserStatus;
}

// REST envelope shared by every endpoint.
export interface ApiEnvelope<T> {
  succeeded: boolean;
  data: T;
  message: string;
  errors?: string[] | undefined;
}
