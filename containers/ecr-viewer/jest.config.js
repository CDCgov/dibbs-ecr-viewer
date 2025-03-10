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
  moduleNameMapper: {
    "^mssql$": "<rootDir>/src/app/tests/__mocks__/mssql.js",
    "^tedious$": "<rootDir>/src/app/tests/__mocks__/mssql.js",
  },
  testPathIgnorePatterns: ["<rootDir>/e2e"],
  collectCoverage: true,
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
