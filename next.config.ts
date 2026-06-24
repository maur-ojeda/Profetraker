import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output produces a self-contained server build under .next/standalone/
  // with only the files needed at runtime. Required for minimal Docker images
  // and for deploying to Coolify / any container host without bringing the
  // full dev toolchain.
  output: "standalone",

  // Disable Next.js telemetry during image builds.
  // (No-op in production runtime, kept here for clarity.)
  experimental: {
    // Reserved for future flags. Empty in the Coolify branch.
  },
};

export default nextConfig;
