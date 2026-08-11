# Component Patterns & Conventions

## Component Organization

### 1. Directory Structure - Screen-Specific Components Pattern

```
src/
├── _modules/                        # Framework-agnostic (100% portable)
│   ├── common/
│   │   ├── components/              # ONLY truly shared components
│   │   │   ├── Base*.tsx           # In-house Tailwind primitives (BaseButton, BaseInput)
│   │   │   ├── Col.tsx, Row.tsx    # Layout components (used everywhere)
│   │   │   ├── Box.tsx, Flex.tsx   # Container components
│   │   │   └── TextPrimary.tsx     # Typography component (in-house structural text)
│   │   ├── hooks/                  # Reusable custom hooks
│   │   ├── utils/                  # Pure utility functions (UtilsForm, UtilsString)
│   │   └── interfaces/             # TypeScript interfaces
│   └── pages/                      # Screen-specific folders
│       └── [ScreenName]/           # e.g., Home, Dashboard, GladSadMad
│           ├── [ScreenName]Screen.tsx    # Main screen component
│           └── components/               # Components ONLY used in this screen
│               ├── Header.tsx           # Screen-specific header
│               ├── FormExample.tsx      # Form only for this screen
│               ├── Card.tsx             # Card only for this screen
│               └── ModalContent.tsx     # Modal only for this screen
└── pages/                          # Next.js routing (routing only)
```

**CRITICAL RULE**: Do NOT create components in `common/components` unless they are:

- Used in multiple screens (3+ screens)
- Truly generic structural components (Col, Row, TextPrimary)
- In-house base primitives styled with Tailwind CSS (BaseButton, BaseInput)

**DEFAULT BEHAVIOR**: Always create components inside the screen's `components/` folder first.

### 2. Component Architecture Rules

- **Abstract naming**: Use abstract component names (e.g., `Form`, `ModalContent`) since folder structure provides domain context
- **Basic components**: `/modules/common/components/` (structural elements like `Col`, `Row`, `TextPrimary`)
- **Base components**: `/modules/common/components/` (in-house Tailwind primitives like `BaseButton`, `BaseInput`)
- **Common components**: `/modules/common/components/` (ONLY if used across multiple domains)
- **Domain components**: `/modules/pages/[Domain]/components/` (e.g., `BookCard`, `OrderSummary`)
- **Domain separation**: Never bring domain-specific components into common folder
- **Prefer structured components**: Always use `Col`/`Row` instead of raw `<div>`, `TextPrimary` instead of raw `<p>`
- **Minimal properties**: Pass abstract properties instead of full objects for better reusability and React shallow comparison

### 3. Component Folder Organization

```
modules/pages/Book/components/
├── BookForm.tsx                # Domain naming
├── BookModalContent.tsx        # Domain naming
├── list/                   # Components for list/grid contexts
│   └── BookCard.tsx           # Future: Domain naming within context
└── detail/                # Components for detail/single contexts
    ├── BookInfo.tsx           # Future: Domain naming within context
    └── BookActions.tsx        # Future: Domain naming within context
```

### 4. Naming Conventions

- **Basic Components**: Simple, descriptive names (`Col`, `Row`, `TextPrimary`, `Box`)
  - **NAMING**: The in-house structural text component is `TextPrimary.tsx` (not `Text` or the historical `TextPrimaryV1`)
- **Base Components**: `Base[ComponentName]` (e.g., `BaseButton`, `BaseInput`)
- **Abstract Components**: Generic names within domain folders (e.g., `Form`, `ModalContent`, `Card`) - folder context provides domain
- **Feature Components**: `[Feature][ComponentName]` only when domain context isn't clear (e.g., `ProductCard` in shared folder)
- **Screen Components**: `[PageName]Screen` (e.g., `HomeIndexScreen`, `ProductDetailScreen`)

## Base Component Pattern

### 1. In-House Primitive Pattern

