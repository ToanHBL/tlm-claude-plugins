# Server Actions (App Router)

## Overview

**Server Actions** are asynchronous server-side functions that can be called directly from React components. They replace traditional API routes for data mutations and server-side operations.

**Key Benefits:**
- Type-safe end-to-end (no API layer needed)
- Automatic request deduplication
- Built-in loading/error states
- Progressive enhancement (works without JS)
- Seamless integration with React Query

---

## Architecture Pattern

```
_modules/
├── server/
│   └── actions/              # Server Actions (mark with 'use server')
│       ├── feedback.ts       # Feedback CRUD operations
│       └── product.ts        # Product CRUD operations
└── _api/                     # React Query hooks (client-side)
    ├── apiClientFeedback.ts  # Wraps feedback actions in useQuery/useMutation
    └── apiClientProduct.ts   # Wraps product actions in useQuery/useMutation
```

**Pattern:**
1. **Server Actions** (`server/actions/`) - Pure server-side logic
2. **API Client** (`_api/`) - React Query wrappers for client components

---

## Creating Server Actions

### Basic Server Action

```typescript
// src/_modules/server/actions/feedback.ts
'use server';  // CRITICAL: Mark file as server-only

export interface Feedback {
  id: string;
  type: 'glad' | 'sad' | 'mad';
  message: string;
  author: string;
  createdAt: string;
}

// Mock storage (replace with database)
let mockFeedbackData: Feedback[] = [];

// READ operation
export async function fetchFeedbackAction(): Promise<Feedback[]> {
  // Simulate database delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  return [...mockFeedbackData];
}

// CREATE operation
export async function createFeedbackAction(
  feedback: Omit<Feedback, 'id' | 'createdAt'>
): Promise<Feedback> {
  const newFeedback: Feedback = {
    ...feedback,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };

  mockFeedbackData.push(newFeedback);
  return newFeedback;
}

// UPDATE operation
export async function updateFeedbackAction(
  id: string,
  updates: Partial<Omit<Feedback, 'id' | 'createdAt'>>
): Promise<Feedback> {
  const index = mockFeedbackData.findIndex((f) => f.id === id);

  if (index === -1) {
    throw new Error('Feedback not found');
  }

  mockFeedbackData[index] = {
    ...mockFeedbackData[index],
    ...updates,
  };

  return mockFeedbackData[index];
}

// DELETE operation
export async function deleteFeedbackAction(id: string): Promise<void> {
  mockFeedbackData = mockFeedbackData.filter((f) => f.id !== id);
}
```

---

## Wrapping with React Query

### API Client Layer

```typescript
// src/_modules/_api/apiClientFeedback.ts
'use client';  // Client-side hooks

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  fetchFeedbackAction,
  createFeedbackAction,
  updateFeedbackAction,
  deleteFeedbackAction,
  type Feedback,
} from '@/_modules/server/actions/feedback';
import BaseToast from '@/_modules/common/components/BaseToast';

// Simplified naming - domain is implicit from filename

// LIST query
export const useQueryList = () => {
  return useQuery({
    queryKey: ['feedback-list'],
    queryFn: () => fetchFeedbackAction(),
  });
};

// CREATE mutation
export const useMutationCreate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Feedback, 'id' | 'createdAt'>) =>
      createFeedbackAction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-list'] });
      BaseToast.show({ title: 'Feedback created!', color: 'success' });
    },
    onError: (error) => {
      BaseToast.show({
        title: `Failed to create feedback: ${error.message}`,
        color: 'danger',
      });
    },
  });
};

// UPDATE mutation
export const useMutationUpdate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...updates
    }: {
      id: string;
    } & Partial<Omit<Feedback, 'id' | 'createdAt'>>) =>
      updateFeedbackAction(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-list'] });
      BaseToast.show({ title: 'Feedback updated!', color: 'success' });
    },
  });
};

// DELETE mutation
export const useMutationDelete = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteFeedbackAction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-list'] });
      BaseToast.show({ title: 'Feedback deleted!', color: 'success' });
    },
  });
};
```

---

## Using in Components

### Screen Component

