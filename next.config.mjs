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
      // Production: add your Laravel media domain here, e.g.
      // { protocol: 'https', hostname: 'cms.dawoodshaikh.com' },
    ],
  },
};

export default nextConfig;
