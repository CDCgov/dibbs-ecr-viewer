import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";

import { logInToKeycloak } from "./utils";

test.describe("user management page", () => {
  test.beforeEach(logInToKeycloak);

  test("should pass accessiblity", async ({ page }) => {
    await page.goto("/ecr-viewer/admin/user");

    await expect(page.getByText("User Management")).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
