import { defineConfig, devices } from "@playwright/test";

// for main e2e tests, pick the test dir based on the config
const testDir =
  process.env.CONFIG_NAME?.endsWith("DUAL") ||
  process.env.CONFIG_NAME?.endsWith("NON_INTEGRATED")
    ? "./tests/e2e/dual"
    : "./tests/e2e/integrated";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./tests/e2e", // base test dir
  globalSetup: require.resolve("./tests/e2e/global-setup"),
  globalTeardown: require.resolve("./tests/e2e/global-teardown"),
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: false && !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 1 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [["list"], ["html"]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  expect: {
    timeout: 5_000,
  },
  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testDir,
    },

    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
      testIgnore: [/lighthouse.spec.ts/],
      testDir,
    },

    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      testIgnore: [/lighthouse.spec.ts/],
      testDir,
    },

    {
      name: "migrations",
      use: { ...devices["Desktop Chrome"] },
      testMatch: [/migrations.spec.ts/],
    },

    {
      name: "seed",
      use: { ...devices["Desktop Chrome"] },
      testMatch: [/seed.spec.ts/],
    },
  ],
  webServer: {
    command: "npm run local-docker",
    port: 3000,
    timeout: 240 * 1000,
    reuseExistingServer: true,
    stdout: "pipe",
  },
});
