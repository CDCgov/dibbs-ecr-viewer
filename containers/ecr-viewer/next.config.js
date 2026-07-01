/** @type {import('next').NextConfig} */
const path = require("path");
const basePath = "/ecr-viewer";

const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig = {
  sassOptions: {
    loadPaths: [
      path.join(__dirname, "node_modules", "@uswds", "uswds", "packages"),
    ],
    api: "legacy",
    quietDeps: true,
  },
  experimental: {
    // Because of our deployment set up, the same-origin policy does not work
    // in production. Server actions are protected like any other route, so we
    // allow any origin to hit them
    serverActions: {
      allowedOrigins: ["**.cloudapp.azure.com", "**.azurecontainerapps.io"],
    },
    middlewareClientMaxBodySize: "50mb",
    // Disable image caching due to requirement for read only filesystem
    isrFlushToDisk: false,
  },
  output: "standalone",
  basePath,
  env: {
    BASE_PATH: basePath,
  },

  // next auth useSession doesn't double mount nicely
  reactStrictMode: false,

  // avoid jest error about multiple package-lock.json
  outputFileTracingRoot: __dirname,
};

module.exports = withBundleAnalyzer(nextConfig);
