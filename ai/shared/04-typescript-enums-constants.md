# TypeScript Enums and Constants Pattern

## Overview

This project follows a strict pattern of using **enums and constants** instead of string literals in interfaces and type definitions. This ensures type safety, prevents typos, and makes refactoring easier.

## Key Principle

**CRITICAL RULE**: Avoid using string literals inside interfaces. Always define enums or const objects for reusable values.

```typescript
// ❌ Wrong: String literals in interface
interface User {
  role: 'admin' | 'user' | 'guest';
  status: 'active' | 'inactive';
}

// ✅ Correct: Use enums
enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}

enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

interface User {
  role: UserRole;
  status: UserStatus;
}
```

## Enum Patterns

### 1. String Enums (Preferred)

```typescript
// Feedback type enum
export enum FeedbackType {
  GLAD = 'glad',
  SAD = 'sad',
  MAD = 'mad',
}

// Usage in interface
export interface Feedback {
  id: string;
  type: FeedbackType;  // ✅ Enum instead of 'glad' | 'sad' | 'mad'
  message: string;
  author: string;
  createdAt: string;
}

// Usage in code
const feedback: Feedback = {
  id: '1',
  type: FeedbackType.GLAD,  // ✅ Type-safe
  message: 'Great work!',
  author: 'John',
  createdAt: new Date().toISOString(),
};

// Usage in switch statements
function getFeedbackColor(type: FeedbackType) {
  switch (type) {
    case FeedbackType.GLAD:
      return 'bg-green-50';
    case FeedbackType.SAD:
      return 'bg-blue-50';
    case FeedbackType.MAD:
      return 'bg-red-50';
  }
}

// Usage in filters
const gladFeedback = feedbackList.filter((f) => f.type === FeedbackType.GLAD);
```

### 2. Numeric Enums

```typescript
// Status codes
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  NOT_FOUND = 404,
  SERVER_ERROR = 500,
}

// Usage
if (response.status === HttpStatus.OK) {
  // Handle success
}
```

### 3. Const Enums (Compile-time Only)

```typescript
// Use for values that don't need runtime representation
const enum Direction {
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right',
}

// Gets compiled away - no runtime overhead
function move(direction: Direction) {
  // Implementation
}
```

## Constant Objects Pattern

### 1. Query Keys

```typescript
// Use const objects for React Query keys
const QUERY_KEYS = {
  FEEDBACK_LIST: 'feedback-list',
  FEEDBACK_DETAIL: 'feedback-detail',
  USER_PROFILE: 'user-profile',
} as const;

// Usage
export const useQueryList = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.FEEDBACK_LIST],
    queryFn: () => fetchFeedbackAction(),
  });
};
```

### 2. Route Constants

```typescript
// Route links enum
export enum RouteLinks {
  HOME = '/',
  DASHBOARD = '/dashboard',
  GLAD_SAD_MAD = '/glad-sad-mad',
  PROFILE = '/profile',
}

// Usage
router.push(RouteLinks.DASHBOARD);
```

### 3. Configuration Constants

```typescript
// API configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  VERSION: process.env.NEXT_PUBLIC_API_VERSION,
  TIMEOUT: 30000,
} as const;

// Validation rules
export const VALIDATION_RULES = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_USERNAME_LENGTH: 50,
  EMAIL_PATTERN: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
} as const;
```

## Export and Import Patterns

### 1. Export Enums with Types

```typescript
// server/actions/feedback.ts
export enum FeedbackType {
  GLAD = 'glad',
  SAD = 'sad',
  MAD = 'mad',
}

export interface Feedback {
  id: string;
  type: FeedbackType;
  message: string;
}

// Export both
export { FeedbackType, type Feedback };
```

### 2. Re-export from API Client

```typescript
// _api/apiClientFeedback.ts
import {
  FeedbackType,
  type Feedback,
} from '@/_modules/server/actions/feedback';

// Re-export for convenience
export { FeedbackType };
export type { Feedback };

// Now components can import from API client
// import { FeedbackType, type Feedback } from '@/_modules/_api/apiClientFeedback';
```

