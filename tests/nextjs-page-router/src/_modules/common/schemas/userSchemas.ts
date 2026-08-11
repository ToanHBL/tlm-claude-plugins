import { z } from 'zod';
import { EUserRole, EUserStatus } from '@/_modules/config/enums';

// Zod schema shared by the form (client) — see shared/05-validation-patterns.md.
export const userFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  role: z.nativeEnum(EUserRole),
  status: z.nativeEnum(EUserStatus),
});

export type UserFormData = z.infer<typeof userFormSchema>;