```tsx
// src/_modules/pages/Feedback/FeedbackListScreen.tsx
'use client';

import { useState } from 'react';
import * as apiClientFeedback from '@/_modules/_api/apiClientFeedback';
import Col from '@/_modules/common/components/Col';
import Row from '@/_modules/common/components/Row';
import BaseButton from '@/_modules/common/components/BaseButton';
import FeedbackCard from './components/FeedbackCard';
import FeedbackForm from './components/FeedbackForm';

export default function FeedbackListScreen() {
  const [showForm, setShowForm] = useState(false);

  // Query list
  const { data: feedbackList, isLoading } = apiClientFeedback.useQueryList();

  // Mutations
  const mutationCreate = apiClientFeedback.useMutationCreate();
  const mutationDelete = apiClientFeedback.useMutationDelete();

  const handleCreate = (data: any) => {
    mutationCreate.mutate(data, {
      onSuccess: () => setShowForm(false),
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this feedback?')) {
      mutationDelete.mutate(id);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <Col className="gap-4 p-6">
      <Row className="items-center justify-between">
        <h1 className="text-2xl font-bold">Feedback</h1>
        <BaseButton onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add Feedback'}
        </BaseButton>
      </Row>

      {showForm && (
        <FeedbackForm
          onSubmit={handleCreate}
          isSubmitting={mutationCreate.isPending}
        />
      )}

      <Col className="gap-3">
        {feedbackList?.map((feedback) => (
          <FeedbackCard
            key={feedback.id}
            feedback={feedback}
            onDelete={() => handleDelete(feedback.id)}
          />
        ))}
      </Col>
    </Col>
  );
}
```

---

## Database Integration

### Prisma Example

```typescript
// src/_modules/server/actions/product.ts
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
}

// READ
export async function fetchProductsAction(): Promise<Product[]> {
  return await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

// READ ONE
export async function fetchProductAction(id: string): Promise<Product | null> {
  return await prisma.product.findUnique({
    where: { id },
  });
}

// CREATE
export async function createProductAction(
  data: Omit<Product, 'id'>
): Promise<Product> {
  const product = await prisma.product.create({
    data,
  });

  revalidatePath('/products');  // Revalidate cached page
  return product;
}

// UPDATE
export async function updateProductAction(
  id: string,
  data: Partial<Omit<Product, 'id'>>
): Promise<Product> {
  const product = await prisma.product.update({
    where: { id },
    data,
  });

  revalidatePath('/products');
  revalidatePath(`/products/${id}`);
  return product;
}

// DELETE
export async function deleteProductAction(id: string): Promise<void> {
  await prisma.product.delete({
    where: { id },
  });

  revalidatePath('/products');
}
```

### MongoDB Example

```typescript
// src/_modules/server/actions/user.ts
'use server';

import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

export async function fetchUsersAction() {
  await connectDB();
  const users = await User.find().sort({ createdAt: -1 }).lean();
  return JSON.parse(JSON.stringify(users));  // Serialize dates
}

export async function createUserAction(data: any) {
  await connectDB();
  const user = await User.create(data);
  return JSON.parse(JSON.stringify(user));
}
```

---

## Error Handling

### Server-Side Error Handling

```typescript
// src/_modules/server/actions/product.ts
'use server';

export async function createProductAction(data: any): Promise<Product> {
  try {
    // Validation
    if (!data.name || data.name.length < 3) {
      throw new Error('Product name must be at least 3 characters');
    }

    if (!data.price || data.price <= 0) {
      throw new Error('Price must be greater than 0');
    }

    // Database operation
    const product = await prisma.product.create({
      data,
    });

    revalidatePath('/products');
    return product;
  } catch (error) {
    // Log error server-side
    console.error('[createProductAction]', error);

    // Throw user-friendly error
    if (error instanceof Error) {
      throw new Error(`Failed to create product: ${error.message}`);
    }

    throw new Error('Failed to create product. Please try again.');
  }
}
```

### Client-Side Error Handling

