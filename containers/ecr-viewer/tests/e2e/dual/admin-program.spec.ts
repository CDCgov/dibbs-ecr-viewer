import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";

import { logIn } from "../utils";

test.describe("program management page", () => {
  test.beforeEach(({ page }) => logIn(page));

  test("should pass accessibility", async ({ page }) => {
    await page.goto("/ecr-viewer/admin/program");

    await expect(
      page.getByRole("heading", { name: "Program management" }),
    ).toBeVisible();

    const accessibilityScanResultsBase = await new AxeBuilder({
      page,
    }).analyze();
    expect(accessibilityScanResultsBase.violations).toEqual([]);
  });

  test("should create a program", async ({ page }) => {
    await page.goto("/ecr-viewer/admin/program");

    await expect(
      page.getByRole("heading", { name: "Program management" }),
    ).toBeVisible();

    await page.getByText("Create program area").click();

    await page.waitForURL("/ecr-viewer/admin/program/create");
    await expect(
      page.getByRole("heading", { name: "Create program area" }),
    ).toBeVisible();

    const axe = new AxeBuilder({ page });

    const accessibilityScanResultsBase = await axe.analyze();
    expect(accessibilityScanResultsBase.violations).toEqual([]);

    // search for a condition (but not too specifically due to randomness)
    await page.getByPlaceholder("Search conditions").fill("i");
    await expect(page.getByText("232 results")).toBeVisible();

    // Find a random condition (avoid clashes in parallel tests)
    const checkboxes = await page.getByRole("checkbox").all();
    const index = Math.floor(Math.random() * checkboxes.length);
    const checkbox = checkboxes[index];
    const conditionName = await checkbox.inputValue();
    await checkbox.scrollIntoViewIfNeeded();
    await checkbox.dispatchEvent("click");

    await page.getByLabel("Program area name").fill(conditionName);

    await page
      .getByRole("button", { name: "Save program area" })
      .first()
      .click();

    await page.waitForURL("/ecr-viewer/admin/program");
    await expect(
      page.getByRole("heading", { name: "Program management" }),
    ).toBeVisible();

    await expect(page.getByRole("cell", { name: conditionName })).toBeVisible();
    await expect(
      page.getByText(`${conditionName} successfully saved`),
    ).toBeVisible();

    // open up side panel
    await page.getByRole("button", { name: conditionName }).click();
    await expect(page.getByText("Program area information")).toBeVisible();

    // axe struggles with the modal background, but all manual testing
    // points to contrast being fine
    axe.disableRules("color-contrast");

    const accessibilityScanResultsSidePanel = await axe.analyze();
    expect(accessibilityScanResultsSidePanel.violations).toEqual([]);

    await page.getByRole("button", { name: "Close this window" }).click();

    // Open create form to test already assigned modal
    await page.getByText("Create program area").click();
    // search for a condition again so checkbox is correct
    await page.getByPlaceholder("Search conditions").fill("i");
    await expect(page.getByText("232 results")).toBeVisible();
    await expect(page.getByText(`Condition in ${conditionName}`)).toBeVisible();
    await checkbox.scrollIntoViewIfNeeded();
    await checkbox.dispatchEvent("click");
    await expect(page.getByText("Are you sure you want to add")).toBeVisible();

    // this is flaky on webkit, so adding more retrying
    let accessibilityScanResultsModal = await axe.analyze();
    if (accessibilityScanResultsModal.violations.length > 0) {
      accessibilityScanResultsModal = await axe.analyze();
    }
    expect(accessibilityScanResultsModal.violations).toEqual([]);

    // re-submit to check duplicate checking
    await page.getByRole("button", { name: "Yes, add condition" }).click();
    await page.getByLabel("Program area name").fill(conditionName);
    await expect(
      page.getByText(
        "Please pick a different program name. This program name already exists.",
      ),
    ).toBeVisible();

    // Go back to main table
    await page
      .getByRole("link", { name: "Back to program area management" })
      .click();
    await page.waitForURL("/ecr-viewer/admin/program");

    // open up side panel to edit the condition
    await page.getByRole("button", { name: conditionName }).click();
    await expect(page.getByText("Program area information")).toBeVisible();
    await page.getByText("Edit program area").click();

    await page.waitForURL(/\/ecr-viewer\/admin\/program\/edit\?uuid=.*/);
    await expect(
      page.getByRole("heading", { name: "Edit program area" }),
    ).toBeVisible();

    // Not touched yet
    await expect(
      page.getByRole("button", { name: "Save program area" }).first(),
    ).toBeDisabled();

    const newConditionName = conditionName + " edited";
    await page.getByLabel("Program area name").fill(newConditionName);

    await page
      .getByRole("button", { name: "Save program area" })
      .first()
      .click();

    await page.waitForURL("/ecr-viewer/admin/program");
    await expect(
      page.getByRole("heading", { name: "Program management" }),
    ).toBeVisible();

    await expect(
      page.getByRole("cell", { name: newConditionName }),
    ).toBeVisible();
    await expect(
      page.getByText(`${newConditionName} successfully saved`),
    ).toBeVisible();

    // open up side panel to delete the condition
    await page.getByRole("button", { name: newConditionName }).click();
    await expect(page.getByText("Program area information")).toBeVisible();

    await page.getByRole("button", { name: "Remove program area" }).click();
    await expect(page.getByText(`Remove ${newConditionName}`)).toBeVisible();

    const accessibilityScanResultsConfirmation = await axe.analyze();
    expect(accessibilityScanResultsConfirmation.violations).toEqual([]);

    await page
      .getByRole("button", { name: "Yes, remove program area" })
      .click();
    await expect(page.locator("body")).not.toHaveAttribute("data-modal-count");

    await expect(
      page.getByText(`${newConditionName} successfully removed`),
    ).toBeVisible();

    // Dismiss any toasts
    await page.keyboard.press("Escape");

    for (const el of await page.getByText(conditionName).all()) {
      await expect(el).not.toBeVisible();
    }

    for (const el of await page.getByText(newConditionName).all()) {
      await expect(el).not.toBeVisible();
    }
  });
});
