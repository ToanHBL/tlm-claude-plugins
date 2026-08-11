import type { NextConfig } from 'next';

// App Router project — NOT static export (Server Components + Server Actions require a server).
const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
