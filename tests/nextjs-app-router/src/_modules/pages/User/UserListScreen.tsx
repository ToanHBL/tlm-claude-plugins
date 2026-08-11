'use client';

import { useState } from 'react';
import * as apiClientUser from '@/_modules/_api/apiClientUser';
import Col from '@/_modules/common/components/Col';
import Row from '@/_modules/common/components/Row';
import Text from '@/_modules/common/components/Text';
import BaseButton from '@/_modules/common/components/BaseButton';
import BaseModal from '@/_modules/common/components/BaseModal';
import UserTable from '@/_modules/pages/User/components/UserTable';
import UserModalContent from '@/_modules/pages/User/components/UserModalContent';
import type { ModelUser } from '@/_modules/common/interfaces/ModelUser';

// ALL business logic lives in the Screen (framework-agnostic). The route file is thin.
export default function UserListScreen({ initialUsers }: { initialUsers: ModelUser[] }) {
  // Local UI state: whether the modal is open, and which user is being edited (undefined = create).
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ModelUser | undefined>(undefined);

  // Hybrid pattern: seed React Query with the server-fetched list, then keep it fresh client-side.
  const { data: users } = apiClientUser.useQueryList(initialUsers);
  const useMutationDelete = apiClientUser.useMutationDelete();

  return (
    <Col className="mx-auto w-full max-w-4xl gap-6 p-6">
      <Row className="items-center justify-between">
        <Text text="Users" className="text-2xl font-bold" />
        <BaseButton
          onClick={() => {
            // TODO: extract to a function only if profiling shows a problem (function minimalism).
            setEditingUser(undefined);
            setIsModalOpen(true);
          }}
        >
          Add User
        </BaseButton>
      </Row>

      <UserTable
        users={users ?? []}
        onEdit={(user: ModelUser) => {
          // TODO: extract to a function only if profiling shows a problem.
          setEditingUser(user);
          setIsModalOpen(true);
        }}
        onDelete={(user: ModelUser) => {
          // TODO: extract to a function only if profiling shows a problem.
          if (window.confirm(`Delete ${user.name}?`)) {
            useMutationDelete.mutate(user.id);
          }
        }}
      />

      <BaseModal
        isOpen={isModalOpen}
        title={editingUser ? 'Edit User' : 'Add User'}
        onClose={() => setIsModalOpen(false)}
      >
        <UserModalContent
          user={editingUser}
          onSuccess={() => setIsModalOpen(false)}
          onCancel={() => setIsModalOpen(false)}
        />
      </BaseModal>
    </Col>
  );
}
