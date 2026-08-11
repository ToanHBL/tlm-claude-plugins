'use client';

import * as apiClientUser from '@/_modules/_api/apiClientUser';
import UserForm from '@/_modules/pages/User/components/UserForm';
import type { ModelUser } from '@/_modules/common/interfaces/ModelUser';
import type { UserFormData } from '@/_modules/common/schemas/userSchemas';

interface UserModalContentProps {
  // Existing user when editing, undefined when creating. The list already holds the
  // record (no GET /users/:id detail endpoint), so we pass it in for pre-fill.
  user: ModelUser | undefined;
  onSuccess: () => void;
  onCancel: () => void;
}

// Self-managing modal content — owns its own mutations and closes on success (shared/03, shared/07).
export default function UserModalContent(props: UserModalContentProps) {
  const useMutationCreate = apiClientUser.useMutationCreate();
  const useMutationUpdate = apiClientUser.useMutationUpdate();

  const isEditMode = !!props.user;
  const isSubmitting = useMutationCreate.isPending || useMutationUpdate.isPending;

  return (
    <UserForm
      name={props.user?.name}
      email={props.user?.email}
      role={props.user?.role}
      status={props.user?.status}
      submitLabel={isEditMode ? 'Update' : 'Create'}
      isSubmitting={isSubmitting}
      onSubmit={(data: UserFormData) => {
        // TODO: extract to a function only if profiling shows a problem (function minimalism).
        if (props.user) {
          useMutationUpdate.mutate(
            { id: props.user.id, ...data },
            { onSuccess: () => props.onSuccess() },
          );
          return;
        }
        useMutationCreate.mutate(data, { onSuccess: () => props.onSuccess() });
      }}
      onCancel={props.onCancel}
    />
  );
}
