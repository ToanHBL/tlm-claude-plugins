# Validation Patterns & Best Practices

## Overview

This document outlines validation patterns for forms, API inputs, and data handling across the application. Follow these patterns consistently for all user inputs and data mutations.

## Client-Side Validation

### Form Validation with React Hook Form + Zod

**Pattern**: Use React Hook Form with Zod schema validation for all forms.

**Bind fields with `register()` by default** — on web it binds directly to the DOM input
(`<BaseInput {...register('email')} />`). Use `Controller`/`useController` **only when a field needs
heavy customization** (a custom controlled component, masked/OTP input, or a picker).

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Define validation schema
const patientSchema = z.object({
  name: z.string().min(1, 'Patient name is required').max(200, 'Name too long'),
  roomNumber: z.string().max(20, 'Room number too long').optional().or(z.literal('')),
  bedNumber: z.string().max(20, 'Bed number too long').optional().or(z.literal('')),
});

type PatientFormData = z.infer<typeof patientSchema>;

export default function PatientForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      name: '',
      roomNumber: '',
      bedNumber: '',
    },
  });

  const onSubmit = (data: PatientFormData) => {
    // Data is validated at this point
    mutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <BaseInput
        {...register('name')}
        label="Patient Name"
        isInvalid={!!errors.name}
        errorMessage={errors.name?.message}
        isRequired
      />
      <BaseInput
        {...register('roomNumber')}
        label="Room Number"
        isInvalid={!!errors.roomNumber}
        errorMessage={errors.roomNumber?.message}
      />
      {/* Submit button */}
    </form>
  );
}
```

### Alternative: Form Validation with UtilsForm (i18n Support)

**Pattern**: Use React Hook Form with `UtilsForm.computeRules()` for i18n-enabled validation messages.

This project includes `src/_modules/common/utils/UtilsForm.ts` which provides a utility for generating validation rules with i18next translation support.

```tsx
'use client';

import { useForm } from 'react-hook-form';
import UtilsForm from '@/_modules/common/utils/UtilsForm';

export default function PatientForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      name: '',
      roomNumber: '',
      bedNumber: '',
    },
  });

  const onSubmit = (data: any) => {
    mutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <BaseInput
        {...register('name', UtilsForm.computeRules('Patient Name', {
          required: true,
          maxLength: 200,
        }))}
        label="Patient Name"
        isInvalid={!!errors.name}
        errorMessage={errors.name?.message}
        isRequired
      />
      <BaseInput
        {...register('roomNumber', UtilsForm.computeRules('Room Number', {
          maxLength: 20,
        }))}
        label="Room Number"
        isInvalid={!!errors.roomNumber}
        errorMessage={errors.roomNumber?.message}
      />
      <BaseInput
        {...register('bedNumber', UtilsForm.computeRules('Bed Number', {
          maxLength: 20,
        }))}
        label="Bed Number"
        isInvalid={!!errors.bedNumber}
        errorMessage={errors.bedNumber?.message}
      />
      {/* Submit button */}
    </form>
  );
}
```

### UtilsForm.computeRules() - Enhanced with Number Support

**CRITICAL ENHANCEMENT**: The UtilsForm utility now supports NUMBER validation with min/max/integer checks.

**UtilsForm.computeRules() Parameters:**

```typescript
interface IComputeRulesParams {
  required?: boolean;           // Field is required
  pattern?: object;             // Regex pattern for validation
  maxLength?: number;           // Maximum string length
  minLength?: number;           // Minimum string length
  min?: number;                 // Minimum numeric value (for numbers)
  max?: number;                 // Maximum numeric value (for numbers)
  validate?: Validate;          // Custom validation function
  isNumber?: boolean;           // Validates as number (float)
  isInteger?: boolean;          // Validates as integer
}
```

**Implementation:**

```tsx
// UtilsForm.ts
import type { RegisterOptions } from 'react-hook-form';

interface IComputeRulesParams {
  required?: boolean;
  pattern?: object;
  maxLength?: number;       // For strings
  minLength?: number;       // For strings
  min?: number;            // For numbers
  max?: number;            // For numbers
  validate?: Validate<unknown, unknown>;
  isNumber?: boolean;      // Enable number validation
  isInteger?: boolean;     // Enable integer validation
}

