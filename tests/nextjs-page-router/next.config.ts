import type { NextConfig } from 'next';

// Static-export SPA: no server runtime, no getServerSideProps, no runtime API routes.
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
