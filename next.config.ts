import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Using Turbopack (via --turbopack flag in package.json scripts)
  // Turbopack has its own optimized caching, no webpack config needed
};

export default nextConfig;
