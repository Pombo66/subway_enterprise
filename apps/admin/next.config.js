/** @type {import('next').NextConfig} */
module.exports = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    // Force these environment variables to be available
    NEXT_PUBLIC_ENABLE_JOB_PROCESSING: 'true',
    NEXT_PUBLIC_ENABLE_OPENAI_CALLS: 'true',
    // SubMind configuration - hardcoded for Railway deployment
    NEXT_PUBLIC_FEATURE_SUBMIND: 'true',
    NEXT_PUBLIC_BFF_URL: 'https://subwaybff-production.up.railway.app',
  },
  publicRuntimeConfig: {
    NEXT_PUBLIC_ENABLE_JOB_PROCESSING: 'true',
    NEXT_PUBLIC_ENABLE_OPENAI_CALLS: 'true',
  },
  webpack: (config, { isServer }) => {
    // Fix for MapLibre GL JS
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }
    return config;
  },
  async redirects() {
    return [
      {
        source: '/categories',
        destination: '/menu/categories',
        permanent: true,
      },
      {
        source: '/items',
        destination: '/menu/items',
        permanent: true,
      },
      {
        source: '/pricing',
        destination: '/menu/pricing',
        permanent: true,
      },
      {
        source: '/users',
        destination: '/settings/users',
        permanent: true,
      },
      {
        source: '/audit',
        destination: '/settings/audit',
        permanent: true,
      },
    ];
  },
};
