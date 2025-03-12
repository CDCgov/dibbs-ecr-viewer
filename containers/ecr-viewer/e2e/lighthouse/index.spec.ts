import { Browser, chromium, test } from "@playwright/test";
import getPort from "get-port";

import { waitForKeycloak, logInToKeycloack } from "../non-integrated/utils";

const lighthouseTest = test.extend<{}, { port: number; browser: Browser }>({
  port: [
    async ({}, use) => {
      // Assign a unique port for each playwright worker to support parallel tests
      const port = await getPort();
      await use(port);
    },
    { scope: "worker" },
  ],

  browser: [
    async ({ port }, use) => {
      const browser = await chromium.launch({
        args: [`--remote-debugging-port=${port}`],
      });
      await use(browser);
    },
    { scope: "worker" },
  ],
});

lighthouseTest.describe("lighthouse", () => {
  lighthouseTest.beforeAll(waitForKeycloak);
  lighthouseTest.beforeEach(logInToKeycloack);

  lighthouseTest("should pass audit", async ({ page, port }) => {
    // dynamic import due to esmodule issue wth playwright
    // https://github.com/abhinaba-ghosh/playwright-lighthouse/issues/72
    const { playAudit } = await import("playwright-lighthouse");
    await playAudit({
      page,
      thresholds: {
        performance: 60,
        accessibility: 100,
      },
      port,
    });
  });
});
