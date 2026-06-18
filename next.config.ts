import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The data/AI layer is server-only (Neon + Gemini run under the Node runtime).
  // Keep their native/server deps out of the client bundle.
  serverExternalPackages: ["@neondatabase/serverless"],
};

export default nextConfig;
