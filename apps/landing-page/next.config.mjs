/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Don't advertise the framework version.
  poweredByHeader: false,

  images: {
    // Vercel's image optimizer serves whichever the browser accepts; both are
    // meaningfully smaller than PNG, which helps LCP and Core Web Vitals.
    formats: ["image/avif", "image/webp"],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      // Common hand-typed variants, folded into the canonical URLs so they
      // don't 404 (and don't split link equity).
      { source: "/pricing", destination: "/#pricing", permanent: true },
      { source: "/faq", destination: "/#faq", permanent: true },
      { source: "/download", destination: "/#download", permanent: true },
      { source: "/privacy-policy", destination: "/privacy", permanent: true },
    ];
  },
};

export default nextConfig;
