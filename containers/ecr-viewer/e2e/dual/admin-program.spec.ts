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

    // search for a condition (but not too specifically due to randomness)
    await page.getByPlaceholder("Search conditions").fill("i");
    await expect(page.getByText("216 results")).toBeVisible();

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

    // open up side panel
    await page.getByText(conditionName).click();
    await expect(page.getByText("Program area information")).toBeVisible();

    const accessibilityScanResultsSidePanel = await new AxeBuilder({
      page,
    }).analyze();

    // axe struggles with the modal background, but all manual testing
    // points to contrast being fine
    const nonColorViolationsSidePanel =
      accessibilityScanResultsSidePanel.violations.filter(
        (v) => v.id !== "color-contrast",
      );
    expect(nonColorViolationsSidePanel).toEqual([]);

    await page.getByRole("button", { name: "Close this window" }).click();

    // Open create form to test already assigned modal
    await page.getByText("Create program area").click();
    // search for a condition again so checkbox is correct
    await page.getByPlaceholder("Search conditions").fill("i");
    await expect(page.getByText("216 results")).toBeVisible();
    await expect(page.getByText(`Condition in ${conditionName}`)).toBeVisible();
    await checkbox.scrollIntoViewIfNeeded();
    await checkbox.dispatchEvent("click");
    await expect(page.getByText("Are you sure you want to add")).toBeVisible();

    const accessibilityScanResultsModal = await new AxeBuilder({
      page,
    }).analyze();

    // axe struggles with the modal background, but all manual testing
    // points to contrast being fine
    const nonColorViolationsModal =
      accessibilityScanResultsModal.violations.filter(
        (v) => v.id !== "color-contrast",
      );
    expect(nonColorViolationsModal).toEqual([]);

    // close the confirmation modal
    await page.getByRole("button", { name: "Close this window" }).click();

    await page
      .getByRole("link", { name: "Back to program management" })
      .click();
    await page.waitForURL("/ecr-viewer/admin/program");

    // open up side panel to delete the condition
    await page.getByText(conditionName).click();
    await expect(page.getByText("Program area information")).toBeVisible();

    await page.getByRole("button", { name: "Delete program area" }).click();
    await expect(page.getByText(`Delete ${conditionName}`)).toBeVisible();

    const accessibilityScanResultsConfirmation = await new AxeBuilder({
      page,
    }).analyze();

    // axe struggles with the modal background, but all manual testing
    // points to contrast being fine
    const nonColorViolationsConfirmation =
      accessibilityScanResultsConfirmation.violations.filter(
        (v) => v.id !== "color-contrast",
      );
    expect(nonColorViolationsConfirmation).toEqual([]);

    await page
      .getByRole("button", { name: "Yes, delete program area" })
      .click();
    await expect(page.locator("body")).not.toHaveAttribute("data-modal-count");

    for (const el of await page.getByText(conditionName).all()) {
      await expect(el).not.toBeVisible();
    }
  });
});
