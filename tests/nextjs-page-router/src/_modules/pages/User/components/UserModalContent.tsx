'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as apiClientUser from '@/_modules/_api/apiClientUser';
import BaseButton from '@/_modules/common/components/BaseButton';
import Row from '@/_modules/common/components/Row';
import { EUserRole, EUserStatus } from '@/_modules/config/enums';
import { userFormSchema, UserFormData } from '@/_modules/common/schemas/userSchemas';
import UserForm from '@/_modules/pages/User/components/UserForm';

// Self-managing modal content: resolves the edited user from the cached list
// (no dedicated GET /users/:id endpoint in the spec) and owns its mutations.
interface UserModalContentProps {
  id: string | undefined;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function UserModalContent(props: UserModalContentProps) {
  const queryUsers = apiClientUser.useQueryUsers();
  const editingUser = props.id ? queryUsers.data?.find((user) => user.id === props.id) : undefined;

  const mutationCreate = apiClientUser.useMutationCreate();
  const mutationUpdate = apiClientUser.useMutationUpdate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: editingUser?.name ?? '',
      email: editingUser?.email ?? '',
      role: editingUser?.role ?? EUserRole.USER,
      status: editingUser?.status ?? EUserStatus.ACTIVE,
    },
  });

  const isSubmitting = mutationCreate.isPending || mutationUpdate.isPending;

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        // TODO: extract to a function only if profiling shows a problem
        try {
          if (props.id) {
            await mutationUpdate.mutateAsync({ id: props.id, ...data });
          } else {
            await mutationCreate.mutateAsync(data);
          }
          props.onSuccess();
        } catch (error) {
          console.error('Error saving user:', error); // TanStack Query surfaces the toast
        }
      })}
    >
      <UserForm register={register} errors={errors} />
      <Row className="justify-end gap-2 pt-4">
        <BaseButton variant="bordered" color="secondary" onClick={props.onCancel}>
          Cancel
        </BaseButton>
        <BaseButton type="submit" isLoading={isSubmitting}>
          {props.id ? 'Update' : 'Create'}
        </BaseButton>
      </Row>
    </form>
  );
}