Base components are our own reusable primitives styled with Tailwind CSS. Map each variant to a set of
Tailwind classes (e.g. via `clsx`/`cn`) and keep `primary`/`md` as the defaults:

```tsx
// BaseButton.tsx — in-house primitive styled with Tailwind CSS
const colorClasses = {
  secondary: 'bg-transparent text-secondary',
  primary: 'bg-primary text-white',
  white: 'bg-white text-primary',
};
const variantClasses = {
  bordered: 'bg-transparent border-1 border-primary text-primary',
  light: 'bg-transparent border-none !min-w-1 !px-0 text-primary hover:!bg-transparent hover:text-secondary',
  shaded: 'shadow-sm border-secondary bg-transparent text-secondary',
};
const sizeClasses = {
  md: 'text-md px-3 rounded-small',
  lg: 'text-2xl px-8 py-8 rounded-small',
  xl: 'py-6 px-6 text-xl font-bold rounded-small',
};

export default function BaseButton({
  color = 'primary',
  variant,
  size = 'md',
  className,
  ...props
}: BaseButtonProps) {
  return (
    <button
      className={`${colorClasses[color]} ${variant ? variantClasses[variant] : ''} ${sizeClasses[size]} ${className || ''}`}
      {...props}
    />
  );
}
```

### 2. Input Component Pattern

```tsx
// BaseInput.tsx — in-house primitive styled with Tailwind CSS
const inputColorClasses = {
  primary: 'indent-[1rem] focus:text-secondary text-medium placeholder:text-custom-adb',
};
const inputSizeClasses = {
  md: 'p-0 h-[2.375rem] rounded-md',
};

// Forward the ref so register()/setValue bind directly to the DOM input
const BaseInput = forwardRef<HTMLInputElement, BaseInputProps>(function BaseInput(
  { color = 'primary', size = 'md', className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={`mt-0 ${inputColorClasses[color]} ${inputSizeClasses[size]} ${className || ''}`}
      {...props}
    />
  );
});

export default BaseInput;
```

### 3. Form Controller Pattern (heavy customization only)

**Default to `register()`** for form fields — on web it binds directly to the DOM input
(`<BaseInput {...register('email')} />`). Reach for a `Controller` wrapper like the one below **only
when a field needs heavy customization** (a custom controlled component, masked/OTP input, or a picker).

```tsx
// BaseInputController.tsx
interface BaseInputControllerProps<T extends FieldValues, K extends FieldPath<T>> {
  name: K;
  control: Control<T>;
  label?: string;
  rules?: RegisterOptions<T, K>;
  type?: string;
  placeholder?: string;
  // ... other input props
}

export default function BaseInputController<T extends FieldValues, K extends FieldPath<T>>({
  name,
  control,
  rules,
  ...inputProps
}: BaseInputControllerProps<T, K>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState }) => (
        <BaseInput {...field} {...inputProps} isInvalid={!!fieldState.error} errorMessage={fieldState.error?.message} />
      )}
    />
  );
}
```

## Screen Component Pattern

### 1. Screen Component Structure - YAGNI Pattern

```tsx
// ProductDetailScreen.tsx - Follow function minimalism
'use client';

import { useContext, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Col from '@/modules/common/components/Col';
import Row from '@/modules/common/components/Row';
import TextPrimary from '@/modules/common/components/TextPrimary';

export default function ProductDetailScreen() {
  // 1. Hooks
  const params = useParams<{ slug: string }>();
  const { t } = useTranslation(['common']);
  const contextGlobal = useContext(ProviderGlobal);

  // 2. API Calls
  const { data: product, error } = useQueryProductDetail({
    slug: params?.slug,
  });

  // 3. Computed Values (only when necessary)
  const productTitle = useMemo(() => {
    return safeString(product?.title);
  }, [product?.title]);

  // 4. Render - Always render same structure, use structured components
  return (
    <Col className="product-detail space-y-6">
      <Row className="header-section items-center justify-between">
        <TextPrimary text={error ? t('Product not found') : productTitle} className="text-2xl font-bold" />

        {/* ✅ Inline function with TODO for performance tuning */}
        <BaseButton
          isDisabled={!!error || !product}
          onClick={() => {
            // TODO: Should create function for add to cart logic - performance tuning
            addToCartMutation.mutate({ productId: product.id, quantity: 1 });
          }}
        >
          {t('Add to Cart')}
        </BaseButton>
      </Row>

      <Col className="product-content">
        <ProductDetails product={product} />
        <ProductGallery images={product?.images} />
      </Col>
    </Col>
  );
}
```

