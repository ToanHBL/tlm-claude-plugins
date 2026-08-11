'use client';

import { useEffect, useState } from 'react';
import cn from '@/_modules/common/utils/cn';
import Col from '@/_modules/common/components/Col';
import Text from '@/_modules/common/components/Text';

export type ToastColor = 'success' | 'danger' | 'default';

interface ToastOptions {
  title: string;
  description?: string;
  color?: ToastColor;
}

interface ToastItem extends ToastOptions {
  id: string;
}

// Minimal in-house pub/sub — no third-party toast library.
type Listener = (toast: ToastItem) => void;
const listeners = new Set<Listener>();

// Public helper used across the app: toast({ title, color }).
export function toast(options: ToastOptions) {
  const item: ToastItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    color: 'default',
    ...options,
  };
  listeners.forEach((listener) => listener(item));
}

const colorClasses: Record<ToastColor, string> = {
  success: 'bg-success text-white',
  danger: 'bg-danger text-white',
  default: 'bg-secondary text-white',
};

// Renders active toasts. Mounted once in Providers.
export default function ToastViewport() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener: Listener = (item) => {
      setToasts((current) => [...current, item]);
      // TODO: make the timeout configurable if a toast needs to persist.
      window.setTimeout(() => {
        setToasts((current) => current.filter((t) => t.id !== item.id));
      }, 4000);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return (
    <Col className="fixed bottom-4 right-4 z-[100] gap-2">
      {toasts.map((item) => (
        <Col
          key={item.id}
          className={cn('min-w-[16rem] gap-1 rounded-small px-4 py-3 shadow-lg', colorClasses[item.color ?? 'default'])}
        >
          <Text text={item.title} className="font-medium" />
          {!!item.description && <Text text={item.description} className="text-sm opacity-90" />}
        </Col>
      ))}
    </Col>
  );
}
