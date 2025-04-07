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

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
