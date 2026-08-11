'use client';

import { PropsWithChildren, useEffect } from 'react';
import Row from '@/_modules/common/components/Row';
import Text from '@/_modules/common/components/Text';

interface BaseModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
}

// In-house modal primitive styled with Tailwind CSS. Controlled via isOpen/onClose.
// Like BaseInput/BaseButton, this Base primitive is the layer that wraps raw DOM
// (dialog/overlay elements) so it can carry the required ARIA semantics.
export default function BaseModal(props: PropsWithChildren<BaseModalProps>) {
  useEffect(() => {
    if (!props.isOpen) {
      return;
    }
    // TODO: extract to a hook if reused across modals — closes on Escape.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        props.onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [props.isOpen, props.onClose]);

  if (!props.isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={props.onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={props.title}
        className="relative z-10 flex w-full max-w-md flex-col gap-4 rounded-small bg-white p-6 shadow-xl"
      >
        <Row className="items-center justify-between">
          <Text text={props.title} className="text-lg font-bold" />
          <button
            type="button"
            aria-label="Close"
            className="text-secondary hover:text-black"
            onClick={props.onClose}
          >
            ✕
          </button>
        </Row>
        {props.children}
      </div>
    </div>
  );
}
