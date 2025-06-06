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

    // Because of our deployment set up, the same-origin policy does not work
    // in production. Server actions are protected like any other route, so we
    // allow any origin to hit them
    serverActions: {
      allowedOrigins: ["**.cloudapp.azure.com", "**.azurecontainerapps.io"],
    },
  },
  output: "standalone",
  basePath,
  env: {
    BASE_PATH: basePath,
  },
};

module.exports = withBundleAnalyzer(nextConfig);
