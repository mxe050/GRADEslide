import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Reduce dev-server overhead on Windows: skip watching node_modules / .next
  // and other large folders. Without this, the file watcher can hammer the
  // disk on cold start and cause the OS to feel sluggish.
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          "**/node_modules/**",
          "**/.next/**",
          "**/.git/**",
          "**/public/data/glossary.json",
        ],
        aggregateTimeout: 250,
        poll: false,
      };
    }
    return config;
  },
  // Avoid building source maps in dev — they double the disk/CPU load on
  // every save without giving us much for this static-data app.
  productionBrowserSourceMaps: false,
  // Image optimization is overkill for our intro/slide JPEGs that are
  // already pre-sized; let the static files serve as-is to skip the
  // sharp/ipx pipeline at request time.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
