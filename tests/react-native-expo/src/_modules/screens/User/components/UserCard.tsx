import { StyleSheet } from 'react-native';

import BaseButton from '../../../common/components/BaseButton';
import Col from '../../../common/components/Col';
import Row from '../../../common/components/Row';
import TextPrimary from '../../../common/components/TextPrimary';
import { EUserStatus } from '../../../values/enums';
import { ModelUser } from '../../../values/interfaces';
import { Colors, FontSize, Radius, Spacing } from '../../../values/theme';
import { USER_ROLE_LABELS, USER_STATUS_LABELS } from '../../../values/userMeta';

// Domain component — one user rendered as a card. Minimal abstract props.
interface UserCardProps {
  user: ModelUser;
  onEdit: (user: ModelUser) => void;
  onDelete: (user: ModelUser) => void;
}

export default function UserCard(props: UserCardProps) {
  return (
    <Col style={styles.card}>
      <Row style={styles.headerRow}>
        <TextPrimary text={props.user.name} style={styles.name} numberOfLines={1} />
        <TextPrimary
          text={USER_STATUS_LABELS[props.user.status]}
          style={[
            styles.status,
            props.user.status === EUserStatus.ACTIVE ? styles.statusActive : styles.statusInactive,
          ]}
        />
      </Row>

      <TextPrimary text={props.user.email} style={styles.email} numberOfLines={1} />
      <TextPrimary text={USER_ROLE_LABELS[props.user.role]} style={styles.role} colon />

      <Row style={styles.actions}>
        <BaseButton variant="bordered" size="sm" onPress={() => props.onEdit(props.user)}>
          Edit
        </BaseButton>
        <BaseButton variant="danger" size="sm" onPress={() => props.onDelete(props.user)}>
          Delete
        </BaseButton>
      </Row>
    </Col>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.medium,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  headerRow: { alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: FontSize.large, fontWeight: '700', flex: 1 },
  status: { fontSize: FontSize.small, fontWeight: '600' },
  statusActive: { color: Colors.success },
  statusInactive: { color: Colors.muted },
  email: { fontSize: FontSize.small, color: Colors.secondary },
  role: { fontSize: FontSize.small, color: Colors.secondary },
  actions: { gap: Spacing.sm, marginTop: Spacing.sm },
});
