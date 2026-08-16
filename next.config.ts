import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheHandlers: {
    default: require.resolve("./cache-handlers/default-handler.js"),
    remote: require.resolve("./cache-handlers/remote-handler.js"),
  },
};

export default nextConfig;
