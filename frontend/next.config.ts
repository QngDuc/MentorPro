import type { NextConfig } from "next";



const nextConfig: NextConfig & {
  eslint?: {
    ignoreDuringBuilds?: boolean;
  };
} = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};
module.exports = {
  allowedDevOrigins: ['192.168.1.10'],
}
export default nextConfig;
