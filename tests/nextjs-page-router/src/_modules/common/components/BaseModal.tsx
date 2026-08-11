import { PropsWithChildren } from 'react';
import Col from '@/_modules/common/components/Col';
import Row from '@/_modules/common/components/Row';
import Text from '@/_modules/common/components/Text';
import BaseButton from '@/_modules/common/components/BaseButton';

// In-house modal primitive (no external UI kit). Controlled via isOpen/onClose.
interface BaseModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
}

export default function BaseModal(props: PropsWithChildren<BaseModalProps>) {
  if (!props.isOpen) {
    return null;
  }

  return (
    <Col className="fixed inset-0 z-50 items-center justify-center p-4">
      <Col className="absolute inset-0 bg-black/50" />
      <Col className="relative z-10 w-full max-w-lg rounded-lg bg-white shadow-xl">
        <Row className="items-center justify-between border-b border-gray-200 px-5 py-4">
          <Text text={props.title} className="text-lg font-semibold" />
          <BaseButton as="span" variant="light" color="secondary" onClick={props.onClose} title="Close">
            ✕
          </BaseButton>
        </Row>
        <Col className="p-5">{props.children}</Col>
      </Col>
    </Col>
  );
}
