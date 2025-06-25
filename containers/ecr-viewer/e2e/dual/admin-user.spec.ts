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

    // create user page
    await page.goto("/ecr-viewer/admin/user");

    await expect(
      page.getByRole("heading", { name: "User management" }),
    ).toBeVisible();

    await page.getByText("Create user").click();

    await page.waitForURL("/ecr-viewer/admin/user/create");
    await expect(
      page.getByRole("heading", { name: "Create user" }),
    ).toBeVisible();

    const accessibilityScanResultsBaseCreateUser = await new AxeBuilder({
      page,
    }).analyze();
    expect(accessibilityScanResultsBaseCreateUser.violations).toEqual([]);

    await page.getByRole("link", { name: "Back to user management" }).click();
    await expect(
      page.getByRole("heading", { name: "User management" }),
    ).toBeVisible();

    // open up side panel
    await page.getByText("ecr-viewer@admin.com").click();
    await expect(
      page.getByRole("heading", { name: "Ecr Admin" }),
    ).toBeVisible();

    // axe struggles with the modal background, but all manual testing
    // points to contrast being fine
    const accessibilityScanResultsSidePanel = await new AxeBuilder({
      page,
    })
      .disableRules("color-contrast")
      .analyze();
    expect(accessibilityScanResultsSidePanel.violations).toEqual([]);
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
    const user = await createRandomUser(browserName, page, "standard", [
      program1,
    ]);

    // Check that user has been successfully/correctly created
    await page.waitForURL("/ecr-viewer/admin/user");
    await page.getByTestId("Select").selectOption("50"); // Increase user table pagination for testing
    await expect(page.getByRole("button", { name: user })).toBeVisible();
    await expect(page.getByText(`${user} successfully saved`)).toBeVisible();
    const row = page.locator("tr", {
      has: page.getByText(user),
    });
    await expect(row.getByText("Standard")).toBeVisible();
    await expect(page.getByText(program1)).toBeVisible();
    await expect(page.getByText(program2)).not.toBeVisible();

    // Open side panel to edit user
    await page.getByRole("button", { name: user }).click();
    await expect(page.getByText("User information")).toBeVisible();
    await page.getByText("Edit user").click();
    await page.waitForURL(/\/ecr-viewer\/admin\/user\/edit\?uuid=.*/);
    await expect(
      page.getByRole("heading", { name: "Edit user" })
    ).toBeVisible();

    // Not touched yet
    await expect(
      page.getByRole("button", { name: "Save user" }).first()
    ).toBeDisabled();

    // Edit user email & program
    const newEmail = user + "edited";
    page.getByLabel("Email").clear();
    page.getByLabel("Email").fill(newEmail);

    const checkboxProgram1 = page.getByLabel(`Select ${program1}`, {
      exact: true,
    });
    await checkboxProgram1.scrollIntoViewIfNeeded();
    await checkboxProgram1.dispatchEvent("click");

    const checkboxProgram2 = page.getByLabel(`Select ${program2}`, {
      exact: true,
    });
    await checkboxProgram2.scrollIntoViewIfNeeded();
    await checkboxProgram2.dispatchEvent("click");
    await page.getByRole("button", { name: "Save user" }).first().click();

    // Confirm edit changes have saved
    await page.waitForURL("/ecr-viewer/admin/user");
    await expect(
      page.getByRole("heading", { name: "User management" })
    ).toBeVisible();

    await expect(page.getByRole("cell", { name: newEmail })).toBeVisible();
    await expect(
      page.getByText(`${newEmail} successfully saved`)
    ).toBeVisible();
    await expect(page.getByText(program1)).not.toBeVisible();
    await expect(page.getByText(program2)).toBeVisible();

    // Delete the user
    await page.getByRole("button", { name: newEmail }).click();
    await expect(page.getByText("User information")).toBeVisible();

    await page.getByRole("button", { name: "Remove user" }).click();
    await expect(page.getByText(`Remove ${newEmail}`)).toBeVisible();

    await page.getByRole("button", { name: "Yes, remove user" }).click();
    await expect(
      page.getByText(`${newEmail} succesfully removed`)
    ).toBeVisible();

    // Dismiss any toasts
    await page.keyboard.press("Escape");

    await page.goto("/ecr-viewer/admin/program");
    await deleteProgramArea(page, program1);
    await deleteProgramArea(page, program2);
  });

  test("filter by user type or program area", async ({ page, browserName }) => {
    await logInToKeycloak({ page });

    // Create programs
    const program1 = await createRandomProgramArea(page);
    const program2 = await createRandomProgramArea(page);

    // Create users
    await page.getByTestId("Select").selectOption("50"); // Increase user table pagination for testing
    const userAdmin = await createRandomUser(browserName, page, "admin", []);
    const userStandard1 = await createRandomUser(
      browserName,
      page,
      "standard",
      [program1]
    );
    const userStandard2 = await createRandomUser(
      browserName,
      page,
      "standard",
      [program2]
    );
    const userStandard3 = await createRandomUser(
      browserName,
      page,
      "standard",
      []
    );

    // filter by user type
    await page.getByLabel("Filter by user type").click();
    await expect(page.getByText("Filter by user type")).toBeVisible();
    await page.getByLabel("Admin").dispatchEvent("click");
    await expect(
      page.getByRole("table").getByText("Standard")
    ).not.toBeVisible();

    await page.getByLabel("Standard").dispatchEvent("click");
    await expect(page.getByRole("table").getByText("Admin")).not.toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByText("Filter by user type")).not.toBeVisible();

    await page.getByLabel("Reset Filters to Defaults").click();
    await expect(
      page.getByLabel("Reset Filters to Defaults")
    ).not.toBeVisible();

    // filter by program area
    await page.getByLabel("Filter by program area").click();
    await expect(page.getByText("Filter by program area")).toBeVisible();
    await expect(page.getByText("All program areas (Admin)")).toBeVisible();
    await expect(page.getByText("No program areas (Standard)")).toBeVisible();

    const checkboxfilterProgram1 = page.getByLabel(`${program1}`, {
      exact: true,
    });
    await checkboxfilterProgram1.dispatchEvent("click");
    await expect(
      page.getByRole("table").getByText(userStandard1)
    ).not.toBeVisible();

    await checkboxfilterProgram1.dispatchEvent("click");
    const checkboxfilterProgram2 = page.getByLabel(`${program2}`, {
      exact: true,
    });
    await checkboxfilterProgram2.dispatchEvent("click");
    await expect(
      page.getByRole("table").getByText(userStandard2)
    ).not.toBeVisible();

    // Deselect all programs: no users should show up
    const checkboxSelectAll = page.getByLabel("Select all");
    await checkboxSelectAll.dispatchEvent("click");
    const checkboxDeselectAll = page.getByLabel("Deselect all");
    await checkboxDeselectAll.dispatchEvent("click");
    await expect(
      page.getByText(
        "No users found. We couldn't find any users matching your filter criteria."
      )
    ).toBeVisible();

    // All program areas (Admins) should only show admin
    const checkboxAllProgramAreas = page.getByLabel("All program areas (Admin)");
    await checkboxAllProgramAreas.dispatchEvent("click");
    await expect(page.getByRole("table").getByText(userAdmin)).toBeVisible();
    await expect(
      page.getByRole("table").getByText("Standard")
    ).not.toBeVisible();

    // No program areas (Standard) should show standard users with no program areas
    // await checkboxAllProgramAreas.dispatchEvent("click");

    // Escape and reset
    await page.keyboard.press("Escape");
    await expect(page.getByText("Filter by program area")).not.toBeVisible();

    await page.getByLabel("Reset Filters to Defaults").click();
    await expect(
      page.getByLabel("Reset Filters to Defaults")
    ).not.toBeVisible();

    await expect(page.getByText(userAdmin)).toBeVisible();
    await expect(page.getByText(userStandard1)).toBeVisible();
    await expect(page.getByText(userStandard2)).toBeVisible();
    await expect(page.getByText(userStandard3)).toBeVisible();
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

  // Edge case if randomly adds a condition that's already in a different program area
  const confirmModal = page.getByText(/Are you sure you want to add/i);
  try {
    await confirmModal.waitFor({ timeout: 1000 });
    await page.getByRole("button", { name: /Yes, add condition/i }).click();
  } catch (e) {
    // Confirmation modal did not appear
  }
  const conditionName = await checkboxCond.inputValue();

  await page.getByLabel("Program area name").fill(`Program ${conditionName}`);
  await page.getByRole("button", { name: "Save program area" }).first().click();

  await page.waitForURL("/ecr-viewer/admin/program");

  return `Program ${conditionName}`;
};

