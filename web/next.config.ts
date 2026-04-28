import type { NextConfig } from "next";

// Next.js 16 enables Turbopack by default for `next dev` and `next build`.
// We avoid adding a `webpack` config here because Turbopack rejects builds
// that mix the two without an explicit opt-in. Turbopack's own watcher is
// already efficient enough that we don't need custom watchOptions.

const nextConfig: NextConfig = {
  // Avoid producing source maps for the production browser bundle — they
  // double the disk/CPU load on every save without giving us much for this
  // static-data app.
  productionBrowserSourceMaps: false,
  // Image optimization is overkill for our intro/slide JPEGs that are
  // already pre-sized; let the static files serve as-is to skip the
  // sharp/ipx pipeline at request time.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
