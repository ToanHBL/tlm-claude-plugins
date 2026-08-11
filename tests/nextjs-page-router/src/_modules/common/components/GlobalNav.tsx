import Link from 'next/link';
import { useRouter } from 'next/router';
import Row from '@/_modules/common/components/Row';
import BaseButton from '@/_modules/common/components/BaseButton';
import { RouteLinks } from '@/_modules/config/routeLinks';

// Shared global navigation. Navigation via Link only (never onClick + router.push).
const LINKS = [
  { label: 'Home', href: RouteLinks.HOME },
  { label: 'Users', href: RouteLinks.USERS },
];

export default function GlobalNav() {
  const router = useRouter();

  return (
    <Row className="sticky top-0 z-40 items-center gap-2 border-b border-gray-200 bg-white px-6 py-4">
      {LINKS.map((item) => {
        const isActive = router.pathname === item.href;
        return (
          <Link key={item.href} href={item.href} className="no-underline">
            <BaseButton as="span" variant={isActive ? 'solid' : 'light'} color={isActive ? 'primary' : 'secondary'}>
              {item.label}
            </BaseButton>
          </Link>
        );
      })}
    </Row>
  );
}
