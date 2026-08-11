import { PropsWithChildren } from 'react';
import { Modal, StyleSheet, TouchableOpacity } from 'react-native';

import Col from './Col';
import Row from './Row';
import TextPrimary from './TextPrimary';
import { Colors, FontSize, Radius, Spacing } from '../../values/theme';

interface BaseModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
}

// In-house modal — wraps RN Modal, minimizes external UI deps (ai/reactnative/01).
export default function BaseModal(props: PropsWithChildren<BaseModalProps>) {
  return (
    <Modal visible={props.visible} transparent animationType="slide" onRequestClose={props.onClose}>
      <Col style={styles.backdrop}>
        <Col style={styles.sheet}>
          <Row style={styles.header}>
            <TextPrimary text={props.title} style={styles.title} />
            <TouchableOpacity onPress={props.onClose} activeOpacity={0.75}>
              <TextPrimary text="✕" style={styles.close} />
            </TouchableOpacity>
          </Row>
          {props.children}
        </Col>
      </Col>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: FontSize.large, fontWeight: '700', color: Colors.foreground },
  close: { fontSize: FontSize.large, color: Colors.secondary },
});