### 2. Form Screen Pattern - Function Minimalism

```tsx
// SignUpCorporateScreen.tsx - Follow YAGNI principle
export default function SignUpCorporateScreen() {
  const { t } = useTranslation(['common']);
  const router = useRouter();
  const [paramsEmail] = useQueryState('email', { defaultValue: '' });

  // API hooks
  const useMutationRegister = useMutationRegisterCorporate();

  // Form setup
  const form = useForm<IForm>({
    defaultValues: {
      email: paramsEmail,
      IsBillingAddressSameAsRegistered: 'true',
      FirstContactPersonContactNumber: FieldDefault.MOBILE_NUMBER,
      isAllowPromotion: false,
    },
    mode: 'onChange',
  });

  // Input configuration
  const inputs: BaseInputProps<IForm, keyof IForm>[] = [
    {
      name: Fields.email,
      label: t('Email'),
      type: 'email',
      rules: UtilsForm.computeRules(t('Email'), {
        required: true,
        pattern: Regex.EMAIL,
      }),
    },
    // ... more inputs
  ];

  return (
    <Col className="sign-up-screen space-y-6">
      <Row className="header">
        <TextPrimary text={t('Corporate Sign Up')} className="text-2xl font-bold" />
      </Row>

      {/* ✅ Direct reference - no wrapper function needed */}
      <form
        onSubmit={form.handleSubmit(async (data) => {
          // TODO: Should create function for form submission logic - performance tuning
          try {
            await useMutationRegister.mutateAsync(data);
            router.push(RouteLinks.signUpVerificationScreen);
          } catch (error) {
            console.error(error);
          }
        })}
      >
        <Col className="form-fields space-y-4">
          {inputs.map((input) => (
            <BaseInputController key={input.name} {...input} control={form.control} />
          ))}
        </Col>

        <Row className="form-actions pt-6">
          <BaseButton type="submit" isLoading={useMutationRegister.isPending}>
            {t('Submit')}
          </BaseButton>
        </Row>
      </form>
    </Col>
  );
}
```

## ✅ Implementation Results: Book Components

### Successfully Organized Structure

The Book domain components have been successfully moved to the proper architecture:

```
✅ CORRECT: Domain-specific organization
src/modules/pages/Book/components/
├── Form.tsx          # Abstract naming within domain context
├── ModalContent.tsx  # Abstract naming within domain context
├── list/            # Ready for future list components
└── detail/          # Ready for future detail components

❌ WRONG: Previously in common folder (architectural violation)
src/modules/common/components/Book/  # ← Domain components don't belong here
```

### Interface Implementation

```typescript
// Form.tsx - Explicit undefined types for better IDE support
interface FormProps {
  title: string | undefined; // External data - validated
  author: string | undefined; // External data - validated
  formTitle: string; // Internal UI - trusted
  onSubmit: (data: FormData) => void; // Internal function - trusted
  onCancel: () => void; // Internal function - trusted
}

// ModalContent.tsx - Trust boundaries established
interface ModalContentProps {
  id: string | undefined; // External data - optional
  onSuccess: (() => void) | undefined; // Optional callback
  onCancel: () => void; // Internal function - required
}
```

### Usage in Screens

