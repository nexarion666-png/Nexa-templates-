/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // The bare integrated-demo page may only be embedded by this site itself.
        source: '/demo/:slug/frame',
        headers: [
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
