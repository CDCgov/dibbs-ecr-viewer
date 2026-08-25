import AxeBuilder from "@axe-core/playwright";
import { test, expect, Page } from "@playwright/test";

import { logIn } from "../utils";

test.describe("user management page", () => {
  test("should pass accessibility", async ({ page }) => {
    await logIn(page);

    await page.goto("/ecr-viewer/admin/user");

    await expect(
      page.getByRole("heading", { name: "User management" }),
    ).toBeVisible();

    await page
      .getByRole("combobox", { name: "Users per page" })
      .selectOption("50"); // Increase user table pagination for testing

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
    await page.getByText(process.env.AUTH_ADMIN_USER!).click();
    await expect(
      page.getByRole("dialog").getByText(process.env.AUTH_ADMIN_USER!),
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

  test("admin: should create, edit, and delete a new user", async ({
    page,
    browserName,
  }) => {
    await logIn(page);

    // Create programs
    const program1 = await getRandomProgramArea(page);
    const program2 = await getRandomProgramArea(page, [program1]);

    // Create user & assign to Program 1
    const user = await createRandomUser(browserName, page, "standard", [
      program1,
    ]);

    // Check that user has been successfully/correctly created
    await page.waitForURL("/ecr-viewer/admin/user");
    await page
      .getByRole("combobox", { name: "Users per page" })
      .selectOption("50"); // Increase user table pagination for testing
    await expect(page.getByRole("button", { name: user })).toBeVisible();
    await expect(page.getByText(`${user} successfully saved`)).toBeVisible();
    const row = page.locator("tr", {
      has: page.getByText(user),
    });
    await expect(row.getByText("Standard")).toBeVisible();
    await expect(row.getByText(program1)).toBeVisible();
    await expect(row.getByText(program2)).not.toBeVisible();

    // Open side panel to edit user
    await page.getByRole("button", { name: user }).click();
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
      page.getByRole("heading", { name: "User management" }),
    ).toBeVisible();

    await expect(page.getByRole("cell", { name: newEmail })).toBeVisible();
    const newEmailRow = page
      .getByRole("row")
      .filter({ has: page.getByRole("cell", { name: newEmail }) });
    await expect(
      page.getByText(`${newEmail} successfully saved`),
    ).toBeVisible();
    await expect(newEmailRow.getByText(program1)).not.toBeVisible();
    await expect(newEmailRow.getByText(program2)).toBeVisible();

    // Delete the user
    await page.getByRole("button", { name: newEmail }).click();
    await expect(page.getByText("User information")).toBeVisible();

    await page.getByRole("button", { name: "Remove user" }).click();
    await expect(page.getByText(`Remove ${newEmail}`)).toBeVisible();

    await page.getByRole("button", { name: "Yes, remove user" }).click();
    await expect(
      page.getByText(`${newEmail} successfully removed`),
    ).toBeVisible();

    // Dismiss any toasts
    await page.keyboard.press("Escape");

    await page.goto("/ecr-viewer/admin/program");
  });

  test("admin: filter by user type or program area", async ({
    page,
    browserName,
  }) => {
    await logIn(page);

    // Create programs
    const program1 = await getRandomProgramArea(page);
    const program2 = await getRandomProgramArea(page, [program1]);

    // Create users
    await page.goto("/ecr-viewer/admin/user");
    await page
      .getByRole("combobox", { name: "Users per page" })
      .selectOption("100"); // Increase user table pagination for testing
    const userAdmin = await createRandomUser(browserName, page, "admin", []);
    const userStandard1 = await createRandomUser(
      browserName,
      page,
      "standard",
      [program1],
    );
    const userStandard2 = await createRandomUser(
      browserName,
      page,
      "standard",
      [program2],
    );
    const userStandard3 = await createRandomUser(
      browserName,
      page,
      "standard",
      [],
    );

    // filter by user type
    await page.getByLabel("Filter by user type").click();
    await expect(page.getByText("Filter by user type")).toBeVisible();
    await page.getByLabel(/^Admin\b/).dispatchEvent("click");
    await expect(
      page.getByRole("table").getByText("Standard"),
    ).not.toBeVisible();

    await page.getByLabel("Standard").dispatchEvent("click");
    await expect(page.getByRole("table").getByText("Admin")).not.toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByText("Filter by user type")).not.toBeVisible();

    await page.getByLabel("Reset Filters to Defaults").click();
    await expect(
      page.getByLabel("Reset Filters to Defaults"),
    ).not.toBeVisible();

    // filter by program area
    await page.getByLabel("Filter by program area").click();
    await expect(page.getByText("Filter by program area")).toBeVisible();
    await expect(page.getByText("All program areas (Admin)")).toBeVisible();
    await expect(page.getByText("No program areas (Standard)")).toBeVisible();

    const checkboxFilterProgram1 = page.getByLabel(`${program1}`, {
      exact: true,
    });
    await checkboxFilterProgram1.dispatchEvent("click");
    await expect(
      page.getByRole("table").getByText(userStandard1),
    ).not.toBeVisible();

    await checkboxFilterProgram1.dispatchEvent("click");
    const checkboxFilterProgram2 = page.getByLabel(`${program2}`, {
      exact: true,
    });
    await checkboxFilterProgram2.dispatchEvent("click");
    await expect(
      page.getByRole("table").getByText(userStandard2),
    ).not.toBeVisible();

    // Deselect all programs: no users should show up
    const buttonDeselectAll = page.getByText(/Deselect \d+ program areas?/);
    await buttonDeselectAll.dispatchEvent("click");
    await expect(
      page.getByText(
        "No users found. We couldn't find any users matching your filter criteria.",
      ),
    ).toBeVisible();

    // All program areas (Admins) should only show admin
    const checkboxAllProgramAreas = page.getByLabel(
      "All program areas (Admin)",
    );
    await checkboxAllProgramAreas.dispatchEvent("click");
    await expect(page.getByRole("table").getByText(userAdmin)).toBeVisible();
    await expect(
      page.getByRole("table").getByText("Standard"),
    ).not.toBeVisible();

    // No program areas (Standard) should show standard users with no program areas
    await checkboxAllProgramAreas.dispatchEvent("click");
    const checkboxNoProgramAreas = page.getByLabel(
      "No program areas (Standard)",
    );
    await checkboxNoProgramAreas.dispatchEvent("click");
    await expect(
      page.getByRole("table").getByText(userStandard3),
    ).toBeVisible();
    await expect(page.getByText(userAdmin)).not.toBeVisible();
    await expect(page.getByText(userStandard1)).not.toBeVisible();
    await expect(page.getByText(userStandard2)).not.toBeVisible();

    // Escape and reset
    await page.keyboard.press("Escape");
    await expect(page.getByText("Filter by program area")).not.toBeVisible();

    await page.getByLabel("Reset Filters to Defaults").click();
    await expect(
      page.getByLabel("Reset Filters to Defaults"),
    ).not.toBeVisible();

    await expect(page.getByText(userAdmin)).toBeVisible();
    await expect(page.getByText(userStandard1)).toBeVisible();
    await expect(page.getByText(userStandard2)).toBeVisible();
    await expect(page.getByText(userStandard3)).toBeVisible();
  });

  test("program admin: has restricted user creation permissions", async ({
    page,
    browserName,
  }) => {
    // Admin creates random program
    await logIn(page);
    const program1 = await getRandomProgramArea(page, ["COVID"]);

    // Log in as program admin.
    await page.context().clearCookies();
    await logIn(page, {
      userType: "PROGRAM_ADMIN",
    });

    await page.goto("/ecr-viewer/admin/user/create");
    expect(page.getByRole("heading", { name: "Create user" }));

    // Program admins can only create program-restricted users
    await expect(page.locator("#userType-admin")).not.toBeVisible();
    await expect(page.getByLabel("Program Admin")).toBeVisible();
    await expect(page.getByLabel("Standard")).toBeVisible();

    // Program admins can only create users for their program areas
    await expect(
      page.getByLabel(`Select ${program1}`, { exact: true }),
    ).not.toBeVisible();
    await expect(
      page.getByLabel(`Select COVID`, { exact: true }),
    ).toBeVisible();

    // Program admin successfully creates standard user
    const standardUser = await createRandomUser(browserName, page, "standard", [
      "COVID",
    ]);
    await page.waitForURL("/ecr-viewer/admin/user");
    await page
      .getByRole("combobox", { name: "Users per page" })
      .selectOption("50"); // Increase user table pagination for testing
    const standardRow = page
      .getByRole("row")
      .filter({ has: page.getByRole("cell", { name: standardUser }) });
    await expect(standardRow.getByText("Standard")).toBeVisible();
    await expect(standardRow.getByText("COVID")).toBeVisible();
  });

  test("program admin: sees permitted users, restricted filters, and complete user details", async ({
    page,
    browserName,
  }) => {
    await logIn(page);
    const otherProgram = await getRandomProgramArea(page, ["COVID"]);
    const sharedUser = await createRandomUser(browserName, page, "standard", [
      "COVID",
      otherProgram,
    ]);
    const restrictedUser = await createRandomUser(
      browserName,
      page,
      "standard",
      [otherProgram],
    );
    const unassignedUser = await createRandomUser(
      browserName,
      page,
      "standard",
      [],
    );

    await page.context().clearCookies();
    await logIn(page, { userType: "PROGRAM_ADMIN", useCookies: false });
    await page.goto("/ecr-viewer/admin/user");
    await page
      .getByRole("combobox", { name: "Users per page" })
      .selectOption("100");

    await expect(page.getByText(sharedUser)).toBeVisible();
    await expect(page.getByText(restrictedUser)).not.toBeVisible();
    await expect(page.getByText(unassignedUser)).not.toBeVisible();

    // Should not see Filter by Admin user type
    await page.getByLabel("Filter by user type").click();
    await expect(page.getByLabel(/^Admin\b/)).not.toBeVisible();
    await page.keyboard.press("Escape");

    // Should only be able to filter by accessible program areas
    await page.getByLabel("Filter by program area").click();
    await expect(page.getByText("All program areas (Admin)")).not.toBeVisible();
    await expect(
      page.getByText("No program areas (Standard)"),
    ).not.toBeVisible();
    const covidFilter = page.getByLabel("COVID", { exact: true });
    await covidFilter.dispatchEvent("click");
    await expect(page.getByText(sharedUser)).not.toBeVisible();
    await covidFilter.dispatchEvent("click");
    await page.keyboard.press("Escape");

    // Should see all program areas (& conditions) of user in their program area
    await page.getByRole("button", { name: sharedUser }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("COVID", { exact: true })).toBeVisible();
    await expect(dialog.getByText(otherProgram, { exact: true })).toBeVisible();
  });

  test("program admin: can only edit accessible program areas", async ({
    page,
    browserName,
  }) => {
    await logIn(page);
    const otherProgram = await getRandomProgramArea(page, ["COVID"]);
    const user = await createRandomUser(browserName, page, "standard", [
      "COVID",
      otherProgram,
    ]);

    await page.context().clearCookies();
    await logIn(page, { userType: "PROGRAM_ADMIN", useCookies: false });
    await page.goto("/ecr-viewer/admin/user");
    await page
      .getByRole("combobox", { name: "Users per page" })
      .selectOption("100");
    await page.getByRole("button", { name: user }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByText("Edit user").click();
    await page.waitForURL(/\/ecr-viewer\/admin\/user\/edit\?uuid=.*/);

    // axe struggles with the modal background, but all manual testing
    // points to contrast being fine
    await expect(
      page.getByRole("heading", { name: "Edit user" }),
    ).toBeVisible();
    const axeScanProgramAdminEditUser = await new AxeBuilder({
      page,
    }).analyze();
    expect(axeScanProgramAdminEditUser.violations).toEqual([]);

    // Program admin cannot modify user's email or user type
    await expect(page.getByLabel("Email")).toBeDisabled();
    await expect(page.locator('input[name="userType"]')).toHaveCount(2);
    for (const userType of await page.locator('input[name="userType"]').all()) {
      await expect(userType).toBeDisabled();
    }

    // Program admin should only be able to modify COVID
    await expect(
      page.getByLabel("Select COVID", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByLabel(`Select ${otherProgram}`, { exact: true }),
    ).not.toBeVisible();

    await page
      .getByLabel("Select COVID", { exact: true })
      .dispatchEvent("click");
    await page.getByRole("button", { name: "Save user" }).first().click();
    await page.waitForURL("/ecr-viewer/admin/user");

    // Standard user should only have other program area
    await page.context().clearCookies();
    await logIn(page);
    await page.goto("/ecr-viewer/admin/user");
    await page
      .getByRole("combobox", { name: "Users per page" })
      .selectOption("100");
    const row = page.getByRole("row").filter({
      has: page.getByRole("cell", { name: user }),
    });
    await expect(row.getByText(otherProgram)).toBeVisible();
    await expect(row.getByText("COVID", { exact: true })).not.toBeVisible();
  });

  test("program admin: cannot edit a user outside their program areas", async ({
    page,
    browserName,
  }) => {
    await logIn(page);
    const otherProgram = await getRandomProgramArea(page, ["COVID"]);
    const restrictedUser = await createRandomUser(
      browserName,
      page,
      "standard",
      [otherProgram],
    );

    await page.getByRole("button", { name: restrictedUser }).click();
    await page.getByRole("dialog").getByText("Edit user").click();
    await page.waitForURL(/\/ecr-viewer\/admin\/user\/edit\?uuid=.*/);
    const restrictedUserEditUrl = page.url();

    await page.context().clearCookies();
    await logIn(page, { userType: "PROGRAM_ADMIN", useCookies: false });
    const response = await page.goto(restrictedUserEditUrl);

    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { name: "Page not found" }),
    ).toBeVisible();
  });

  test("program admin: should not be able to delete a user", async ({
    page,
    browserName,
  }) => {
    await logIn(page);
    const user = await createRandomUser(browserName, page, "standard", [
      "COVID",
    ]);

    await page.context().clearCookies();
    await logIn(page, { userType: "PROGRAM_ADMIN", useCookies: false });
    await page.goto("/ecr-viewer/admin/user");
    await page
      .getByRole("combobox", { name: "Users per page" })
      .selectOption("100");

    await page.getByRole("button", { name: user }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("User information")).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Remove user" }),
    ).not.toBeVisible();
  });

  test("should not show to standard user", async ({ page }) => {
    await logIn(page, { userType: "STANDARD" });
    await page.goto("/ecr-viewer/admin/user");

    await expect(
      page.getByRole("heading", { name: "Page not found" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "User management" }),
    ).not.toBeVisible();
  });
});

