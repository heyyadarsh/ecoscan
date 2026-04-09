/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },

  // Allow HMR WebSocket connections from devices on the local network
  allowedDevOrigins: ['192.168.29.95'],

  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
      ],
    }];
  },
};
module.exports = nextConfig;
