'use client';

import { FieldErrors, UseFormRegister } from 'react-hook-form';
import Col from '@/_modules/common/components/Col';
import BaseInput from '@/_modules/common/components/BaseInput';
import BaseSelect from '@/_modules/common/components/BaseSelect';
import { USER_ROLE_OPTIONS, USER_STATUS_OPTIONS } from '@/_modules/config/enums';
import { UserFormData } from '@/_modules/common/schemas/userSchemas';

// Presentational fields — register-first (bind directly to the DOM input).
interface UserFormProps {
  register: UseFormRegister<UserFormData>;
  errors: FieldErrors<UserFormData>;
}

export default function UserForm(props: UserFormProps) {
  return (
    <Col className="gap-4">
      <BaseInput
        label="Name"
        {...props.register('name')}
        isInvalid={!!props.errors.name}
        errorMessage={props.errors.name?.message}
      />
      <BaseInput
        label="Email"
        type="email"
        {...props.register('email')}
        isInvalid={!!props.errors.email}
        errorMessage={props.errors.email?.message}
      />
      <BaseSelect
        label="Role"
        options={USER_ROLE_OPTIONS}
        {...props.register('role')}
        isInvalid={!!props.errors.role}
        errorMessage={props.errors.role?.message}
      />
      <BaseSelect
        label="Status"
        options={USER_STATUS_OPTIONS}
        {...props.register('status')}
        isInvalid={!!props.errors.status}
        errorMessage={props.errors.status?.message}
      />
    </Col>
  );
}