const getRandomProgramArea = async (page: Page, notThese: string[] = []) => {
  await page.goto("/ecr-viewer/admin/program");
  const adminProgramTestProgram =
    /^Prog admin-program-(?:chromium|firefox|webkit)-\d+$/;

  // A fresh program is required when excluding programs. Reusing an existing
  // program can race with admin-program tests, which assign their fixtures to
  // the shared program-admin user.
  if (notThese.length === 0) {
    const rows = await page.getByRole("row").all();
    for (const row of rows) {
      const cell = row.getByRole("cell").first();
      const program = (await cell.allInnerTexts()).join(" ");
      // avoid program reuse and don't touch the programs from the `admin-program` tests
      // as those get deleted during testing (vs teardown)
      if (!!program && !adminProgramTestProgram.test(program)) {
        return program;
      }
    }
  }

  await page.getByText("Create program area").click();
  await page.waitForURL("/ecr-viewer/admin/program/create");

  // Wait for checkboxes to attach, count dynamically
  await expect(page.getByRole("checkbox").first()).toBeAttached();
  const count = await page.getByRole("checkbox").count();
  const index = Math.floor(Math.random() * count);

  const checkboxCond = await page.getByRole("checkbox").nth(index);
  await checkboxCond.scrollIntoViewIfNeeded();

  // Read the value BEFORE clicking it, avoiding any DOM-blocking modal issues
  const conditionName = await checkboxCond.inputValue();
  const programName = `Test Program ${conditionName}-${Math.floor(Math.random() * 10000)}`;

  await checkboxCond.dispatchEvent("click");

  // Conditionally handle the reassignment modal if we picked an assigned condition
  try {
    const yesButton = page.getByRole("button", { name: "Yes, add condition" });
    // Wait up to 1.5 seconds to see if the modal appears
    await yesButton.waitFor({ state: "visible", timeout: 1500 });
    await yesButton.click();
  } catch (e) {
    // If we reach here, it means the modal never appeared (we picked an unassigned condition).
    // This is perfectly fine, we just swallow the timeout error and move on!
  }

  await page.getByLabel("Program area name").fill(programName);
  await page.getByRole("button", { name: "Save program area" }).first().click();

  await page.waitForURL("/ecr-viewer/admin/program");

  return programName;
};

