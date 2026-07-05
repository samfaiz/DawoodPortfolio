/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // Laravel CMS media (uploaded images), local dev:
      { protocol: 'http', hostname: 'localhost', port: '8000' },
      { protocol: 'http', hostname: '127.0.0.1', port: '8000' },
      // Production: Laravel CMS media host (uploaded images):
      { protocol: 'https', hostname: 'cms.dawoodshaikh.com' },
    ],
  },
  // Allow the admin (Edit Visually page) to embed the site in an iframe.
  async headers() {
    const ancestors = [
      "'self'",
      'https://cms.dawoodshaikh.com',
      'http://localhost:8000',
      'http://127.0.0.1:8000',
    ];
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: `frame-ancestors ${ancestors.join(' ')}` },
        ],
      },
    ];
  },
};

export default nextConfig;