### 3. Import in Components

```typescript
// Component using enum
import { FeedbackType, type Feedback } from '@/_modules/_api/apiClientFeedback';

interface FeedbackFormData {
  type: FeedbackType;  // ✅ Use enum
  message: string;
  author: string;
}

export default function MyComponent() {
  const [type, setType] = useState<FeedbackType>(FeedbackType.GLAD);

  return (
    <select value={type} onChange={(e) => setType(e.target.value as FeedbackType)}>
      <option value={FeedbackType.GLAD}>Glad</option>
      <option value={FeedbackType.SAD}>Sad</option>
      <option value={FeedbackType.MAD}>Mad</option>
    </select>
  );
}
```

## React Hook Form with Enums

```typescript
// Form interface with enum
interface FeedbackFormData {
  type: FeedbackType;
  message: string;
  author: string;
}

export default function FeedbackForm() {
  const { register, handleSubmit, setValue, watch } = useForm<FeedbackFormData>({
    defaultValues: {
      type: FeedbackType.GLAD,  // ✅ Enum default value
      message: '',
      author: '',
    },
  });

  const feedbackType = watch('type');

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <RadioGroup
        value={feedbackType}
        onValueChange={(value) => setValue('type', value as FeedbackType)}
      >
        <Radio value={FeedbackType.GLAD}>Glad</Radio>
        <Radio value={FeedbackType.SAD}>Sad</Radio>
        <Radio value={FeedbackType.MAD}>Mad</Radio>
      </RadioGroup>
    </form>
  );
}
```

## When to Use Enums vs Const Objects

### Use Enums When:

- ✅ Values are known at compile time
- ✅ Need type checking in switch statements
- ✅ Values represent a fixed set of options
- ✅ Need to iterate over values
- ✅ Values are used in multiple places

```typescript
enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}
```

### Use Const Objects When:

- ✅ Need runtime metadata
- ✅ Values are configuration-based
- ✅ Need to add methods or computed properties
- ✅ Need deep readonly nested objects

```typescript
const API_ENDPOINTS = {
  USERS: {
    LIST: '/api/users',
    CREATE: '/api/users',
    UPDATE: (id: string) => `/api/users/${id}`,
    DELETE: (id: string) => `/api/users/${id}`,
  },
  POSTS: {
    LIST: '/api/posts',
    DETAIL: (id: string) => `/api/posts/${id}`,
  },
} as const;
```

## Interface Design Patterns

### 1. Trust Boundaries

```typescript
// ✅ Use explicit undefined for better IDE support
interface ModalContentProps {
  id: string | undefined;              // External data - explicit undefined
  onSuccess: (() => void) | undefined; // Optional callback - explicit undefined
  onCancel: () => void;                // Internal function - always provided (required)
}

interface FormProps {
  // External data properties - use explicit undefined for better IDE hints
  title: string | undefined;
  author: string | undefined;
  isbn: string | undefined;
  // Internal UI properties - always provided
  formTitle: string;
  submitButtonText: string;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
  // Optional with defaults
  isSubmitting?: boolean;
}

// ❌ Avoid: Optional properties don't provide explicit type information
interface BadFormProps {
  title?: string;        // Less clear than string | undefined
  onCancel?: () => void; // Should be required if always provided
}
```

### 2. Type Safety with Enums

```typescript
// ✅ Enum provides compile-time checking
function processFeedback(type: FeedbackType) {
  // TypeScript ensures only valid enum values
}

processFeedback(FeedbackType.GLAD);  // ✅ Valid
processFeedback('happy');            // ❌ Type error
```

### 3. Generic Interface Patterns

```typescript
// Generic response wrapper
interface ApiResponse<T> {
  data: T;
  status: HttpStatus;
  message: string;
}

// Usage
type UserResponse = ApiResponse<User>;
type FeedbackResponse = ApiResponse<Feedback[]>;
```

## Benefits

### 1. Type Safety

```typescript
// Enum provides compile-time checking
function processFeedback(type: FeedbackType) {
  // TypeScript ensures only valid enum values
}

processFeedback(FeedbackType.GLAD);  // ✅ Valid
processFeedback('happy');            // ❌ Type error
```