const UtilsForm = {
  // Role: derive the common React Hook Form validation rules + i18n messages for a field.
  // Typed to return RHF `RegisterOptions`, so `register('x', computeRules(...))` type-checks
  // with NO `as any` cast.
  computeRules: (key: string, params: IComputeRulesParams): RegisterOptions => {
    const rules: RegisterOptions = {};

    if (params.required) {
      rules.required = t('validation:required', { key });
    }

    // String validation (minLength, maxLength, pattern)
    if (!params.isNumber && !params.isInteger) {
      if (params.maxLength) {
        rules.maxLength = {
          value: params.maxLength,
          message: t('validation:max.string', { key, value1: params.maxLength }),
        };
      }
      if (params.minLength) {
        rules.minLength = {
          value: params.minLength,
          message: t('validation:min.string', { key, value1: params.minLength }),
        };
      }
      if (params.pattern) {
        rules.pattern = {
          value: params.pattern,
          message: t('validation:regex', { key }),
        };
      }
      if (params.validate) {
        rules.validate = params.validate;
      }
    }

    // Number validation (min, max, isInteger)
    if (params.isNumber || params.isInteger) {
      rules.valueAsNumber = true;  // Automatically convert to number

      if (params.min !== undefined) {
        rules.min = {
          value: params.min,
          message: t('validation:min.number', { key, value1: params.min }),
        };
      }
      if (params.max !== undefined) {
        rules.max = {
          value: params.max,
          message: t('validation:max.number', { key, value1: params.max }),
        };
      }

      rules.validate = (value: number) => {
        if (isNaN(value)) return `${key} must be a number`;
        if (params.isInteger && !Number.isInteger(value)) {
          return `${key} must be an integer`;
        }
        if (params.validate) return params.validate(value);
        return true;
      };
    }

    return rules;
  },
};
```

**Usage Examples:**

```tsx
// String validation with length constraints
{...register('title', UtilsForm.computeRules('Title', {
  required: true,
  minLength: 3,
  maxLength: 100,
}))}

// Integer validation with range
{...register('userId', UtilsForm.computeRules('User ID', {
  required: true,
  isInteger: true,
  min: 1,
  max: 1000,
}))}

// Float/Decimal validation
{...register('price', UtilsForm.computeRules('Price', {
  required: true,
  isNumber: true,
  min: 0.01,
  max: 999999.99,
}))}

// Age with integer constraint
{...register('age', UtilsForm.computeRules('Age', {
  required: true,
  isInteger: true,
  min: 0,
  max: 150,
}))}

// Pattern validation (email, phone, etc.)
{...register('email', UtilsForm.computeRules('Email', {
  required: true,
  pattern: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
}))}

// Optional number field
{...register('discount', UtilsForm.computeRules('Discount', {
  isNumber: true,
  min: 0,
  max: 100,
}))}
```

**When to use each approach:**

- **Zod Schema (Recommended)**: Use for complex forms with nested objects, type safety, and shared client/server validation
- **UtilsForm.computeRules()**: Use for simple forms with i18n requirements or when migrating from existing code that uses this pattern

### Why React Hook Form + Zod?

✅ **Type-safe**: Zod schemas generate TypeScript types
✅ **Consistent**: Same validation logic on client and server
✅ **User-friendly**: Real-time validation feedback
✅ **DRY**: Define validation once, use everywhere
✅ **Integration**: Works seamlessly with our in-house Base components (register binds directly)

❌ **Avoid**: Manual validation with `if` statements and `alert()`

```tsx
// ❌ Bad: Manual validation
const handleSubmit = () => {
  if (!patientName.trim()) {
    alert('Patient name is required');
    return;
  }
  // ...
};

// ✅ Good: React Hook Form + Zod
const onSubmit = (data: PatientFormData) => {
  // Validated by Zod schema
  mutation.mutate(data);
};
```

## Server-Side Validation

### API Route Validation

**Pattern**: Validate all API inputs using Zod schemas on the server.

**Router-Specific Note**: API route implementation differs between Page Router and App Router. See router-specific folders for details.

```typescript
// Example pattern (router-specific implementation varies)
import { z } from 'zod';

