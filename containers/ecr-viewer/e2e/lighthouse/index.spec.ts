import { Browser, chromium, test } from "@playwright/test";
import getPort from "get-port";
import {
  playwrightLighthouseConfig,
  playwrightLighthouseResult,
} from "playwright-lighthouse";

import { waitForKeycloak, logInToKeycloak } from "../non-integrated/utils";

const lighthouseTest = test.extend<
  {},
  {
    port: number;
    browser: Browser;
    playAudit: (
      config: playwrightLighthouseConfig,
    ) => Promise<playwrightLighthouseResult>;
    commonConfig: Partial<playwrightLighthouseConfig>;
  }
>({
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
        args: [
          `--remote-debugging-port=${port}`,
          "--ignore-certificate-errors",
        ],
      });
      await use(browser);
    },
    { scope: "worker" },
  ],

  playAudit: [
    async ({}, use) => {
      // dynamic import due to esmodule issue wth playwright
      // https://github.com/abhinaba-ghosh/playwright-lighthouse/issues/72
      const { playAudit } = await import("playwright-lighthouse");
      await use(playAudit);
    },
    { scope: "worker" },
  ],

  commonConfig: [
    async ({}, use) => {
      // dynamic import due to esmodule issue wth playwright
      // https://github.com/abhinaba-ghosh/playwright-lighthouse/issues/72
      const lighthouseDesktopConfig = await import(
        "lighthouse/core/config/desktop-config.js"
      );
      const commonConfig = {
        config: lighthouseDesktopConfig.default,
        reports: {
          formats: {
            html: !!process.env.CI,
          },
        },
      };
      await use(commonConfig);
    },
    { scope: "worker" },
  ],
});

lighthouseTest.describe("lighthouse", async () => {
  lighthouseTest.beforeAll(waitForKeycloak);
  lighthouseTest.beforeEach(logInToKeycloak);

  lighthouseTest(
    "home page",
    async ({ page, port, playAudit, commonConfig }) => {
      await page.goto("/ecr-viewer");
      await page.waitForURL("/ecr-viewer");
      await playAudit({
        page,
        thresholds: {
          performance: 75,
          accessibility: 100,
        },
        port,
        ...commonConfig,
      });
    },
  );

  lighthouseTest(
    "ecr page 1",
    async ({ page, port, playAudit, commonConfig }) => {
      await page.goto(
        "/ecr-viewer/view-data?id=db734647-fc99-424c-a864-7e3cda82e703",
      );
      await page.waitForURL(
        "/ecr-viewer/view-data?id=db734647-fc99-424c-a864-7e3cda82e703",
      );
      await playAudit({
        page,
        thresholds: {
          performance: 83,
          accessibility: 100,
        },
        port,
        ...commonConfig,
      });
    },
  );

  lighthouseTest(
    "ecr page 2",
    async ({ page, port, playAudit, commonConfig }) => {
      await page.goto(
        "/ecr-viewer/view-data?id=e91bc1e8-2523-4047-a663-1e3e07812948",
      );
      await page.waitForURL(
        "/ecr-viewer/view-data?id=e91bc1e8-2523-4047-a663-1e3e07812948",
      );
      await playAudit({
        page,
        thresholds: {
          performance: 83,
          accessibility: 100,
        },
        port,
        ...commonConfig,
      });
    },
  );

  lighthouseTest(
    "ecr page 404",
    async ({ page, port, playAudit, commonConfig }) => {
      await page.goto("/ecr-viewer/view-data?id=i-am-fake");
      await page.waitForURL("/ecr-viewer/view-data?id=i-am-fake");
      await playAudit({
        page,
        thresholds: {
          performance: 85,
          accessibility: 100,
        },
        port,
        ...commonConfig,
      });
    },
  );
});
