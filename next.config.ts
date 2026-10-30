import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Use worker threads instead of child processes for Turbopack's Node.js
    // evaluation (webpack loaders, Babel, PostCSS). Fixes Windows crash where
    // the child process exits with code 0 before Turbopack can connect.
    turbopackPluginRuntimeStrategy: "forceWorkerThreads",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Next.js App Router requires 'unsafe-inline' for styles in dev;
              // in production Turbopack inlines critical CSS.
              "style-src 'self' 'unsafe-inline'",
              // Next.js App Router inline hydration scripts require 'unsafe-inline'.
              // Nonces are incompatible with PPR (partialPrefetching) and cacheComponents
              // per official Next.js CSP documentation.
              process.env.NODE_ENV === "production"
                ? "script-src 'self' 'unsafe-inline'"
                : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              // Only client connections are governed by this header; Gemini is called server-side only
              "connect-src 'self'",
              "img-src 'self' data:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
            ].join("; "),
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