```typescript
// src/_modules/_api/apiClientProduct.ts
'use client';

export const useMutationCreate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => createProductAction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-list'] });
      BaseToast.show({ title: 'Product created!', color: 'success' });
    },
    onError: (error: Error) => {
      // Error already handled by server action
      BaseToast.show({
        title: `Error: ${error.message}`,
        color: 'danger',
      });
    },
  });
};
```

---

## Form Integration

### React Hook Form with Server Actions

```tsx
// src/_modules/pages/Product/components/ProductForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import * as apiClientProduct from '@/_modules/_api/apiClientProduct';
import BaseInput from '@/_modules/common/components/BaseInput';
import BaseButton from '@/_modules/common/components/BaseButton';
import Col from '@/_modules/common/components/Col';
import UtilsForm from '@/_modules/common/utils/utilsForm';

interface FormData {
  name: string;
  price: number;
  description: string;
}

export default function ProductForm({ onSuccess }: { onSuccess?: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  const mutationCreate = apiClientProduct.useMutationCreate();

  const onSubmit = (data: FormData) => {
    mutationCreate.mutate(data, {
      onSuccess: () => {
        onSuccess?.();
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Col className="gap-4">
        <BaseInput
          label="Product Name"
          {...register('name', UtilsForm.computeRules('Product Name', {
            required: true,
            minLength: 3,
            maxLength: 100,
          }))}
          isInvalid={!!errors.name}
          errorMessage={errors.name?.message}
        />

        <BaseInput
          type="number"
          label="Price"
          {...register('price', UtilsForm.computeRules('Price', {
            required: true,
            isNumber: true,
            min: 0.01,
          }))}
          isInvalid={!!errors.price}
          errorMessage={errors.price?.message}
        />

        <BaseInput
          label="Description"
          {...register('description', UtilsForm.computeRules('Description', {
            required: true,
            minLength: 10,
          }))}
          isInvalid={!!errors.description}
          errorMessage={errors.description?.message}
        />

        <BaseButton
          type="submit"
          color="primary"
          isLoading={mutationCreate.isPending}
        >
          Create Product
        </BaseButton>
      </Col>
    </form>
  );
}
```

---

## Progressive Enhancement

### Server Actions with formData

```typescript
// src/_modules/server/actions/newsletter.ts
'use server';

export async function subscribeToNewsletterAction(formData: FormData) {
  const email = formData.get('email') as string;

  // Validation
  if (!email || !email.includes('@')) {
    return { error: 'Invalid email address' };
  }

  try {
    // Save to database
    await saveEmailToNewsletter(email);

    return { success: true };
  } catch (error) {
    return { error: 'Failed to subscribe. Please try again.' };
  }
}
```

```tsx
// Component using form action (works without JavaScript)
'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { subscribeToNewsletterAction } from '@/_modules/server/actions/newsletter';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Subscribing...' : 'Subscribe'}
    </button>
  );
}

export default function NewsletterForm() {
  const [state, formAction] = useFormState(subscribeToNewsletterAction, null);

  return (
    <form action={formAction}>
      <input
        type="email"
        name="email"
        placeholder="Enter your email"
        required
      />
      <SubmitButton />

      {state?.error && <p className="text-red-500">{state.error}</p>}
      {state?.success && <p className="text-green-500">Subscribed!</p>}
    </form>
  );
}
```

---

## Authentication & Authorization

### Protected Server Actions

```typescript
// src/_modules/server/actions/admin.ts
'use server';

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function deleteUserAction(userId: string) {
  const session = await auth();

  // Check authentication
  if (!session) {
    redirect('/login');
  }

  // Check authorization
  if (session.user.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required');
  }

  // Perform action
  await prisma.user.delete({
    where: { id: userId },
  });

  revalidatePath('/admin/users');
}
```

---

## Revalidation Strategies

### Path Revalidation

```typescript
import { revalidatePath } from 'next/cache';

// Revalidate specific path
revalidatePath('/products');

// Revalidate with type
revalidatePath('/products', 'page');      // Single page
revalidatePath('/products', 'layout');    // Layout and all children
```

### Tag Revalidation

