import type { AppProps } from 'next/app';
import '@/styles/globals.css';
import Providers from '@/_modules/pages/providers';
import LayoutDefault from '@/_modules/layouts/LayoutDefault';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Providers>
      <LayoutDefault>
        <Component {...pageProps} />
      </LayoutDefault>
    </Providers>
  );
}
