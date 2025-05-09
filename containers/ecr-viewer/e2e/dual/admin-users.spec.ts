import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";

import { logInToKeycloak } from "./utils";

test.describe("user management page", () => {
  test.beforeEach(logInToKeycloak);

  test("should pass accessiblity", async ({ page }) => {
    await page.goto("/ecr-viewer/admin/user");

    await expect(page.getByText("User Management")).toBeVisible();

    const accessibilityScanResultsBase = await new AxeBuilder({
      page,
    }).analyze();
    expect(accessibilityScanResultsBase.violations).toEqual([]);

    // open up side panel
    await page.getByText("ecr-viewer@admin.com").click();
    await expect(page.getByText("Ecr Admin")).toBeVisible();

    const accessibilityScanResultsSidePanel = await new AxeBuilder({
      page,
    }).analyze();
    expect(accessibilityScanResultsSidePanel.violations).toEqual([]);
  });
});
