import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Ignore during builds - warnings are too noisy
    ignoreDuringBuilds: true,
  },

  // Reduce file watcher issues during rapid changes
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000, // Check for changes every second
        aggregateTimeout: 300, // Delay before rebuilding
      };
    }
    return config;
  },
};

export default nextConfig;
