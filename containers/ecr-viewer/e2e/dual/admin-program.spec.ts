import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";

import { logInToKeycloak } from "./utils";

test.describe("program management page", () => {
  test.beforeEach(logInToKeycloak);

  test("should pass accessiblity", async ({ page }) => {
    await page.goto("/ecr-viewer/admin/program");

    await expect(page.getByText("Program management")).toBeVisible();

    const accessibilityScanResultsBase = await new AxeBuilder({
      page,
    }).analyze();
    expect(accessibilityScanResultsBase.violations).toEqual([]);

    // TODO: enable these once we can create programs
    // open up side panel
    // await page.getByText("Interesting Conditions").click();
    // await expect(page.getByText("Mpox")).toBeVisible();

    // const accessibilityScanResultsSidePanel = await new AxeBuilder({
    //   page,
    // }).analyze();

    // // axe struggles with the modal background, but all manual testing
    // // points to contrast being fine
    // const nonColorViolations =
    //   accessibilityScanResultsSidePanel.violations.filter(
    //     (v) => v.id !== "color-contrast",
    //   );
    // expect(nonColorViolations).toEqual([]);
  });
});
