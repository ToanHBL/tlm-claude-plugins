import { z } from 'zod';
import { EUserRole, EUserStatus } from '@/_modules/config/enums';

// Single Zod schema shared by the client form (zodResolver) and the Server Actions
// (safeParse) — validate once, use everywhere (see shared/05 §"Shared Validation Schemas").
export const userFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  role: z.nativeEnum(EUserRole),
  status: z.nativeEnum(EUserStatus),
});

export type UserFormData = z.infer<typeof userFormSchema>;