### 2. Autocomplete Support

```typescript
// IDE provides autocomplete for enum values
const type = FeedbackType.  // IDE shows: GLAD, SAD, MAD
```

### 3. Refactoring Safety

```typescript
// If you rename an enum value, TypeScript catches all usages
enum FeedbackType {
  GLAD = 'glad',
  SAD = 'sad',
  FRUSTRATED = 'mad',  // Renamed from MAD
}
// All usages of FeedbackType.MAD will show errors
```

### 4. Prevention of Typos

```typescript
// ❌ String literals - typos won't be caught
const feedback = { type: 'gald' };  // Typo!

// ✅ Enums - typos caught at compile time
const feedback = { type: FeedbackType.GALD };  // Error: GALD doesn't exist
```

## Common Patterns

### 1. Enum with Display Labels

```typescript
export enum FeedbackType {
  GLAD = 'glad',
  SAD = 'sad',
  MAD = 'mad',
}

export const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  [FeedbackType.GLAD]: '😊 Glad - What made you happy',
  [FeedbackType.SAD]: '😢 Sad - What disappointed you',
  [FeedbackType.MAD]: '😠 Mad - What frustrated you',
};

// Usage
const label = FEEDBACK_TYPE_LABELS[FeedbackType.GLAD];
```

### 2. Enum with Colors

```typescript
export const FEEDBACK_TYPE_COLORS: Record<FeedbackType, string> = {
  [FeedbackType.GLAD]: 'bg-green-50 border-green-200',
  [FeedbackType.SAD]: 'bg-blue-50 border-blue-200',
  [FeedbackType.MAD]: 'bg-red-50 border-red-200',
};

// Usage
const colorClass = FEEDBACK_TYPE_COLORS[feedback.type];
```

### 3. Enum with Icons/Emojis

```typescript
export const FEEDBACK_TYPE_EMOJI: Record<FeedbackType, string> = {
  [FeedbackType.GLAD]: '😊',
  [FeedbackType.SAD]: '😢',
  [FeedbackType.MAD]: '😠',
};

// Usage
const emoji = FEEDBACK_TYPE_EMOJI[feedback.type];
```

## Migration from String Literals

### Before (Wrong):

```typescript
interface Feedback {
  type: 'glad' | 'sad' | 'mad';
}

const feedback: Feedback = {
  type: 'glad',
};

function getColor(type: 'glad' | 'sad' | 'mad') {
  if (type === 'glad') return 'green';
}
```

### After (Correct):

```typescript
enum FeedbackType {
  GLAD = 'glad',
  SAD = 'sad',
  MAD = 'mad',
}

interface Feedback {
  type: FeedbackType;
}

const feedback: Feedback = {
  type: FeedbackType.GLAD,
};

function getColor(type: FeedbackType) {
  if (type === FeedbackType.GLAD) return 'green';
}
```

## Best Practices

1. **Always define enums for repeated string values**
2. **Export enums alongside interfaces**
3. **Use UPPER_CASE for enum keys**
4. **Use descriptive enum names** (e.g., `FeedbackType` not `Type`)
5. **Co-locate enums with related interfaces**
6. **Re-export enums from API clients for convenience**
7. **Use Record<Enum, T> for mapping enum values**
8. **Document enum values if not self-explanatory**
9. **Use explicit `undefined` in interfaces for better IDE support**
10. **Distinguish external data (nullable) from internal UI props (required)**

## Summary

| Pattern | Use Case | Example |
|---------|----------|---------|
| String Enum | Fixed set of string values | `FeedbackType`, `UserRole` |
| Numeric Enum | Fixed set of numeric values | `HttpStatus`, `Priority` |
| Const Object | Configuration, nested values | `API_CONFIG`, `ROUTES` |
| Const Assertion | Readonly object values | `QUERY_KEYS as const` |
| Explicit Undefined | External data in interfaces | `title: string \| undefined` |
| Required Props | Internal UI functions | `onCancel: () => void` |

**Remember**: No string literals in interfaces. Always use enums or constants!
