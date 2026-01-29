/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Silence Turbopack warning - empty config is fine
  turbopack: {},
  // Exclude the nested Next.js project from file tracing
  outputFileTracingExcludes: {
    '*': ['./grok-4-prompt/**/*'],
  },
};

module.exports = nextConfig;
