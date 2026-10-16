import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Prevent linting warnings from blocking production deployments
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Strictly checked via tsc --noEmit locally
    ignoreBuildErrors: false,
  },
  serverExternalPackages: ["canvaskit-wasm"],
};

export default nextConfig;
