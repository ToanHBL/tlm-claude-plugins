'use client';

import cn from '@/_modules/common/utils/cn';
import Row from '@/_modules/common/components/Row';
import Text from '@/_modules/common/components/Text';
import BaseButton from '@/_modules/common/components/BaseButton';
import {
  USER_ROLE_LABELS,
  USER_STATUS_LABELS,
  USER_STATUS_BADGE_CLASSES,
} from '@/_modules/config/enums';
import type { ModelUser } from '@/_modules/common/interfaces/ModelUser';

interface UserTableProps {
  users: ModelUser[];
  onEdit: (user: ModelUser) => void;
  onDelete: (user: ModelUser) => void;
}

// Domain component — semantic table markup with Text/BaseButton for content and actions.
export default function UserTable(props: UserTableProps) {
  return (
    <table className="w-full border-collapse overflow-hidden rounded-small border border-gray-200 text-left">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-3 text-sm font-semibold text-secondary">Name</th>
          <th className="px-4 py-3 text-sm font-semibold text-secondary">Email</th>
          <th className="px-4 py-3 text-sm font-semibold text-secondary">Role</th>
          <th className="px-4 py-3 text-sm font-semibold text-secondary">Status</th>
          <th className="px-4 py-3 text-right text-sm font-semibold text-secondary">Actions</th>
        </tr>
      </thead>
      <tbody>
        {props.users.length === 0 && (
          <tr>
            <td colSpan={5} className="px-4 py-8">
              <Text text="No users yet. Click “Add User” to create one." className="text-center text-secondary" />
            </td>
          </tr>
        )}

        {props.users.map((user) => (
          <tr key={user.id} className="border-t border-gray-100">
            <td className="px-4 py-3">
              <Text text={user.name} className="font-medium" />
            </td>
            <td className="px-4 py-3">
              <Text text={user.email} className="text-secondary" />
            </td>
            <td className="px-4 py-3">
              <Text text={USER_ROLE_LABELS[user.role]} />
            </td>
            <td className="px-4 py-3">
              <Text
                text={USER_STATUS_LABELS[user.status]}
                className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', USER_STATUS_BADGE_CLASSES[user.status])}
              />
            </td>
            <td className="px-4 py-3">
              <Row className="justify-end gap-2">
                <BaseButton
                  size="sm"
                  variant="bordered"
                  onClick={() => {
                    // TODO: extract to a function only if profiling shows a problem.
                    props.onEdit(user);
                  }}
                >
                  Edit
                </BaseButton>
                <BaseButton
                  size="sm"
                  color="danger"
                  onClick={() => {
                    // TODO: extract to a function only if profiling shows a problem.
                    props.onDelete(user);
                  }}
                >
                  Delete
                </BaseButton>
              </Row>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
