import { PropsWithChildren } from 'react';
import Col from '@/_modules/common/components/Col';

// Default app shell — framework-agnostic layout component.
export default function LayoutDefault(props: PropsWithChildren) {
  return <Col className="min-h-screen bg-gray-50">{props.children}</Col>;
}
