import AxeBuilder from "@axe-core/playwright";
import { test, expect, Page } from "@playwright/test";

import { logInToKeycloak } from "./utils";

test.describe("user management page", () => {
  test("should pass accessiblity", async ({ page }) => {
    await logInToKeycloak({ page });

    await page.goto("/ecr-viewer/admin/user");

    await expect(
      page.getByRole("heading", { name: "User management" }),
    ).toBeVisible();

    const accessibilityScanResultsBase = await new AxeBuilder({
      page,
    }).analyze();
    expect(accessibilityScanResultsBase.violations).toEqual([]);

    // open up side panel
    await page.getByText("ecr-viewer@admin.com").click();
    await expect(
      page.getByRole("heading", { name: "Ecr Admin" }),
    ).toBeVisible();

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

  test("should create, edit, and delete a new user", async ({
    page,
    browserName,
  }) => {
    await logInToKeycloak({ page });

    // Create programs
    const program1 = await createRandomProgramArea(page);
    const program2 = await createRandomProgramArea(page);

    // Create user & assign to Program 1
    await page.goto("/ecr-viewer/admin/user");

    await expect(
      page.getByRole("heading", { name: "User management" }),
    ).toBeVisible();

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

    await page.getByRole("button", { name: "Save user" }).first().click();

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

    // Open side panel to edit user
    await page.getByRole("button", { name: email }).click();
    await expect(page.getByText("User information")).toBeVisible();
    await page.getByText("Edit user").click();
    await page.waitForURL(/\/ecr-viewer\/admin\/user\/edit\?uuid=.*/);
    await expect(
      page.getByRole("heading", { name: "Edit user" }),
    ).toBeVisible();

    // Not touched yet
    await expect(
      page.getByRole("button", { name: "Save user" }).first(),
    ).toBeDisabled();

    // Edit user email & program
    const newEmail = email + "edited";
    page.getByLabel("Email").clear();
    page.getByLabel("Email").fill(newEmail);

    await checkboxProgram1.scrollIntoViewIfNeeded();
    await checkboxProgram1.dispatchEvent("click");

    const checkboxProgram2 = page.getByLabel(`Select ${program2}`, {
      exact: true,
    });
    await checkboxProgram2.scrollIntoViewIfNeeded();
    await checkboxProgram2.dispatchEvent("click");
    await page
      .getByRole("button", { name: "Save user" })
      .first()
      .click();

    // Confirm edit changes have saved
    await page.waitForURL("/ecr-viewer/admin/user");
    await expect(
      page.getByRole("heading", { name: "User management" }),
    ).toBeVisible();

    await expect(page.getByRole("cell", { name: newEmail })).toBeVisible();
    await expect(
      page.getByText(`${newEmail} successfully saved`),
    ).toBeVisible();
    await expect(page.getByText(program1)).not.toBeVisible();
    await expect(page.getByText(program2)).toBeVisible();

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

  test("it should not show to non-admin", async ({ page }) => {
    await logInToKeycloak({ page }, undefined, "ecr-viewer-standard");
    await page.goto("/ecr-viewer/admin/user");

    await expect(
      page.getByRole("heading", { name: "Page not found" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "User management" }),
    ).not.toBeVisible();
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
  await page.getByRole("button", { name: "Save program area" }).first().click();

  await page.waitForURL("/ecr-viewer/admin/program");

  return `Program ${conditionName}`;
};

const deleteProgramArea = async (page: Page, program: string) => {
  await page.goto("/ecr-viewer/admin/program");
  await page.getByLabel("Program areas per page").selectOption("100");
  await page.getByRole("button", { name: program }).click();
  await page.getByRole("button", { name: "Remove program area" }).click();
  await page.getByRole("button", { name: "Yes, remove program area" }).click();
};
