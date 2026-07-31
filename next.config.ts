import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Explicitly set the workspace root to avoid Turbopack lockfile ambiguity
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