```typescript
// BookListScreen.tsx & BookDetailScreen.tsx - Updated imports
import ModalContent from './components/ModalContent';

// Usage follows YAGNI patterns with inline functions
<ModalContent
  id={book.id}
  onSuccess={() => {
    // TODO: Move to useCallback if performance optimization needed
  }}
  onCancel={() => {
    // TODO: Move to useCallback if performance optimization needed
    refModalChildComponent.current?.onClose();
  }}
/>
```

### Architecture Benefits Achieved

- ✅ **Domain separation**: No domain components in common folder
- ✅ **Abstract naming**: Context provided by folder structure
- ✅ **Minimal properties**: Better React shallow comparison
- ✅ **Trust boundaries**: External data validated, internal functions trusted
- ✅ **Scalable structure**: Ready for future Book components
- ✅ **Type safety**: Explicit `string | undefined` for better IDE support

## Loading States Pattern

### UI-Based Loading (Preferred)

```tsx
// ✅ Use visual indicators instead of text changes
<BaseButton
  type="submit"
  color="primary"
  disabled={isSubmitting}
  isLoading={isSubmitting} // Shows spinner/visual indicator
>
  {submitButtonText} // Text stays consistent
</BaseButton>;

// ✅ Shared loading state from TanStack Query mutations
export default function Form({ onSubmit, onCancel }: FormProps) {
  // No isLoading prop needed - use mutation state directly
  const useMutationCreate = apiClientBook.useMutationCreate();
  const useMutationUpdate = apiClientBook.useMutationUpdate();

  const isSubmitting = useMutationCreate.isPending || useMutationUpdate.isPending;

  return (
    <BaseButton disabled={isSubmitting} isLoading={isSubmitting}>
      {submitButtonText}
    </BaseButton>
  );
}

// ❌ Avoid: Changing button text for loading states
<BaseButton>{isSubmitting ? loadingText : submitButtonText}</BaseButton>;

// ❌ Avoid: Passing loading props when mutations provide state
interface FormProps {
  isLoading: boolean; // Don't pass this
  loadingText: string; // Don't pass this
}
```

## Custom Hooks Patterns

### 1. Data Fetching Hook

```tsx
// useProductFilterParams.ts
export default function useProductFilterParams({ BrandCodesDefault = '' }: { BrandCodesDefault?: string } = {}) {
  const [priceMin, setPriceMin] = useQueryState('priceMin', { defaultValue: '0' });
  const [priceMax, setPriceMax] = useQueryState('priceMax', { defaultValue: '1000' });
  const [CategoryCodes, setCategoryCodes] = useQueryState('CategoryCodes', { defaultValue: '' });

  const countFilter = (!!CategoryCodes ? 1 : 0) + BrandCodes?.split(',')?.filter((i) => i)?.length;

  return {
    priceMin,
    setPriceMin,
    priceMax,
    setPriceMax,
    CategoryCodes,
    setCategoryCodes,
    countFilter,
  };
}
```

### 2. Business Logic Hook - Simplified Pattern

```tsx
// useCartTransference.ts - Follow function minimalism
export default function useCartTransference() {
  const contextGlobal = useContext(ProviderGlobal);

  // ✅ Return direct async function reference, avoid unnecessary useCallback
  return {
    transferCart: async () => {
      if (contextGlobal.isGuest) {
        const guestCartId = localStorage.getItem(ELocalStorageKey.GUEST_CART_ID);
        if (guestCartId) {
          await transferGuestCartToUser(guestCartId);
          localStorage.removeItem(ELocalStorageKey.GUEST_CART_ID);
        }
      }
    },
  };
}

// Usage in components - inline execution, no function creation
export default function CartScreen() {
  const { transferCart } = useCartTransference();

  return (
    <Col>
      <BaseButton
        onClick={() => {
          // TODO: Should create function for transfer logic - performance tuning
          transferCart();
        }}
      >
        {t('Transfer Cart')}
      </BaseButton>
    </Col>
  );
}
```

### 3. UI State Hook

```tsx
// useWindowSize.ts
export default function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener('resize', handleResize);
    handleResize(); // Initialize

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
}
```

## Basic Component Patterns

