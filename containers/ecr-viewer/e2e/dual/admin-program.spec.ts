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

  test("should create a program", async ({ page }) => {
    await page.goto("/ecr-viewer/admin/program");

    await expect(page.getByText("Program management")).toBeVisible();

    await page.getByText("Create program area").click();

    await page.waitForURL("/ecr-viewer/admin/program/create");
    await expect(
      page.getByRole("heading", { name: "Create program area" }),
    ).toBeVisible();

    const accessibilityScanResultsBase = await new AxeBuilder({
      page,
    }).analyze();
    expect(accessibilityScanResultsBase.violations).toEqual([]);

    // Find a random condition (avoid clashes in parallel tests)
    const checkboxes = await page.getByRole("checkbox").all();
    const index = Math.floor(Math.random() * checkboxes.length);
    const checkbox = checkboxes[index];
    const conditionName = await checkbox.inputValue();
    await checkbox.scrollIntoViewIfNeeded();
    await checkbox.dispatchEvent("click");

    page.getByLabel("Program area name").fill(conditionName);

    await page
      .getByRole("button", { name: "Create program area" })
      .first()
      .click();

    await page.waitForURL("/ecr-viewer/admin/program");
    await expect(page.getByText("Program management")).toBeVisible();
    await expect(page.getByText(conditionName)).toBeVisible();
  });
});
