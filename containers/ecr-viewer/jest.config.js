const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jest-environment-jsdom",
  modulePathIgnorePatterns: ["<rootDir>/.next"],
  testPathIgnorePatterns: ["<rootDir>/e2e"],
  collectCoverage: true,
  testMatch:
    process.env.TEST_TYPE === "integration"
      ? ["<rootDir>/integration/**/?(*.)+(spec|test).[jt]s?(x)"]
      : ["<rootDir>/src/**/?(*.)+(spec|test).[jt]s?(x)"],
  setupFiles:
    process.env.TEST_TYPE === "integration"
      ? ["<rootDir>/integration/setup.ts"]
      : [],
};

// We need to override transformIgnorePatterns after creating the jest config
// because next/jest overrides transformIgnorePatterns to ignore node_modules.
// See here for more info: https://stackoverflow.com/a/72926763
// eslint-disable-next-line jsdoc/require-jsdoc
module.exports = async () => ({
  ...(await createJestConfig(customJestConfig)()),
  transformIgnorePatterns: ["node_modules/(?!(jose)/)"],
});