### 1. Structural Layout Components

```tsx
// Col.tsx - Flex column container (PREFERRED over raw div)
import { PropsWithChildren } from 'react';

export default function Col(props: PropsWithChildren & { className?: string | undefined }) {
  return (
    <div data-component="Col" className={`flex flex-col ${props.className || ''}`}>
      {props.children}
    </div>
  );
}

// Row.tsx - Flex row container (PREFERRED over raw div)
export default function Row(props: PropsWithChildren & { className?: string | undefined }) {
  return (
    <div className={`flex flex-row ${props.className || ''}`} data-component={'Row'}>
      {props.children}
    </div>
  );
}
```

### 2. TextPrimary Component Pattern

**NAMING**: The in-house structural text component is `TextPrimary.tsx` (not `Text` or the historical `TextPrimaryV1`)

```tsx
// TextPrimary.tsx - Structured text component (PREFERRED over raw p/span)
export default function TextPrimary(
  props: PropsWithChildren & {
    className?: string | undefined;
    text: string | null | undefined;
    colon?: boolean | undefined;
    dot?: boolean | undefined;
    uppercase?: boolean | undefined;
    exclamation?: boolean | undefined;
    questionMark?: boolean | undefined;
    reactNodeSuffix?: React.ReactNode | undefined;
  }
) {
  const computedText = () => {
    if (props.uppercase) {
      return props.text?.toUpperCase();
    }
    return props.text;
  };

  return (
    <p className={`${props.className || ''}`}>
      {computedText()}
      {props.colon ? ': ' : ''}
      {!!props.reactNodeSuffix && props.reactNodeSuffix}
      {props.dot ? '.' : ''}
      {props.exclamation ? '!' : ''}
      {props.questionMark ? '?' : ''}
    </p>
  );
}
```

### 3. When to Create Basic Components

Create basic components when you need:

- **Consistent structure**: `Col`/`Row` ensures consistent flex layout
- **Data attributes**: `data-component` for debugging and testing
- **Reusable logic**: Text formatting, conditional punctuation
- **Styling consistency**: Standardized className patterns
- **Component identification**: Clear component boundaries in DevTools

### 4. Basic vs Base vs Domain Component Rules

```tsx
// ✅ Basic Components (common/components) - Structural building blocks
<Col className="space-y-4">
  <Row className="items-center justify-between">
    <TextPrimary text={book?.title} className="font-bold" />
  </Row>
</Col>

// ✅ Base Components (common/components) - In-house Tailwind primitives
<BaseButton color="primary" size="lg">
  {t('Submit')}
</BaseButton>

// ✅ Domain Components (pages/[Domain]/components) - Business logic
<BookCard book={book} onEdit={handleEdit} />

// ❌ Avoid raw HTML elements
<div className="flex flex-col">  {/* Use Col instead */}
  <p>{book?.title}</p>         {/* Use TextPrimary instead */}
</div>
```

**Never render raw `<div>`/`<p>`/`<span>` in screens or domain components.** When you need a
semantic/structural element that no Basic component covers (`table`, `form`, `label`, `nav`, `ul`/`li`),
BUILD an in-house `Base*` primitive that wraps it (e.g. `BaseTable`, `BaseForm`, `BaseLabel`) rather than
dropping raw markup inline. **Base primitives are the ONLY layer allowed to render raw/semantic DOM
elements and to spread ARIA/HTML attributes** — this is what keeps the "never raw HTML" and "use semantic
HTML for accessibility" rules from contradicting each other.

## Feature Component Patterns

### 1. Domain Component Pattern - Function Minimalism

