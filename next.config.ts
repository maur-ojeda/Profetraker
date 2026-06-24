import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output produces a self-contained server build under .next/standalone/
  // with only the files needed at runtime. Required for minimal Docker images
  // and for deploying to Coolify / any container host without bringing the
  // full dev toolchain.
  output: "standalone",

  // Next.js' automatic file tracing sometimes misses dependencies that are
  // loaded dynamically (server-side Supabase client, Gemini SDK, Anime.js,
  // date-fns, zod, plus the Next compiled/* internals). We force-include
  // the whole node_modules tree and the Next dist tree so the standalone
  // build does not crash at runtime with "Cannot find module".
  // Tradeoff: slightly larger image (we are talking tens of MB, not GB).
  outputFileTracingIncludes: {
    "**": ["./node_modules/**", "./.next/server/**", "./.next/serverless/**"],
  },

  // Disable Next.js telemetry during image builds.
  // (No-op in production runtime, kept here for clarity.)
  experimental: {
    // Reserved for future flags. Empty in the Coolify branch.
  },
};

export default nextConfig;
