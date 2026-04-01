import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['axios', 'xml2js', 'stripe'],
};

export default nextConfig;
