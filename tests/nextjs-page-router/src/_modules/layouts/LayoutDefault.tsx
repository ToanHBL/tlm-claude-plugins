import { ReactNode } from 'react';
import Col from '@/_modules/common/components/Col';
import GlobalNav from '@/_modules/common/components/GlobalNav';

// Shared layout mounted once in _app.tsx — GlobalNav persists across routes.
export default function LayoutDefault({ children }: { children: ReactNode }) {
  return (
    <Col className="min-h-screen bg-gray-50">
      <GlobalNav />
      <Col className="flex-1">{children}</Col>
    </Col>
  );
}
