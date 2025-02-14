/** @type {import('next').NextConfig} */
const path = require("path");
const basePath = "/ecr-viewer";

const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig = {
  sassOptions: {
    includePaths: [
      path.join(__dirname, "node_modules", "@uswds", "uswds", "packages"),
    ],
  },
  experimental: {
    instrumentationHook: true, // this needs to be here for opentelemetry
  },
  transpilePackages: ["yaml"],
  output: "standalone",
  basePath: basePath,
  env: {
    BASE_PATH: basePath,
  },
};

module.exports = withBundleAnalyzer(nextConfig);
