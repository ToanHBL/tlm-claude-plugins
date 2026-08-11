'use client';

import Col from '@/_modules/common/components/Col';
import Row from '@/_modules/common/components/Row';
import Text from '@/_modules/common/components/Text';
import BaseButton from '@/_modules/common/components/BaseButton';
import { ModelUser } from '@/_modules/config/models';
import { USER_ROLE_LABELS, USER_STATUS_LABELS } from '@/_modules/config/enums';

// Loading / empty / error expressed via props inside a stable container
// (no mount/unmount of the whole subtree).
interface UserTableProps {
  users: ModelUser[] | undefined;
  isLoading: boolean;
  error: string | undefined;
  onEdit: (user: ModelUser) => void;
  onDelete: (user: ModelUser) => void;
}

export default function UserTable(props: UserTableProps) {
  const isEmpty = !props.isLoading && !props.error && !props.users?.length;

  return (
    <Col className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <Row className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-600">
        <Text text="Name" className="flex-1" />
        <Text text="Email" className="flex-1" />
        <Text text="Role" className="w-24" />
        <Text text="Status" className="w-24" />
        <Text text="Actions" className="w-36" />
      </Row>

      {props.isLoading ? (
        <Text text="Loading users…" className="px-4 py-6 text-center text-gray-500" />
      ) : null}
      {props.error ? (
        <Text text={props.error} className="px-4 py-6 text-center text-red-500" />
      ) : null}
      {isEmpty ? (
        <Text text="No users found." className="px-4 py-6 text-center text-gray-500" />
      ) : null}

      {props.users?.map((user) => (
        <Row
          key={user.id}
          className="items-center border-b border-gray-100 px-4 py-3 text-sm last:border-b-0"
        >
          <Text text={user.name} className="flex-1 font-medium" />
          <Text text={user.email} className="flex-1 text-gray-600" />
          <Text text={USER_ROLE_LABELS[user.role]} className="w-24" />
          <Text text={USER_STATUS_LABELS[user.status]} className="w-24" />
          <Row className="w-36 gap-2">
            <BaseButton size="sm" variant="bordered" color="secondary" onClick={() => props.onEdit(user)}>
              Edit
            </BaseButton>
            <BaseButton size="sm" variant="bordered" color="danger" onClick={() => props.onDelete(user)}>
              Delete
            </BaseButton>
          </Row>
        </Row>
      ))}
    </Col>
  );
}
