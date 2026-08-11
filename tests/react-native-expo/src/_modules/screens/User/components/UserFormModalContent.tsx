import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { StyleSheet } from 'react-native';

import {
  UserUpdateInput,
  useMutationCreateUser,
  useMutationUpdateUser,
} from '../../../_api/apiClientUser';
import BaseButton from '../../../common/components/BaseButton';
import BaseInput from '../../../common/components/BaseInput';
import BaseSelect from '../../../common/components/BaseSelect';
import Col from '../../../common/components/Col';
import { UserFormData, userFormSchema } from '../../../common/schemas/userSchema';
import { EUserRole, EUserStatus } from '../../../values/enums';
import { ModelUser } from '../../../values/interfaces';
import { Spacing } from '../../../values/theme';
import { USER_ROLE_OPTIONS, USER_STATUS_OPTIONS } from '../../../values/userMeta';

// Self-managing modal content — owns its form + mutations, closes on success
// (ai/shared/03 §Modal Architecture). `user` present ⇒ edit mode (pre-filled).
interface UserFormModalContentProps {
  user: ModelUser | undefined;
  onSuccess: () => void;
}

export default function UserFormModalContent(props: UserFormModalContentProps) {
  const isEditMode = !!props.user;

  const {
    register,
    setValue,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: props.user?.name ?? '',
      email: props.user?.email ?? '',
      role: props.user?.role ?? EUserRole.USER,
      status: props.user?.status ?? EUserStatus.ACTIVE,
    },
  });

  const createUser = useMutationCreateUser();
  const updateUser = useMutationUpdateUser();
  const isSubmitting = createUser.isPending || updateUser.isPending;

  return (
    <Col style={styles.form}>
      {/* register-first plain text fields — BaseInput bridges onChangeText internally */}
      <BaseInput<UserFormData>
        name="name"
        label="Name"
        register={register}
        setValue={setValue}
        defaultValue={props.user?.name}
        autoCapitalize="words"
        isInvalid={!!errors.name}
        errorMessage={errors.name?.message}
      />
      <BaseInput<UserFormData>
        name="email"
        label="Email"
        register={register}
        setValue={setValue}
        defaultValue={props.user?.email}
        keyboardType="email-address"
        autoCapitalize="none"
        isInvalid={!!errors.email}
        errorMessage={errors.email?.message}
      />

      {/* enum fields are custom controlled → Controller (ai/reactnative/05) */}
      <Controller
        control={control}
        name="role"
        render={({ field }) => (
          <BaseSelect<EUserRole>
            label="Role"
            value={field.value}
            options={USER_ROLE_OPTIONS}
            onChange={field.onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="status"
        render={({ field }) => (
          <BaseSelect<EUserStatus>
            label="Status"
            value={field.value}
            options={USER_STATUS_OPTIONS}
            onChange={field.onChange}
          />
        )}
      />

      <BaseButton
        isLoading={isSubmitting}
        onPress={handleSubmit((data) => {
          // TODO: extract if performance tuning needed (function minimalism)
          if (isEditMode && props.user) {
            const input: UserUpdateInput = { id: props.user.id, ...data };
            updateUser.mutate(input, { onSuccess: () => props.onSuccess() });
          } else {
            createUser.mutate(data, { onSuccess: () => props.onSuccess() });
          }
        })}>
        {isEditMode ? 'Update User' : 'Create User'}
      </BaseButton>
    </Col>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.md },
});
