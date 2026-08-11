'use client';

import { useState } from 'react';
import * as apiClientUser from '@/_modules/_api/apiClientUser';
import Col from '@/_modules/common/components/Col';
import Row from '@/_modules/common/components/Row';
import Text from '@/_modules/common/components/Text';
import BaseButton from '@/_modules/common/components/BaseButton';
import BaseModal from '@/_modules/common/components/BaseModal';
import UserTable from '@/_modules/pages/User/components/list/UserTable';
import UserModalContent from '@/_modules/pages/User/components/UserModalContent';

export default function UserListScreen() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);

  const queryUsers = apiClientUser.useQueryUsers();
  const mutationDelete = apiClientUser.useMutationDelete();

  return (
    <Col className="mx-auto w-full max-w-5xl gap-6 p-6">
      <Row className="items-center justify-between">
        <Text text="Users" className="text-2xl font-bold" />
        <BaseButton
          onClick={() => {
            // TODO: extract to a function only if profiling shows a problem
            setEditingId(undefined);
            setIsModalOpen(true);
          }}
        >
          Add User
        </BaseButton>
      </Row>

      <UserTable
        users={queryUsers.data}
        isLoading={queryUsers.isLoading}
        error={queryUsers.error?.message}
        onEdit={(user) => {
          // TODO: extract to a function only if profiling shows a problem
          setEditingId(user.id);
          setIsModalOpen(true);
        }}
        onDelete={(user) => {
          // TODO: extract to a function only if profiling shows a problem
          if (window.confirm(`Delete user "${user.name}"?`)) {
            mutationDelete.mutate(user.id);
          }
        }}
      />

      <BaseModal
        isOpen={isModalOpen}
        title={editingId ? 'Edit User' : 'Add User'}
        onClose={() => setIsModalOpen(false)}
      >
        <UserModalContent
          id={editingId}
          onSuccess={() => setIsModalOpen(false)}
          onCancel={() => setIsModalOpen(false)}
        />
      </BaseModal>
    </Col>
  );
}
