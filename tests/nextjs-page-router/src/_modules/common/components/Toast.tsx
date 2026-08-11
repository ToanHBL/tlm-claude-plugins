import { useEffect, useState } from 'react';
import Col from '@/_modules/common/components/Col';
import Text from '@/_modules/common/components/Text';

// In-house toast notification helper. `toast({ title, color })` for API errors/success,
// <Toaster /> mounted once in providers.
export type ToastColor = 'success' | 'danger' | 'warning' | 'default';

export interface ToastItem {
  id: number;
  title: string;
  description?: string;
  color: ToastColor;
}

type Listener = (item: ToastItem) => void;

const listeners = new Set<Listener>();
let counter = 0;

export function toast(input: { title: string | undefined; description?: string; color?: ToastColor }) {
  const item: ToastItem = {
    id: ++counter,
    title: input.title ?? '',
    description: input.description,
    color: input.color ?? 'default',
  };
  listeners.forEach((listener) => listener(item));
}

const colorClasses: Record<ToastColor, string> = {
  success: 'bg-green-600 text-white',
  danger: 'bg-red-600 text-white',
  warning: 'bg-yellow-500 text-black',
  default: 'bg-gray-800 text-white',
};

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener: Listener = (item) => {
      setItems((prev) => [...prev, item]);
      setTimeout(() => {
        setItems((prev) => prev.filter((existing) => existing.id !== item.id));
      }, 4000);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return (
    <Col className="fixed right-4 top-4 z-[100] gap-2">
      {items.map((item) => (
        <Col key={item.id} className={`min-w-64 rounded-md px-4 py-3 shadow-lg ${colorClasses[item.color]}`}>
          <Text text={item.title} className="font-semibold" />
          {item.description ? <Text text={item.description} className="text-sm opacity-90" /> : null}
        </Col>
      ))}
    </Col>
  );
}
