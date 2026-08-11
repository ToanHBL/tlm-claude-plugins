'use client';

import Link from 'next/link';
import Col from '@/_modules/common/components/Col';
import Text from '@/_modules/common/components/Text';
import BaseButton from '@/_modules/common/components/BaseButton';
import { RouteLinks } from '@/_modules/config/routeLinks';

export default function HomeScreen() {
  return (
    <Col className="mx-auto w-full max-w-3xl items-start gap-4 p-6">
      <Text text="User Management" className="text-2xl font-bold" />
      <Text
        text="A minimal User CRUD demo built on the framework-agnostic _modules architecture."
        className="text-gray-600"
      />
      <Link href={RouteLinks.USERS} className="no-underline">
        <BaseButton as="span">Go to Users</BaseButton>
      </Link>
    </Col>
  );
}
