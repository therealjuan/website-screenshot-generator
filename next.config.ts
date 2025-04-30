import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.module.rules.push({
      test: /\.map$/,
      use: 'ignore-loader',
    });
    return config;
  },  
};

export default nextConfig;