// Define validation schema
const createPatientSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  roomNumber: z.string().max(20).optional(),
  bedNumber: z.string().max(20).optional(),
});

// Validate in API route
const validationResult = createPatientSchema.safeParse(body);

if (!validationResult.success) {
  return NextResponse.json(
    {
      error: 'Validation failed',
      details: validationResult.error.flatten().fieldErrors
    },
    { status: 400 }
  );
}
```

### Shared Validation Schemas

**Pattern**: Share validation schemas between client and server.

```typescript
// src/_modules/common/schemas/patientSchemas.ts
import { z } from 'zod';

export const createPatientSchema = z.object({
  name: z.string().min(1, 'Patient name is required').max(200, 'Name too long'),
  roomNumber: z.string().max(20, 'Room number too long').optional().or(z.literal('')),
  bedNumber: z.string().max(20, 'Bed number too long').optional().or(z.literal('')),
});

export const createDeviceSchema = z.object({
  patientId: z.string().optional(),
  status: z.enum(['active', 'inactive', 'maintenance']).optional(),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type CreateDeviceInput = z.infer<typeof createDeviceSchema>;
```

Usage in client:

```tsx
import { createPatientSchema, type CreatePatientInput } from '@/_modules/common/schemas/patientSchemas';
import { zodResolver } from '@hookform/resolvers/zod';

const form = useForm<CreatePatientInput>({
  resolver: zodResolver(createPatientSchema),
});
```

Usage in server:

```typescript
import { createPatientSchema } from '@/_modules/common/schemas/patientSchemas';

const result = createPatientSchema.safeParse(body);
```

## Validation Rules

### Required Fields

- Use `z.string().min(1, 'Field is required')` for required strings
- Always provide user-friendly error messages
- Mark required fields with `isRequired` prop on inputs

### Optional Fields

- Use `z.string().optional()` or `z.string().optional().or(z.literal(''))`
- Convert empty strings to `null` or `undefined` before database operations
- Example: `roomNumber: roomNumber || null`

### String Length Limits

- Match database column constraints (e.g., `@db.VarChar(200)`)
- Validate on both client and server
- Example: `z.string().max(200, 'Name too long')`

### Number Validation

- Use `isInteger: true` for whole numbers
- Use `isNumber: true` for decimals/floats
- Always set min/max bounds for safety
- Example: `UtilsForm.computeRules('Age', { isInteger: true, min: 0, max: 150 })`

### Enums

- Use `z.enum(['value1', 'value2'])` for predefined values
- Example: `z.enum(['active', 'inactive', 'maintenance'])`

### IDs and References

- Validate format (e.g., `P001`, `D001`)
- Verify existence in database before using
- Check relationships (e.g., patient belongs to hospital)

## Regex Patterns

Common regex patterns for validation:

```typescript
export const Regex = {
  EMAIL: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
  MOBILE: /^[0-9]{10,15}$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  URL: /^https?:\/\/.+/,
};

// Usage
{...register('email', UtilsForm.computeRules('Email', {
  required: true,
  pattern: Regex.EMAIL,
}))}
```

## Error Handling

### Client-Side Error Display

```tsx
// Display validation errors inline
<BaseInput
  {...register('name')}
  label="Patient Name"
  isInvalid={!!errors.name}
  errorMessage={errors.name?.message}
  isRequired
/>

// Display mutation errors with toasts
const mutation = useMutationCreatePatient(hospitalId);

const onSubmit = (data: PatientFormData) => {
  mutation.mutate(data, {
    onSuccess: () => {
      // BaseToast: in-house Base component — import BaseToast from '@/_modules/common/components/BaseToast'
      BaseToast.show({ title: 'Patient created successfully!', color: 'success' });
      reset();
      onClose();
    },
    onError: (error) => {
      BaseToast.show({
        title: `Failed to create patient: ${error.message}`,
        color: 'danger',
      });
    },
  });
};
```

### Server-Side Error Responses

```typescript
// Validation error (400)
return NextResponse.json(
  {
    error: 'Validation failed',
    details: validationResult.error.flatten().fieldErrors
  },
  { status: 400 }
);

// Business logic error (400)
return NextResponse.json(
  { error: 'Patient does not belong to this hospital' },
  { status: 400 }
);

// Not found (404)
return NextResponse.json(
  { error: 'Patient not found' },
  { status: 404 }
);

// Server error (500)
return NextResponse.json(
  { error: 'Internal server error' },
  { status: 500 }
);
```

## Common Validation Patterns

### 1. Patient Creation

```typescript
const schema = z.object({
  name: z.string().min(1).max(200),
  roomNumber: z.string().max(20).optional().or(z.literal('')),
  bedNumber: z.string().max(20).optional().or(z.literal('')),
});
```

### 2. Device Creation

```typescript
const schema = z.object({
  patientId: z.string().regex(/^P\d{3}$/).optional(),
  status: z.enum(['active', 'inactive', 'maintenance']).optional(),
});
```

### 3. Vitals Ingestion

```typescript
const schema = z.object({
  hospitalId: z.string().min(1),
  deviceId: z.string().min(1),
  vitals: z.object({
    heartRate: z.number().int().min(0).max(300).optional(),
    spO2: z.number().int().min(0).max(100).optional(),
    temperature: z.number().min(20).max(50).optional(),
    bloodPressureSystolic: z.number().int().min(0).max(300).optional(),
    bloodPressureDiastolic: z.number().int().min(0).max(200).optional(),
  }),
  metadata: z.object({
    batteryLevel: z.number().int().min(0).max(100).optional(),
    signalStrength: z.number().int().min(0).max(100).optional(),
  }).optional(),
});
```

### 4. Number Validation Examples

```typescript
// Integer validation
const userIdSchema = z.object({
  userId: z.number().int().min(1).max(1000),
});

// Float validation
const priceSchema = z.object({
  price: z.number().min(0.01).max(999999.99),
});

// Age validation
const ageSchema = z.object({
  age: z.number().int().min(0).max(150),
});

// Percentage validation
const discountSchema = z.object({
  discount: z.number().min(0).max(100),
});
```

## Migration Guide

### Converting from Manual Validation to Zod

**Before (Manual Validation)**:

```tsx
const [name, setName] = useState('');
const [error, setError] = useState('');

const handleSubmit = () => {
  if (!name.trim()) {
    setError('Name is required');
    return;
  }
  if (name.length > 200) {
    setError('Name too long');
    return;
  }
  mutation.mutate({ name });
};
```

**After (Zod + React Hook Form)**:

```tsx
const schema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
});

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
});

