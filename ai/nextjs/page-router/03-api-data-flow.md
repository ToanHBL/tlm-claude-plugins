# API & Data Flow (Page Router)

> **Applies to both modes, with one difference: the base URL.** The `apiClient[Domain].ts` /
> TanStack Query pattern below is identical in Mode A and Mode B. Only the target differs — **Mode A**
> fetches an absolute external `NEXT_PUBLIC_API_URL`; **Mode B** fetches same-origin `/api/*` handlers
> backed by Prisma (see `05-fullstack-nextjs-api-prisma.md`). The "no server" statements here are the
> Mode A default; in Mode B the server is this app's own App Router route handlers (`app/api/**/route.ts`).

## Overview

Page Router uses **React Query** (TanStack Query) for client-side data fetching and caching. This document covers the complete data flow architecture from API calls to component rendering.

---

## Architecture Layers

Static export = **no server**, so there is no server-action / BFF layer. The browser calls the external
backend directly:

```
External Backend API  (absolute URL, e.g. NEXT_PUBLIC_API_URL)
         ↓  (fetch/axios straight from the browser — CORS must allow the SPA origin)
API Client (_modules/_api/)                   [React Query hooks — the ONLY data layer]
         ↓
Screen Component (_modules/pages/)            [Business logic]
         ↓
UI Components                                  [Presentation]
```

---

## API Client Structure

### Folder Organization

```
_modules/
├── _api/                          # React Query hooks (client-side) — the ONLY data layer
│   ├── apiClientProduct.ts        # Product CRUD → external backend
│   ├── apiClientUser.ts           # User operations → external backend
│   └── apiClientOrder.ts          # Order operations → external backend
└── common/
    └── utils/
        └── utilsApi.ts            # axios instance pointed at the external backend base URL
```

> No `_modules/server/` folder: there is no server runtime in a static export. Everything the app does
> at runtime happens in the browser.

---

## API Utility Functions

### utilsApi.ts

```typescript
// src/_modules/common/utils/utilsApi.ts
import axios, { AxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.example.com';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor (add auth tokens, etc.)
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor (handle errors globally)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const UtilsApi = {
  get: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await axiosInstance.get<T>(url, config);
    return response.data;
  },

  post: async <T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const response = await axiosInstance.post<T>(url, data, config);
    return response.data;
  },

  put: async <T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const response = await axiosInstance.put<T>(url, data, config);
    return response.data;
  },

  delete: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await axiosInstance.delete<T>(url, config);
    return response.data;
  },
};

export default UtilsApi;
```

---

## API Client Pattern

### Simplified Naming Convention

**Domain is implicit from filename** - no need to repeat in function names.

```typescript
// ✅ CORRECT: apiClientProduct.ts
export const useQueryList = () => {...}         // Not useQueryProductList
export const useQueryDetail = (id) => {...}     // Not useQueryProductDetail
export const useMutationCreate = () => {...}    // Not useMutationProductCreate
export const useMutationUpdate = () => {...}    // Not useMutationProductUpdate
export const useMutationDelete = () => {...}    // Not useMutationProductDelete

// Usage: apiClientProduct.useQueryList()
```

### Complete API Client Example

