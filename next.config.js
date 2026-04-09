/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },

  // HMR from phone on same Wi‑Fi: set in .env.local → NEXT_DEV_LAN_ORIGIN=http://192.168.x.x:3000
  ...(process.env.NEXT_DEV_LAN_ORIGIN
    ? { allowedDevOrigins: [process.env.NEXT_DEV_LAN_ORIGIN.replace(/\/$/, '')] }
    : {}),

  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [{ key: 'Content-Type', value: 'application/manifest+json' }],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
