import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root: a stray lockfile in the user's home dir made
  // Next.js infer the wrong root. Anchor it to this project.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