```tsx
// Product/ProductCard.tsx - Follow YAGNI principle
interface ProductCardProps {
  product: ModelBaseProduct;
  onAddToCart?: (product: ModelBaseProduct) => void;
  onQuickView?: (product: ModelBaseProduct) => void;
  showQuickView?: boolean;
}

export default function ProductCard({ product, onAddToCart, onQuickView, showQuickView = false }: ProductCardProps) {
  const { t } = useTranslation(['common']);

  return (
    <Card className="product-card">
      <CardHeader>
        <Image src={product.imageUrl} alt={safeString(product.name)} />
      </CardHeader>

      <CardBody>
        <Col className="space-y-2">
          <TextPrimary text={getTextByLocale(product.name)} className="font-medium" />
          <TextPrimary text={getFormattedPrice(product.price)} className="text-small text-secondary" />
        </Col>
      </CardBody>

      <CardFooter>
        <Row className="gap-2">
          {/* ✅ Direct callback execution - no wrapper function */}
          <BaseButton onClick={() => onAddToCart?.(product)} color="primary">
            {t('Add to Cart')}
          </BaseButton>

          {showQuickView && (
            <BaseButton variant="light" onClick={() => onQuickView?.(product)}>
              {t('Quick View')}
            </BaseButton>
          )}
        </Row>
      </CardFooter>
    </Card>
  );
}
```

### 2. Abstract Component Pattern with Minimal Properties

#### Interface Design with Trust Boundaries

```tsx
// ✅ Use explicit undefined for better IDE support and trust boundaries
interface ModalContentProps {
  id: string | undefined; // External data - explicit undefined
  onSuccess: (() => void) | undefined; // Optional callback - explicit undefined
  onCancel: () => void; // Internal function - always provided (required)
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
  title?: string; // Less clear than string | undefined
  onCancel?: () => void; // Should be required if always provided
}
```

#### Abstract Modal Content with Minimal Props

```tsx
// ModalContent.tsx - Abstract naming, folder provides domain context
export default function ModalContent({
  id,        // Abstract naming - no "bookId"
  onSuccess,
  onCancel   // Required - no safety checking needed
}: ModalContentProps) {
  // Fetch data if editing
  const useQueryDetailObject = apiClientBook.useQueryBookDetail(id || '', {
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  const useMutationCreateObject = apiClientBook.useMutationCreate();
  const useMutationUpdateObject = apiClientBook.useMutationUpdate();

  const data = useQueryDetailObject.data;
  const isEditMode = !!id;

  return (
    <Form
      // ✅ Pass minimal abstract properties - better for shallow comparison
      title={data?.title}
      author={data?.author}
      isbn={data?.isbn}
      formTitle={isEditMode ? 'Edit' : 'Add New'}
      submitButtonText={isEditMode ? 'Update' : 'Create'}
      onSubmit={async (formData) => {
        // TODO: Move to useCallback if performance optimization needed
        try {
          if (isEditMode && id) {
            await useMutationUpdateObject.mutateAsync({
              id: id,
              data: formData,
            });
          } else {
            await useMutationCreateObject.mutateAsync(formData);
          }
          refModalChildComponent.current?.onClose();
          onSuccess?.();
        } catch (error) {
          console.error('Error saving:', error);
        }
      }}
      onCancel={onCancel} // ✅ Direct reference - no wrapper needed
    />
  );
}

// Usage in screen components - follows function minimalism
// ❌ Don't create this function:
// const handleEdit = () => { ... }

// ✅ Use inline function instead:
<BaseButton
  onClick={() => {
    // TODO: Should create function for modal logic - performance tuning
    refModalChildComponent.current?.onOpen(
      <BookModalContent
        bookId={book.id}
        onSuccess={() => {
          // TODO: Should create function for success logic - performance tuning
        }}
      />,
      { title: t('Edit Book'), size: '2xl' }
    );
  }}
>
  {t('Edit')}
</BaseButton>
```

## Form Patterns

### 1. Form Field Configuration