const onSubmit = (data: z.infer<typeof schema>) => {
  mutation.mutate(data);
};
```

### Converting to UtilsForm with Number Support

**Before (No number validation)**:

```tsx
{...register('age', {
  required: 'Age is required',
  validate: (value) => {
    const num = parseInt(value);
    if (isNaN(num)) return 'Must be a number';
    if (num < 0 || num > 150) return 'Age must be between 0 and 150';
    return true;
  }
})}
```

**After (With UtilsForm)**:

```tsx
{...register('age', UtilsForm.computeRules('Age', {
  required: true,
  isInteger: true,
  min: 0,
  max: 150,
}))}
```

## Checklist for New Forms

- [ ] Create Zod schema in `_modules/common/schemas/`
- [ ] Use React Hook Form with `zodResolver`
- [ ] Display validation errors inline on inputs
- [ ] Use same schema on server-side API route
- [ ] Handle mutation errors with toasts
- [ ] Test all validation rules (including number validation)
- [ ] Add loading states during submission
- [ ] Reset form on success
- [ ] Close modal/dialog on success
- [ ] Test number inputs with min/max/integer constraints

## Best Practices

1. **Always validate on both client and server**
2. **Use Zod for complex validation logic**
3. **Use UtilsForm.computeRules() for simple i18n forms**
4. **Use `isInteger: true` for whole numbers**
5. **Use `isNumber: true` for decimals**
6. **Always set min/max bounds for number fields**
7. **Share schemas between client and server**
8. **Provide user-friendly error messages**
9. **Test edge cases (negative numbers, decimals, etc.)**
10. **Use enums for fixed value sets**

## References

- **React Hook Form**: https://react-hook-form.com/
- **Zod**: https://zod.dev/
- **TanStack Query Error Handling**: https://tanstack.com/query/latest/docs/react/guides/mutations
