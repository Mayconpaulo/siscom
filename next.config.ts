import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: {
    "/api/manuais/[id]": ["./src/data/manuals/*.pdf"],
  },
};

export default nextConfig;
