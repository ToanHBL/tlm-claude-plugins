import { z } from 'zod';

import { EUserRole, EUserStatus } from '../../values/enums';

// Schema-first validation (ai/reactnative/05, ai/shared/05).
export const userFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().min(1, 'Email is required').email('Invalid email'),
  role: z.nativeEnum(EUserRole),
  status: z.nativeEnum(EUserStatus),
});

export type UserFormData = z.infer<typeof userFormSchema>;
