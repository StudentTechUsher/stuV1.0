import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable webpack cache to prevent corruption issues
  webpack: (config) => {
    config.cache = false;
    return config;
  },
};

export default nextConfig;
