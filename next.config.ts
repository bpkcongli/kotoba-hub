import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  allowedDevOrigins: ['kotobahub.local'],
  // Page-data workers each load the server bundle; cap them on memory-limited builders.
  experimental: { cpus: 2 },
};

export default nextConfig;