```tsx
// Form input configuration pattern
const inputs: BaseInputProps<ContactUsFields, keyof ContactUsFields>[] = [
  {
    name: Fields.name,
    label: t('Name'),
    rules: UtilsForm.computeRules(t('Name'), {
      required: true,
    }),
  },
  {
    name: Fields.email,
    label: t('Email'),
    type: 'email',
    rules: UtilsForm.computeRules(t('Email'), {
      required: true,
      pattern: Regex.EMAIL,
    }),
  },
  {
    name: Fields.contactNumber,
    label: t('Contact_Number'),
    rules: UtilsForm.computeRules(t('Contact_number'), {
      required: true,
      pattern: Regex.MOBILE,
    }),
  },
];
```

### 2. Form Validation Utilities - Enhanced with Number Support

See `05-validation-patterns.md` for complete UtilsForm.computeRules() documentation with NUMBER validation support.

```tsx
// Examples:
// String validation:
{...register('title', UtilsForm.computeRules('Title', {
  required: true,
  minLength: 3,
  maxLength: 100,
}))}

// Number validation:
{...register('userId', UtilsForm.computeRules('User ID', {
  required: true,
  isInteger: true,
  min: 1,
  max: 1000,
}))}

// Float validation:
{...register('price', UtilsForm.computeRules('Price', {
  required: true,
  isNumber: true,
  min: 0.01,
}))}
```

## Function Minimalism Pattern

### YAGNI Principle - Avoid Creating Functions Unless Absolutely Necessary

```tsx
// ✅ Preferred: Direct references and anonymous inline functions
export default function BookListScreen() {
  const form = useForm<FormData>();

  return (
    <Box>
      {/* Direct reference without wrapper function */}
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Form content */}
      </form>

      {/* Anonymous inline function with TODO for performance tuning */}
      <BaseButton
        onClick={() => {
          // TODO: Should create function for modal logic - performance tuning
          refModalChildComponent.current?.onOpen(
            <BookModalContent bookId={book.id} />
          );
        }}
      >
        {t('Edit')}
      </BaseButton>

      {/* Pass inline functions to child components */}
      <BookCard
        onEdit={(book: ModelBook) => {
          // TODO: Should create function for edit book logic - performance tuning
          refModalChildComponent.current?.onOpen(
            <BookModalContent
              bookId={book.id}
              onSuccess={() => {
                // TODO: Should create function for success logic - performance tuning
              }}
            />
          );
        }}
        onDelete={(book: ModelBook) => {
          // TODO: Should create function for delete book logic - performance tuning
          if (window.confirm(t('Are you sure?'))) {
            deleteMutation.mutate(book.id);
          }
        }}
      />
    </Box>
  );
}

// ✅ Only create const for direct references that avoid function creation
const handleSubmit = form.handleSubmit(onSubmit); // Direct reference, no wrapper

// ❌ Avoid: ANY function definitions for simple operations
const handleEdit = () => {
  refModalChildComponent.current?.onOpen(...); // Don't create this function
};

const handleClick = () => {
  router.push(path); // Don't create this function
};

const handleDelete = (id: string) => {
  deleteMutation.mutate(id); // Don't create this function
};

// ❌ Avoid: Unnecessary function wrappers
const handleSubmit = form.handleSubmit(async (data) => {
  onSubmit(data); // Unnecessary wrapper function
});
```

## Modal Architecture

### Centralized Modal Pattern

```tsx
// Use refModalChildComponent for all modals
const refModalChildComponent = useRef<ModalChildHandle>(null);

// Open modal with content
refModalChildComponent.current?.onOpen(
  <ModalContent />,
  { title: 'Modal Title', size: '2xl' }
);

// Modal content components are self-managing:
// - Handle their own data fetching
// - Manage their own mutations
// - Close themselves on success
// Note: the "pass an id, fetch detail" flow is backed by a real or mock GET /:id detail
//       endpoint (or resolves the item from the cached list) when no GET /:id exists.
```

## Component Creation Guidelines

### When to Create Components - Don't Hesitate for These Cases

#### 1. Basic Components (Always Create in common/components)

