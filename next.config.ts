import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sql.js"],

  // ── Security headers ──────────────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent MIME type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Prevent clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          // Basic XSS protection (legacy but still useful)
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // Referrer policy: only send origin for cross-origin
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Permissions: restrict sensitive APIs
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Content-Security-Policy: allow self + inline styles (Tailwind), block externals
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self'",
              "connect-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
      // HSTS for API routes (production only, enforced by Next.js on Vercel)
      {
        source: "/api/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
    ];
  },
};

export default nextConfig;
