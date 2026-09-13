/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable strict mode in dev to prevent double-render/double-effect lag
  reactStrictMode: false,

  // Faster dev builds — skip type checking during dev (tsc handles it separately)
  typescript: {
    ignoreBuildErrors: false,
  },

  // Experimental: faster JS compiler
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*'
      }
    ];
  }
};

module.exports = nextConfig;