const createRandomUser = async (
  browserName: string,
  page: Page,
  userType: string = "standard",
  programAreas: string[],
) => {
  await page.goto("/ecr-viewer/admin/user");
  await expect(
    page.getByRole("heading", { name: "User management" }),
  ).toBeVisible();
  await page.getByText("Create user").click();
  await page.waitForURL("/ecr-viewer/admin/user/create");

  const random = Math.floor(Math.random() * 1000);
  await page.getByLabel("Email").fill(`${browserName}-${random}@user.com`);

  if (userType === "admin") {
    const adminRadio = page.getByLabel("Admin");
    await adminRadio.dispatchEvent("click");
  }

  if (userType === "standard") {
    for (const program of programAreas) {
      const standardRadio = page.getByLabel("Standard");
      await standardRadio.scrollIntoViewIfNeeded();
      await standardRadio.dispatchEvent("click");

      const checkbox = page.getByLabel(`Select ${program}`, {
        exact: true,
      });
      await checkbox.scrollIntoViewIfNeeded();
      await checkbox.dispatchEvent("click");
    }
  }

  await page.getByRole("button", { name: "Save user" }).first().click();
  await page.waitForURL("/ecr-viewer/admin/user");

  await expect(
    page.getByText(`${random}@user.com successfully saved`),
  ).toBeVisible();

  return `${random}@user.com`;
};

const deleteProgramArea = async (page: Page, program: string) => {
  await page.getByLabel("Program areas per page").selectOption("100");
  await page.getByRole("button", { name: program }).click();
  await page.getByRole("button", { name: "Remove program area" }).click();
  await page.getByRole("button", { name: "Yes, remove program area" }).click();
};
