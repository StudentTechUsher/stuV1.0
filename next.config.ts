import type { NextConfig } from "next";

const nextConfig: NextConfig = {


  // Reduce file watcher issues during rapid changes
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000, // Check for changes every second
      };
    }
    return config;
  },

  // Silence Turbopack vs Webpack warning in Next.js 16
  turbopack: {},
};

export default nextConfig;
