/** @type {import('next').NextConfig} */
// Next.js compares Origin *hostnames* to this list (not full URLs). A value like
// http://192.168.x.x:3000 would never match and all /_next/* requests from the phone get 403.
function lanDevAllowedHosts() {
  const raw = process.env.NEXT_DEV_LAN_ORIGIN?.trim().replace(/\/$/, '');
  if (!raw) return [];
  try {
    const href = raw.includes('://') ? raw : `http://${raw}`;
    const { hostname } = new URL(href);
    return hostname ? [hostname] : [];
  } catch {
    return [raw];
  }
}

const nextConfig = {
  images: { unoptimized: true },

  // Phone on LAN: set NEXT_DEV_LAN_ORIGIN in .env.local (full URL or host:port), restart dev
  ...(lanDevAllowedHosts().length ? { allowedDevOrigins: lanDevAllowedHosts() } : {}),

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
