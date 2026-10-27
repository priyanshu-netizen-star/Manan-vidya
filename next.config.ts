import type { NextConfig } from "next";

/**
 * VoxVision School OS is deployed as a Next.js "zone" under the VoxVision domain.
 * The main voxvision.site app rewrites /mananvidyademo/* to this deployment
 * (see deploy/README.md). basePath must stay in sync with src/lib/config.ts.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  basePath: "/mananvidyademo",
  poweredByHeader: false,
  turbopack: { root: process.cwd() },
  productionBrowserSourceMaps: false,
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  // The guide pages read the client-facing Markdown documents at runtime.
  outputFileTracingIncludes: { "/guide/[slug]": ["./docs/**/*.md"], "/guide": ["./docs/**/*.md"] },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