```tsx
// ✅ CREATE: Very common structural components
<Col />           // Instead of <div className="flex flex-col">
<Row />           // Instead of <div className="flex flex-row">
<TextPrimary />   // Instead of <p> or <span>
<Spacer />        // For consistent spacing
<Container />     // For consistent containers
<Grid />          // For grid layouts
<Stack />         // For stacked elements

// Pattern: Simple, reusable, no business logic
export default function ComponentName(props: PropsWithChildren & {
  className?: string;
  // ... other common props
}) {
  return (
    <element className={`default-classes ${props.className || ''}`} data-component="ComponentName">
      {props.children}
    </element>
  );
}
```

#### 2. Domain Components (Create Liberally in pages/[Domain]/components)

```tsx
// ✅ CREATE: Domain-specific components without hesitation
<BookCard />           // Book display component
<BookForm />           // Book input form
<BookFilters />        // Book filtering UI
<BookActions />        // Book action buttons
<BookGrid />           // Book grid layout
<BookList />           // Book list layout
<BookSummary />        // Book summary display
<BookDetails />        // Detailed book information

// ✅ CREATE: Context-specific components
// In /list/ folder:
<ProductCard />        // Product in list context
<ProductGridItem />    // Product in grid context

// In /detail/ folder:
<ProductInfo />        // Product detailed information
<ProductActions />     // Product action buttons
<ProductGallery />     // Product image gallery

// Pattern: Business logic focused, domain-specific
export default function DomainComponent({ domain, onAction }: DomainComponentProps) {
  // Domain-specific logic
  const { data } = useDomainQuery();

  return (
    <Col className="domain-specific-styles">
      <TextPrimary text={domain.title} className="font-bold" />
      {/* Domain-specific JSX */}
    </Col>
  );
}
```

#### 3. Common Components (Create When Cross-Domain)

```tsx
// ✅ CREATE: Only when used across multiple domains
<LoadingSpinner />     // Used in Book, Product, Order screens
<ErrorMessage />       // Used across all domains
<SearchInput />        // Used in multiple domains
<FilterPanel />        // Generic filtering component
<PaginationControls /> // Used across list screens
<ConfirmDialog />      // Used across all domains

// Pattern: Generic, reusable across domains
export default function CommonComponent(props: CommonComponentProps) {
  return (
    <Col className="common-component-styles">
      {/* Generic, cross-domain JSX */}
    </Col>
  );
}
```

## Best Practices

### 1. Component Design

- **Single Responsibility**: Each component has one clear purpose
- **Composition over Inheritance**: Use composition patterns
- **Props Interface**: Define clear TypeScript interfaces
- **Default Props**: Provide sensible variant defaults (e.g. `primary` / `md`)
- **Function Minimalism**: Avoid creating functions unless absolutely necessary
- **Structured Elements**: Always prefer `Col`/`Row`/`TextPrimary` over raw HTML
- **Correct Naming**: Use `TextPrimary.tsx` (not `Text` or the historical `TextPrimaryV1`)

### 2. State Management

- **Local State**: Use useState for component-specific state
- **Shared State**: Use Context for cross-component state
- **URL State**: Use nuqs for shareable/bookmarkable state
- **Server State**: Use TanStack Query for API data

### 3. Performance

- **Function Creation**: Use inline anonymous functions with TODO comments for performance tuning
- **Memoization**: Only use useMemo and useCallback when performance issues are identified
- **Code Splitting**: Dynamic imports for heavy components
- **Ref Usage**: Use refs for DOM manipulation, not state

### 4. Modal Architecture

- **Centralized Modal**: Use `refModalChildComponent` for all modals
- **Independent Content**: Create self-managing modal content components
- **Data Fetching**: Let modal content components handle their own data fetching
- **Mutation Management**: Handle mutations within modal content components

### 5. Accessibility

- **Semantic HTML**: Use proper semantic elements — but only inside `Base*` primitives (e.g. `BaseTable`, `BaseForm`), never as raw markup in screens
- **ARIA Labels**: Add accessibility attributes
- **Keyboard Navigation**: Ensure keyboard accessibility
- **Screen Reader Support**: Provide meaningful alt texts
