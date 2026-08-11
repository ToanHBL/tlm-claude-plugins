import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet } from 'react-native';

import {
  ModelUser,
  useMutationDeleteUser,
  useQueryUsers,
} from '../../_api/apiClientUser';
import BaseButton from '../../common/components/BaseButton';
import BaseModal from '../../common/components/BaseModal';
import Col from '../../common/components/Col';
import Row from '../../common/components/Row';
import TextPrimary from '../../common/components/TextPrimary';
import { Colors, FontSize, Spacing } from '../../values/theme';
import UserCard from './components/UserCard';
import UserFormModalContent from './components/UserFormModalContent';

// ALL business logic lives here (thin App entry renders this screen).
export default function UserListScreen() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ModelUser | undefined>(undefined);

  const usersQuery = useQueryUsers();
  const deleteUser = useMutationDeleteUser();

  return (
    <Col style={styles.container}>
      <Row style={styles.header}>
        <TextPrimary text="Users" style={styles.heading} />
        <BaseButton
          size="sm"
          onPress={() => {
            // TODO: extract if performance tuning needed (function minimalism)
            setEditingUser(undefined);
            setIsModalOpen(true);
          }}>
          Add User
        </BaseButton>
      </Row>

      {usersQuery.isLoading ? (
        <ActivityIndicator style={styles.loader} color={Colors.primary} />
      ) : (
        <FlatList
          data={usersQuery.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <Col style={styles.separator} />}
          ListEmptyComponent={
            <TextPrimary text="No users yet. Tap Add User to create one." style={styles.empty} />
          }
          renderItem={({ item }) => (
            <UserCard
              user={item}
              onEdit={(user) => {
                // TODO: extract if performance tuning needed (function minimalism)
                setEditingUser(user);
                setIsModalOpen(true);
              }}
              onDelete={(user) => {
                // TODO: extract if performance tuning needed (function minimalism)
                Alert.alert('Delete User', `Delete "${user.name}"?`, [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteUser.mutate(user.id),
                  },
                ]);
              }}
            />
          )}
        />
      )}

      <BaseModal
        visible={isModalOpen}
        title={editingUser ? 'Edit User' : 'Add User'}
        onClose={() => setIsModalOpen(false)}>
        <UserFormModalContent
          user={editingUser}
          onSuccess={() => {
            // TODO: extract if performance tuning needed (function minimalism)
            setIsModalOpen(false);
          }}
        />
      </BaseModal>
    </Col>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface, padding: Spacing.lg, gap: Spacing.md },
  header: { alignItems: 'center', justifyContent: 'space-between' },
  heading: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.foreground },
  loader: { marginTop: Spacing.xxl },
  listContent: { paddingBottom: Spacing.xxl },
  separator: { height: Spacing.md },
  empty: { textAlign: 'center', color: Colors.secondary, marginTop: Spacing.xxl },
});