```typescript
import { revalidateTag } from 'next/cache';

// Tag data fetching
export async function fetchProductsAction() {
  const products = await fetch('https://api.example.com/products', {
    next: { tags: ['products'] },
  });
  return products.json();
}

// Revalidate by tag
export async function createProductAction(data: any) {
  await prisma.product.create({ data });
  revalidateTag('products');  // Revalidates all fetches with 'products' tag
}
```

---

## Best Practices

### 1. Use 'use server' Directive

```typescript
// ✅ CORRECT: Mark file as server-only
'use server';

export async function createProductAction(data: any) {
  // ...
}

// ❌ WRONG: Forgetting directive allows client import
export async function createProductAction(data: any) {
  // This might run on client if imported!
}
```

### 2. Wrap with React Query

```typescript
// ✅ CORRECT: Wrap in React Query for loading/error states
export const useMutationCreate = () => {
  return useMutation({
    mutationFn: createProductAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

// ❌ WRONG: Calling server actions directly loses benefits
<button onClick={() => createProductAction(data)}>
  Create
</button>
```

### 3. Validate Input

```typescript
// ✅ CORRECT: Validate all inputs
export async function createProductAction(data: any) {
  if (!data.name || data.name.length < 3) {
    throw new Error('Invalid product name');
  }

  // Continue...
}

// ❌ WRONG: Trusting client data
export async function createProductAction(data: any) {
  return prisma.product.create({ data });  // Dangerous!
}
```

### 4. Return Serializable Data

```typescript
// ✅ CORRECT: Return plain objects
export async function fetchProductsAction() {
  const products = await prisma.product.findMany();
  return products;  // Prisma returns plain objects
}

// ❌ WRONG: Returning non-serializable data
export async function fetchProductsAction() {
  const products = await prisma.product.findMany();
  return {
    products,
    createdAt: new Date(),  // Date objects don't serialize
  };
}

// Fix:
return {
  products,
  createdAt: new Date().toISOString(),  // Convert to string
};
```

---

## Comparison: Server Actions vs API Routes

| Feature | Server Actions | API Routes |
|---------|----------------|------------|
| **Location** | `_modules/server/actions/` | `app/api/` |
| **Type Safety** | End-to-end | Requires tRPC/Zod |
| **Boilerplate** | Minimal | More verbose |
| **Caching** | Automatic | Manual |
| **Progressive Enhancement** | ✅ Yes | ❌ No |
| **Best For** | CRUD operations | Webhooks, 3rd party APIs |

---

## Migration from API Routes

### Before (API Route)

```typescript
// app/api/products/route.ts
export async function POST(request: Request) {
  const data = await request.json();
  const product = await prisma.product.create({ data });
  return Response.json(product);
}
```

```typescript
// Client
const response = await fetch('/api/products', {
  method: 'POST',
  body: JSON.stringify(data),
});
const product = await response.json();
```

### After (Server Action)

```typescript
// _modules/server/actions/product.ts
'use server';

export async function createProductAction(data: any) {
  return await prisma.product.create({ data });
}
```

```typescript
// _modules/_api/apiClientProduct.ts
export const useMutationCreate = () => {
  return useMutation({
    mutationFn: createProductAction,
  });
};
```

**Benefits:**
- No API route needed
- Type-safe end-to-end
- Less boilerplate

---

## Quick Reference

```typescript
// Server Action Structure
'use server';

export async function actionName(params: Type): Promise<ReturnType> {
  // 1. Validate input
  // 2. Check auth (if needed)
  // 3. Perform operation
  // 4. Revalidate cache
  // 5. Return result
}

// API Client Wrapper
'use client';

export const useMutationName = () => {
  return useMutation({
    mutationFn: actionName,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['key'] });
      BaseToast.show({ title: 'Success!', color: 'success' });
    },
  });
};
```

---

## Next Steps

1. **Read**: `app-router/04-data-fetching.md` (fetching patterns)
2. **Read**: `shared-fe/05-validation-patterns.md` (form validation)
3. **Reference**: `shared-fe/03-component-patterns.md` (component rules)

---

**Last Updated**: January 2024
**Next.js Version**: 13.4+ (Server Actions stable)
