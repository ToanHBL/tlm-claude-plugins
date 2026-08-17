# RN Validation & Forms

> Same philosophy as the web (`ai/shared-fe/05`): React Hook Form + Zod, schema-first, no manual/state
> validation. **Default to `register()`, matching the web.** Use `Controller`/`useController` ONLY when a
> field needs heavy customization (custom controlled component, masked input, OTP input, picker).
>
> **RN caveat (honest):** React Native `TextInput` uses `onChangeText`, not the DOM `onChange`, so a plain
> `register()` spread does not auto-bind the way it does on a web `<input>`. The register-first RN pattern
> is to wire the field through `register` + `setValue` (uncontrolled style) **inside the in-house
> `BaseInput`**, so screens stay clean and still write register-style `<BaseInput name="email" .../>`
> without a `<Controller>` wrapper.

## Form pattern (RHF + Zod, register-first)

`BaseInput` takes `name` + the form's `register`/`setValue` and does the `onChangeText` binding
internally — screens never touch `Controller` for plain text fields.

```js
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const signInSchema = z.object({
  email:    z.string().email('Invalid email'),
  password: z.string().min(8, 'At least 8 characters'),
});

export default function SignInScreen() {
  const { register, setValue, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });
  const signInMutation = apiClientAuth.useMutationSignIn();

  return (
    <Col style={styles.container}>
      <BaseInput label="Email" name="email" register={register} setValue={setValue}
        keyboardType="email-address" isInvalid={!!errors.email} errorMessage={errors.email?.message} />
      <BaseInput label="Password" name="password" register={register} setValue={setValue}
        secureTextEntry isInvalid={!!errors.password} errorMessage={errors.password?.message} />
      <BaseButton
        onPress={handleSubmit((data) => {
          // TODO: extract if performance tuning needed (function minimalism)
          signInMutation.mutate(data);
        })}
        isLoading={signInMutation.isPending}>
        Sign In
      </BaseButton>
    </Col>
  );
}
```

### How `BaseInput` binds a register field internally (the honest RN part)

`register('name')` returns the field ref/handlers, but RN's `TextInput` fires `onChangeText` (a bare
string), not a DOM event — so `BaseInput` registers the field once and pushes edits back via `setValue`:

```js
// _modules/common/components/BaseInput.js (abridged — binding only)
export default function BaseInput({ name, register, setValue, onChangeText, value, ...rest }) {
  useEffect(() => { if (name && register) register(name); }, [name, register]);
  const handleChangeText = (text) => {
    if (name && setValue) setValue(name, text, { shouldValidate: true, shouldDirty: true });
    onChangeText?.(text);
  };
  return <TextInput value={value} onChangeText={handleChangeText} {...rest} />;
}
```

Screens stay register-style; the `onChangeText` bridge is hidden inside `BaseInput`.

### Edit mode — seeding a self-managing modal / edit form

For an edit form (or a self-managing edit modal), seed the pre-filled values through RHF
`defaultValues` — `BaseInput`'s register binding then renders each field's initial value with no manual
wiring. The record to pre-fill from comes from a real (or **mock**) detail API that returns the record,
or from the already-cached list when there's no dedicated detail endpoint:

```js
// record ← detail query, or picked out of the cached list when no detail endpoint exists
const { data: record } = useQueryFeedbackDetail(id); // may be a mock API returning the record
const { register, setValue, handleSubmit, reset } = useForm({
  resolver: zodResolver(feedbackSchema),
  defaultValues: record ?? { title: '', body: '' },
});
useEffect(() => { if (record) reset(record); }, [record]); // re-seed once async data lands
// <BaseInput name="title" register={register} setValue={setValue} />  → shows record.title pre-filled
```

## When to use `Controller` (custom fields only)

Reserve `Controller`/`useController` for fields that own their own controlled state and can't route
through a plain `register` + `setValue` bridge — e.g. an OTP input (`react-native-otp-entry`), a masked
input, or a picker:

```js
import { Controller } from 'react-hook-form';
import { OtpInput } from 'react-native-otp-entry';

// ✅ Controller is justified — OtpInput is a custom controlled component
<Controller name="code" control={control} render={({ field }) => (
  <OtpInput numberOfDigits={6} onTextChange={field.onChange} />
)} />
```

## Common Zod schemas

```js
// strings
z.string().min(1, 'Required')
z.string().email('Invalid email')
z.string().optional().or(z.literal(''))          // allow empty as optional

// numbers (TextInput yields strings → coerce)
z.number().int('Must be a whole number').min(0).max(150)
z.coerce.number().int()

// enums
z.enum([EFeedbackType.GLAD, EFeedbackType.SAD, EFeedbackType.MAD])

// object
z.object({ heartRate: z.number().int().min(0).max(300).optional() })
```

## Shared schemas (reuse via `_modules/common/schemas/`)

```js
export const signInSchema = z.object({ email: z.string().email(), password: z.string().min(8) });
export const signUpSchema = signInSchema
  .extend({ name: z.string().min(1, 'Name is required'), confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, { message: "Passwords don't match", path: ['confirmPassword'] });
```

## Reset & error display on submit

```js
const onSubmit = (data) => mutation.mutate(data, {
  onSuccess: () => { reset(); /* navigate or close modal */ },
  onError:   (error) => Alert.alert('Error', error.message),
});
```

Error display in RN: inline via `BaseInput` (`isInvalid` + `errorMessage`) — preferred; `Alert.alert`
for mutation errors; the in-house `BaseToast.show({ title, color })` for toast-style notifications
(build our own — no `react-native-toast-message`; see `04-data-and-storage.md`).

## Checklist for new forms
- [ ] Zod schema in `_modules/common/schemas/` or local
- [ ] `useForm` with `zodResolver`
- [ ] register-style `<BaseInput name=... register={register} setValue={setValue} />` for plain fields
- [ ] `Controller`/`useController` only for custom fields (OTP, masked input, picker)
- [ ] Inline errors via `BaseInput`
- [ ] Mutation errors via `Alert.alert` / in-house `BaseToast`
- [ ] `reset()` on success
- [ ] `isLoading` on the submit button
- [ ] Navigate / close modal on success

## Do NOT
```js
// ❌ manual validation
if (!name.trim()) { Alert.alert('Error', 'Name is required'); return; }
// ❌ state-based errors
const [nameError, setNameError] = useState('');
// ❌ wrapping every plain text field in Controller — default to register + setValue via BaseInput
<Controller name="email" control={control} render={({ field }) => (
  <BaseInput value={field.value} onChangeText={field.onChange} />
)} />
```
Use Zod + React Hook Form instead; default to `register()` (+`setValue` via `BaseInput`) and reserve
`Controller` for genuinely custom fields.