const createRandomUser = async (
  browserName: string,
  page: Page,
  userType: "admin" | "prog_admin" | "standard" = "standard",
  programAreas: string[],
) => {
  await page.goto("/ecr-viewer/admin/user");
  await expect(
    page.getByRole("heading", { name: "User management" }),
  ).toBeVisible();
  await page.getByText("Create user").click();
  await page.waitForURL("/ecr-viewer/admin/user/create");

  const random = Math.floor(Math.random() * 10000);
  const email = `${browserName}-${random}@test-user.com`;
  await page.getByLabel("Email").fill(email);

  if (userType === "admin") {
    const adminRadio = page.locator("#userType-admin");
    await adminRadio.dispatchEvent("click");
  }

  if (userType === "prog_admin" || userType === "standard") {
    const userTypeRadio = page.getByLabel(
      userType === "prog_admin" ? "Program Admin" : "Standard",
    );
    await userTypeRadio.scrollIntoViewIfNeeded();
    await userTypeRadio.dispatchEvent("click");

    for (const program of programAreas) {
      const checkbox = page.getByLabel(`Select ${program}`, {
        exact: true,
      });
      await checkbox.scrollIntoViewIfNeeded();
      await checkbox.dispatchEvent("click");
    }
  }

  await page.getByRole("button", { name: "Save user" }).first().click();
  await page.waitForURL("/ecr-viewer/admin/user");

  await expect(page.getByText(`${email} successfully saved`)).toBeVisible();

  return email;
};
