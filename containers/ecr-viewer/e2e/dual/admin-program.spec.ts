import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";

import { logInToKeycloak } from "./utils";

test.describe("user management page", () => {
  test.beforeEach(logInToKeycloak);

  test("should pass accessiblity", async ({ page }) => {
    await page.goto("/ecr-viewer/admin/program");

    await expect(page.getByText("Program management")).toBeVisible();

    const accessibilityScanResultsBase = await new AxeBuilder({
      page,
    }).analyze();
    expect(accessibilityScanResultsBase.violations).toEqual([]);
  });
});
