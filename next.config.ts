import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false
  },
  experimental: {
    // 優化 bundle 大小
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tabs',
    ],
  },
};

export default withNextIntl(nextConfig);
