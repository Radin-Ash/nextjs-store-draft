import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "rosetheme.ir",
      },
      {
        protocol: "https",
        hostname: "tqlotxgnsddkukmluxwv.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb", // Increase the limit as needed
    },
  },
};

export default nextConfig;