```typescript
// src/_modules/_api/apiClientProduct.ts
'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import UtilsApi from '@/_modules/common/utils/utilsApi';
import BaseToast from '@/_modules/common/components/BaseToast';

// Types
export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  categoryId: string;
  createdAt: string;
}

// API Endpoints — paths on the EXTERNAL backend (UtilsApi.baseURL = NEXT_PUBLIC_API_URL).
// These are NOT Next.js pages/api routes; the `/api/...` prefix here belongs to the backend, and every
// request goes cross-origin straight from the browser.
const API_ENDPOINTS = {
  LIST: '/products',
  DETAIL: (id: string) => `/products/${id}`,
  CREATE: '/products',
  UPDATE: (id: string) => `/products/${id}`,
  DELETE: (id: string) => `/products/${id}`,
};

// ============================================
// QUERIES (Read Operations)
// ============================================

// LIST - Fetch all products
export const useQueryList = (params?: {
  categoryId?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['product-list', params],
    queryFn: () =>
      UtilsApi.get<Product[]>(API_ENDPOINTS.LIST, { params }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// DETAIL - Fetch single product
export const useQueryDetail = (id: string) => {
  return useQuery({
    queryKey: ['product-detail', id],
    queryFn: () => UtilsApi.get<Product>(API_ENDPOINTS.DETAIL(id)),
    enabled: !!id, // Only run if id exists
    staleTime: 5 * 60 * 1000,
  });
};

// ============================================
// MUTATIONS (Write Operations)
// ============================================

// CREATE - Add new product
export const useMutationCreate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Product, 'id' | 'createdAt'>) =>
      UtilsApi.post<Product>(API_ENDPOINTS.CREATE, data),
    onSuccess: () => {
      // Invalidate list to refetch
      queryClient.invalidateQueries({ queryKey: ['product-list'] });

      // Show success toast
      BaseToast.show({
        title: 'Product created successfully!',
        color: 'success',
      });
    },
    onError: (error: any) => {
      BaseToast.show({
        title: `Failed to create product: ${error.response?.data?.message || error.message}`,
        color: 'danger',
      });
    },
  });
};

// UPDATE - Modify existing product
export const useMutationUpdate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
    } & Partial<Omit<Product, 'id' | 'createdAt'>>) =>
      UtilsApi.put<Product>(API_ENDPOINTS.UPDATE(id), data),
    onSuccess: (updatedProduct) => {
      // Invalidate both list and detail
      queryClient.invalidateQueries({ queryKey: ['product-list'] });
      queryClient.invalidateQueries({
        queryKey: ['product-detail', updatedProduct.id],
      });

      BaseToast.show({
        title: 'Product updated successfully!',
        color: 'success',
      });
    },
    onError: (error: any) => {
      BaseToast.show({
        title: `Failed to update product: ${error.response?.data?.message || error.message}`,
        color: 'danger',
      });
    },
  });
};

// DELETE - Remove product
export const useMutationDelete = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => UtilsApi.delete(API_ENDPOINTS.DELETE(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-list'] });

      BaseToast.show({
        title: 'Product deleted successfully!',
        color: 'success',
      });
    },
    onError: (error: any) => {
      BaseToast.show({
        title: `Failed to delete product: ${error.response?.data?.message || error.message}`,
        color: 'danger',
      });
    },
  });
};
```

---

## Using API Clients in Screens

### List Screen

```tsx
// src/_modules/pages/Product/ProductListScreen.tsx
'use client';

import { useState } from 'react';
import * as apiClientProduct from '@/_modules/_api/apiClientProduct';
import Col from '@/_modules/common/components/Col';
import Row from '@/_modules/common/components/Row';
import BaseButton from '@/_modules/common/components/BaseButton';
import ProductCard from './components/ProductCard';
import ProductForm from './components/ProductForm';

export default function ProductListScreen() {
  const [showForm, setShowForm] = useState(false);

  // Fetch products
  const { data: products, isLoading, error } = apiClientProduct.useQueryList();

  // Mutations
  const mutationDelete = apiClientProduct.useMutationDelete();

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      mutationDelete.mutate(id);
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading products...</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-red-500">
        Error loading products: {error.message}
      </div>
    );
  }

  return (
    <Col className="gap-6 p-6">
      <Row className="items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <BaseButton onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add Product'}
        </BaseButton>
      </Row>

      {showForm && (
        <ProductForm onSuccess={() => setShowForm(false)} />
      )}

      <div className="grid grid-cols-3 gap-4">
        {products?.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onDelete={() => handleDelete(product.id)}
          />
        ))}
      </div>
    </Col>
  );
}
```

### Detail Screen

