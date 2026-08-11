'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userFormSchema, type UserFormData } from '@/_modules/common/schemas/userSchemas';
import BaseInput from '@/_modules/common/components/BaseInput';
import BaseSelect, { type BaseSelectOption } from '@/_modules/common/components/BaseSelect';
import BaseButton from '@/_modules/common/components/BaseButton';
import Col from '@/_modules/common/components/Col';
import Row from '@/_modules/common/components/Row';
import {
  EUserRole,
  EUserStatus,
  USER_ROLE_LABELS,
  USER_STATUS_LABELS,
} from '@/_modules/config/enums';

interface UserFormProps {
  // External data (pre-fill) — explicit undefined per trust-boundary rule (shared/04).
  name: string | undefined;
  email: string | undefined;
  role: EUserRole | undefined;
  status: EUserStatus | undefined;
  // Internal UI props — always provided.
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (data: UserFormData) => void;
  onCancel: () => void;
}

// Enum-driven select options — no magic strings (shared/04).
const roleOptions: BaseSelectOption[] = Object.values(EUserRole).map((value) => ({
  value,
  label: USER_ROLE_LABELS[value],
}));

const statusOptions: BaseSelectOption[] = Object.values(EUserStatus).map((value) => ({
  value,
  label: USER_STATUS_LABELS[value],
}));

// register-first form (Controller not needed — native inputs/selects bind via register).
export default function UserForm(props: UserFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: props.name ?? '',
      email: props.email ?? '',
      role: props.role ?? EUserRole.USER,
      status: props.status ?? EUserStatus.ACTIVE,
    },
  });

  return (
    <form onSubmit={handleSubmit(props.onSubmit)}>
      <Col className="gap-4">
        <BaseInput
          {...register('name')}
          label="Name"
          isRequired
          isInvalid={!!errors.name}
          errorMessage={errors.name?.message}
        />

        <BaseInput
          {...register('email')}
          type="email"
          label="Email"
          isRequired
          isInvalid={!!errors.email}
          errorMessage={errors.email?.message}
        />

        <BaseSelect
          {...register('role')}
          label="Role"
          options={roleOptions}
          isInvalid={!!errors.role}
          errorMessage={errors.role?.message}
        />

        <BaseSelect
          {...register('status')}
          label="Status"
          options={statusOptions}
          isInvalid={!!errors.status}
          errorMessage={errors.status?.message}
        />

        <Row className="justify-end gap-2 pt-2">
          <BaseButton type="button" variant="bordered" onClick={props.onCancel}>
            Cancel
          </BaseButton>
          <BaseButton type="submit" isLoading={props.isSubmitting}>
            {props.submitLabel}
          </BaseButton>
        </Row>
      </Col>
    </form>
  );
}
