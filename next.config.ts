import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native binary addon (its own font engine, no fontconfig dependency) —
  // the bundler can't process its binary loader, so leave it as a plain
  // Node require instead of bundling it.
  serverExternalPackages: ["@napi-rs/canvas"],
};

export default nextConfig;