```tsx
// src/_modules/pages/Product/ProductDetailScreen.tsx
'use client';

import { useState } from 'react';
import * as apiClientProduct from '@/_modules/_api/apiClientProduct';
import Col from '@/_modules/common/components/Col';
import BaseButton from '@/_modules/common/components/BaseButton';
import ProductForm from './components/ProductForm';

export default function ProductDetailScreen({
  productId,
}: {
  productId: string;
}) {
  const [isEditing, setIsEditing] = useState(false);

  // Fetch product detail
  const { data: product, isLoading } = apiClientProduct.useQueryDetail(productId);

  if (isLoading) {
    return <div className="p-6">Loading product...</div>;
  }

  if (!product) {
    return <div className="p-6">Product not found</div>;
  }

  if (isEditing) {
    return (
      <Col className="p-6">
        <ProductForm
          initialData={product}
          onSuccess={() => setIsEditing(false)}
        />
      </Col>
    );
  }

  return (
    <Col className="gap-4 p-6">
      <img src={product.imageUrl} alt={product.name} className="w-full h-64 object-cover" />
      <h1 className="text-3xl font-bold">{product.name}</h1>
      <p className="text-2xl text-primary">${product.price}</p>
      <p className="text-gray-600">{product.description}</p>
      <BaseButton onClick={() => setIsEditing(true)}>
        Edit Product
      </BaseButton>
    </Col>
  );
}
```

### Form Component

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
  imageUrl: string;
  categoryId: string;
}

export default function ProductForm({
  initialData,
  onSuccess,
}: {
  initialData?: apiClientProduct.Product;
  onSuccess?: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: initialData,
  });

  const mutationCreate = apiClientProduct.useMutationCreate();
  const mutationUpdate = apiClientProduct.useMutationUpdate();

  const onSubmit = (data: FormData) => {
    if (initialData) {
      // Update existing
      mutationUpdate.mutate(
        { id: initialData.id, ...data },
        { onSuccess }
      );
    } else {
      // Create new
      mutationCreate.mutate(data, { onSuccess });
    }
  };

  const isSubmitting = mutationCreate.isPending || mutationUpdate.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Col className="gap-4">
        <BaseInput
          label="Product Name"
          {...register(
            'name',
            UtilsForm.computeRules('Product Name', {
              required: true,
              minLength: 3,
              maxLength: 100,
            })
          )}
          isInvalid={!!errors.name}
          errorMessage={errors.name?.message}
        />

        <BaseInput
          type="number"
          label="Price"
          {...register(
            'price',
            UtilsForm.computeRules('Price', {
              required: true,
              isNumber: true,
              min: 0.01,
            })
          )}
          isInvalid={!!errors.price}
          errorMessage={errors.price?.message}
        />

        <BaseInput
          label="Description"
          {...register(
            'description',
            UtilsForm.computeRules('Description', {
              required: true,
              minLength: 10,
              maxLength: 500,
            })
          )}
          isInvalid={!!errors.description}
          errorMessage={errors.description?.message}
        />

        <BaseInput
          label="Image URL"
          {...register(
            'imageUrl',
            UtilsForm.computeRules('Image URL', {
              required: true,
              pattern: {
                value: /^https?:\/\/.+/,
                message: 'Must be a valid URL',
              },
            })
          )}
          isInvalid={!!errors.imageUrl}
          errorMessage={errors.imageUrl?.message}
        />

        <BaseButton
          type="submit"
          color="primary"
          isLoading={isSubmitting}
        >
          {initialData ? 'Update Product' : 'Create Product'}
        </BaseButton>
      </Col>
    </form>
  );
}
```

---

## Advanced Patterns

### Pagination

```typescript
// API Client with pagination
export const useQueryList = (params?: {
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['product-list', params],
    queryFn: () =>
      UtilsApi.get<{ products: Product[]; total: number; hasMore: boolean }>(
        API_ENDPOINTS.LIST,
        { params }
      ),
    keepPreviousData: true, // Keep old data while fetching new page
  });
};
```

```tsx
// Screen with pagination
export default function ProductListScreen() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = apiClientProduct.useQueryList({ page, limit: 20 });

  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        {data?.products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <Row className="justify-center gap-2 mt-4">
        <BaseButton
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </BaseButton>
        <span>Page {page}</span>
        <BaseButton
          onClick={() => setPage((p) => p + 1)}
          disabled={!data?.hasMore}
        >
          Next
        </BaseButton>
      </Row>
    </>
  );
}
```

### Optimistic Updates

```typescript
// Mutation with optimistic update
export const useMutationUpdate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: any) =>
      UtilsApi.put<Product>(API_ENDPOINTS.UPDATE(id), data),

    // Optimistic update
    onMutate: async (variables) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['product-list'] });

      // Snapshot previous value
      const previousProducts = queryClient.getQueryData(['product-list']);

      // Optimistically update
      queryClient.setQueryData(['product-list'], (old: Product[] = []) => {
        return old.map((p) =>
          p.id === variables.id ? { ...p, ...variables } : p
        );
      });

      // Return context with snapshot
      return { previousProducts };
    },

    // Rollback on error
    onError: (err, variables, context) => {
      queryClient.setQueryData(['product-list'], context?.previousProducts);
    },

    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['product-list'] });
    },
  });
};
```

### Dependent Queries

```tsx
export default function ProductDetailScreen({ productId }: { productId: string }) {
  // First query
  const { data: product } = apiClientProduct.useQueryDetail(productId);

  // Second query depends on first
  const { data: reviews } = apiClientReview.useQueryList(product?.reviewId, {
    enabled: !!product?.reviewId, // Only run when product loads
  });

  return <div>{/* Render */}</div>;
}
```

### Polling

```typescript
export const useQueryList = () => {
  return useQuery({
    queryKey: ['product-list'],
    queryFn: () => UtilsApi.get<Product[]>(API_ENDPOINTS.LIST),
    refetchInterval: 30000, // Poll every 30 seconds
    refetchIntervalInBackground: false, // Stop when tab inactive
  });
};
```

---

## Error Handling

### Global Error Handling (utilsApi.ts)

Already covered in interceptors above.

### Component-Level Error Handling

```tsx
export default function ProductListScreen() {
  const { data, error, isError } = apiClientProduct.useQueryList();

  if (isError) {
    return (
      <Col className="items-center justify-center p-6">
        <p className="text-red-500">Error: {error.message}</p>
        <BaseButton onClick={() => window.location.reload()}>
          Retry
        </BaseButton>
      </Col>
    );
  }

  return <div>{/* Render products */}</div>;
}
```

---

## Best Practices

### 1. Use Simplified Naming

```typescript
// ✅ CORRECT: Domain implicit from filename
// apiClientProduct.ts
export const useQueryList = () => {...}

