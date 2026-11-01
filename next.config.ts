import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The e2e tests use their own build folder (.next-e2e) so they can run
  // without disturbing an `npm run dev` open in the same folder.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
