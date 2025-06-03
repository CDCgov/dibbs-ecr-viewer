import AxeBuilder from "@axe-core/playwright";
import { test, expect, Page } from "@playwright/test";

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

    await page.getByText("Create user").click();

    await page.waitForURL("/ecr-viewer/admin/user/create");
    await expect(
      page.getByRole("heading", { name: "Create user" }),
    ).toBeVisible();

    const accessibilityScanResultsBase = await new AxeBuilder({
      page,
    }).analyze();
    expect(accessibilityScanResultsBase.violations).toEqual([]);

    const email = `${browserName}-${Math.floor(Math.random() * 100)}@test.test`;
    page.getByLabel("Email").fill(email);
    const adminRadio = page.getByLabel("Standard");
    await adminRadio.scrollIntoViewIfNeeded();
    await adminRadio.dispatchEvent("click");

    const checkboxProgram1 = page.getByLabel(`Select ${program1}`, {
      exact: true,
    });
    await checkboxProgram1.scrollIntoViewIfNeeded();
    await checkboxProgram1.dispatchEvent("click");

    await page.getByRole("button", { name: "Create user" }).first().click();

    // Check that user has been successfully/correctly created
    await page.waitForURL("/ecr-viewer/admin/user");
    await expect(page.getByRole("button", { name: email })).toBeVisible();
    await expect(page.getByText(`${email} successfully saved`)).toBeVisible();
    const row = page.locator("tr", {
      has: page.getByText(email),
    });
    await expect(row.getByText("Standard")).toBeVisible();
    await expect(page.getByText(program1)).toBeVisible();
    await expect(page.getByText(program2)).not.toBeVisible();

    // Delete the user
    await page.getByRole("button", { name: email }).click();
    await expect(page.getByText("User information")).toBeVisible();

    await page.getByRole("button", { name: "Remove user" }).click();
    await expect(page.getByText(`Remove ${email}`)).toBeVisible();

    await page.getByRole("button", { name: "Yes, remove user" }).click();
    await expect(page.getByText(`${email} succesfully removed`)).toBeVisible();

    // Dismiss any toasts
    await page.keyboard.press("Escape");

    await deleteProgramArea(page, program1);
    await deleteProgramArea(page, program2);
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
  const conditionName = await checkboxCond.inputValue();

  await page.getByLabel("Program area name").fill(`Program ${conditionName}`);
  await page
    .getByRole("button", { name: "Create program area" })
    .first()
    .click();

  await page.waitForURL("/ecr-viewer/admin/program");

  return `Program ${conditionName}`;
};

const deleteProgramArea = async (page: Page, program: string) => {
  await page.goto("/ecr-viewer/admin/program");
  await page.getByLabel("Program areas per page").selectOption("100");
  await page.getByRole("button", { name: program }).click();
  await page.getByRole("button", { name: "Delete program area" }).click();
  await page.getByRole("button", { name: "Yes, delete program area" }).click();
};