// ❌ WRONG: Repeating domain in name
export const useQueryProductList = () => {...}
```

### 2. Invalidate Queries After Mutations

```typescript
// ✅ CORRECT
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['product-list'] });
}

// ❌ WRONG: Not invalidating leads to stale data
onSuccess: () => {
  // Nothing here
}
```

### 3. Use Query Keys Consistently

```typescript
// ✅ CORRECT: Consistent query keys
['product-list', params]
['product-detail', id]

// ❌ WRONG: Inconsistent naming
['products', params]
['product', id]
```

### 4. Handle Loading & Error States

```tsx
// ✅ CORRECT
if (isLoading) return <LoadingSpinner />;
if (isError) return <ErrorMessage error={error} />;

// ❌ WRONG: Not handling states
return <div>{data?.map(...)}</div>;  // Crashes if data undefined
```

---

## Quick Reference

```typescript
// API Client Structure
_api/apiClient[Domain].ts

// Query (Read)
export const useQueryList = () => useQuery({...});
export const useQueryDetail = (id) => useQuery({...});

// Mutation (Write)
export const useMutationCreate = () => useMutation({...});
export const useMutationUpdate = () => useMutation({...});
export const useMutationDelete = () => useMutation({...});

// Usage in Component
const { data, isLoading, error } = apiClient[Domain].useQueryList();
const mutation = apiClient[Domain].useMutationCreate();
mutation.mutate(data, { onSuccess: () => {...} });
```

---

## Next Steps

1. **Read**: `page-router/04-migration-to-app-router.md` (migration guide)
2. **Read**: `shared/05-validation-patterns.md` (form validation)
3. **Reference**: `shared/03-component-patterns.md` (component rules)

---

**Last Updated**: January 2024
**Next.js Version**: 12-14 (Page Router)
