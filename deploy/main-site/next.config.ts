import type { NextConfig } from "next";

/**
 * VoxVision main site (voxvision.site) with the School OS zone mounted at /mananvidyademo.
 *
 * The only change from the existing next.config.ts is the rewrites() block. When SCHOOL_OS_ORIGIN
 * is not set, no rewrite is added and the site behaves exactly as before.
 *
 * SCHOOL_OS_ORIGIN = the School OS deployment's own origin, e.g. https://voxvision-school-os.vercel.app
 */
const SCHOOL_OS_ORIGIN = process.env.SCHOOL_OS_ORIGIN?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async rewrites() {
    if (!SCHOOL_OS_ORIGIN) return [];
    return [
      { source: "/mananvidyademo", destination: `${SCHOOL_OS_ORIGIN}/mananvidyademo` },
      { source: "/mananvidyademo/:path*", destination: `${SCHOOL_OS_ORIGIN}/mananvidyademo/:path*` },
    ];
  },
};

export default nextConfig;
