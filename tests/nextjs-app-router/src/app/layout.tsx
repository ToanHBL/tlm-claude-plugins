import type { Metadata } from 'next';
import Providers from '@/_modules/pages/providers';
import LayoutDefault from '@/_modules/layouts/LayoutDefault';
import './globals.css';

export const metadata: Metadata = {
  title: 'User CRUD',
  description: 'Users management screen',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <LayoutDefault>{children}</LayoutDefault>
        </Providers>
      </body>
    </html>
  );
}
