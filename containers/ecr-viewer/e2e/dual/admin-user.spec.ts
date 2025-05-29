import AxeBuilder from "@axe-core/playwright";
import { test, expect, Page } from "@playwright/test";

import { toKebabCase } from "@/app/utils/format-utils";

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
    await expect(page.getByText("Ecr Admin")).toHaveCount(2);

    const accessibilityScanResultsSidePanel = await new AxeBuilder({
      page,
    }).analyze();

    // axe struggles with the modal background, but all manual testing
    // points to contrast being fine
    const nonColorViolations =
      accessibilityScanResultsSidePanel.violations.filter(
        (v) => v.id !== "color-contrast",
      );
    expect(nonColorViolations).toEqual([]);
  });

  test("should create a new user", async ({ page, browserName }) => {
    // Create programs
    const program1 = await createRandomProgramArea(page);
    const program2 = await createRandomProgramArea(page);

    // Create user & assign to Program 1
    await page.goto("/ecr-viewer/admin/user");

    await expect(page.getByText("User management")).toBeVisible();

    await page.getByText("Add new user").click();

    await page.waitForURL("/ecr-viewer/admin/user/create");
    await expect(page.getByRole("heading", { name: "Add user" })).toBeVisible();

    const accessibilityScanResultsBase = await new AxeBuilder({
      page,
    }).analyze();
    expect(accessibilityScanResultsBase.violations).toEqual([]);

    page.getByLabel("EMAIL").fill(`${browserName}@test.test`);
    const adminRadio = page.getByLabel("Standard", {exact: true});
    await adminRadio.scrollIntoViewIfNeeded();
    await adminRadio.dispatchEvent("click");

    const checkboxProgram1 = await page.getByLabel(`Checkbox for program-${toKebabCase(program1)}`);  
    await checkboxProgram1.scrollIntoViewIfNeeded();
    await checkboxProgram1.dispatchEvent("click");

    await page.getByRole("button", { name: "Add user" }).first().click();

    // Check that user has been successfully/correctly created
    await page.waitForURL("/ecr-viewer/admin/user");
    await expect(page.getByText(`${browserName}@test.test`)).toBeVisible();
    const row = page.locator("tr", {
      has: page.getByText(`${browserName}@test.test`),
    });
    await expect(row.getByText("Standard")).toBeVisible();
    await expect(page.getByText(program1)).toBeVisible();
    await expect(page.getByText(program2)).not.toBeVisible();
  }); 
});

const createRandomProgramArea = async (page: Page) => {
  await page.goto("/ecr-viewer/admin/program");
  await page.getByText("Create program area").click();
  await page.waitForURL("/ecr-viewer/admin/program/create");

  const checkboxesCond = await page.getByRole("checkbox").all();
  const index = Math.floor(Math.random() * checkboxesCond.length);
  const checkboxCond = checkboxesCond[index];
  await checkboxCond.scrollIntoViewIfNeeded();
  await checkboxCond.dispatchEvent("click");

  await page.getByLabel("Program area name").fill(`Program ${index}`);
  await page
    .getByRole("button", { name: "Create program area" })
    .first()
    .click();

  await page.waitForURL("/ecr-viewer/admin/program");

  return `Program ${index}`;
};