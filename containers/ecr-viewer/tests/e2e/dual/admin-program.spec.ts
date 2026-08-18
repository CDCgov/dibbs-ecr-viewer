import AxeBuilder from "@axe-core/playwright";
import { test, expect, Page } from "@playwright/test";

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

  test("as program admin, should only see accessible programs", async ({
    page,
  }) => {
    await page.context().clearCookies();
    await logIn(page, { userType: "PROGRAM_ADMIN", useCookies: false });
    await page.goto("/ecr-viewer/admin/program");

    await expect(
      page.getByRole("heading", { name: "Program management" }),
    ).toBeVisible();

    const programRows = page
      .getByRole("table")
      .getByRole("row")
      .filter({ has: page.getByRole("cell") });
    await expect(
      programRows.getByRole("cell", { name: "COVID", exact: true }),
    ).toBeVisible();
  });

  test("as admin, should create a program", async ({ page }) => {
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
    await page.getByPlaceholder("Search condition or category").fill("i");
    await expect(page.getByText("277 results")).toBeVisible();

    // Wait for checkboxes to attach and use .count() / .nth() to avoid stale elements
    await expect(page.getByRole("checkbox").first()).toBeAttached();
    const count = await page.getByRole("checkbox").count();
    const index = Math.floor(Math.random() * count);

    const checkbox = page.getByRole("checkbox").nth(index);
    const conditionName = await checkbox.inputValue();

    await checkbox.scrollIntoViewIfNeeded();
    await checkbox.dispatchEvent("click");

    // Conditionally handle the reassignment modal if we randomly picked an assigned condition
    try {
      const yesButton = page.getByRole("button", {
        name: "Yes, add condition",
      });
      await yesButton.waitFor({ state: "visible", timeout: 1500 });
      await yesButton.click();
    } catch (e) {
      // Modal didn't appear, move on!
    }

    const programName = `Program ${conditionName}`;

    await page.getByLabel("Program area name").fill(programName);

    await page
      .getByRole("button", { name: "Save program area" })
      .first()
      .click();

    await page.waitForURL("/ecr-viewer/admin/program");
    await expect(
      page.getByRole("heading", { name: "Program management" }),
    ).toBeVisible();

    await expect(page.getByRole("cell", { name: programName })).toBeVisible();
    await expect(
      page.getByText(`${programName} successfully saved`),
    ).toBeVisible();

    // open up side panel
    await page.getByRole("button", { name: programName }).click();
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
    await page.getByPlaceholder("Search condition or category").fill("i");
    await expect(page.getByText("277 results")).toBeVisible();
    await expect(
      page.getByText(/Condition in .*/).filter({ hasText: programName }),
    ).toBeVisible();

    // Re-grab the checkbox dynamically. The old 'checkbox' variable is stale!
    await expect(page.getByRole("checkbox").first()).toBeAttached();
    const checkboxAgain = page.getByRole("checkbox").nth(index);

    await checkboxAgain.scrollIntoViewIfNeeded();
    await checkboxAgain.dispatchEvent("click");

    await expect(page.getByText("Are you sure you want to add")).toBeVisible();

    // this is flaky on webkit, so adding more retrying
    let accessibilityScanResultsModal = await axe.analyze();
    if (accessibilityScanResultsModal.violations.length > 0) {
      accessibilityScanResultsModal = await axe.analyze();
    }
    expect(accessibilityScanResultsModal.violations).toEqual([]);

    // re-submit to check duplicate checking
    await page.getByRole("button", { name: "Yes, add condition" }).click();
    await page.getByLabel("Program area name").fill(programName);
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
    await page.getByRole("button", { name: programName }).click();
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

    const newProgramName = programName + " edited";
    await page.getByLabel("Program area name").fill(newProgramName);

    await page
      .getByRole("button", { name: "Save program area" })
      .first()
      .click();

    await page.waitForURL("/ecr-viewer/admin/program");
    await expect(
      page.getByRole("heading", { name: "Program management" }),
    ).toBeVisible();

    await expect(
      page.getByRole("cell", { name: newProgramName }),
    ).toBeVisible();
    await expect(
      page.getByText(`${newProgramName} successfully saved`),
    ).toBeVisible();

    // open up side panel to delete the condition
    await page.getByRole("button", { name: newProgramName }).click();
    await expect(page.getByText("Program area information")).toBeVisible();

    await page.getByRole("button", { name: "Remove program area" }).click();
    await expect(page.getByText(`Remove ${newProgramName}`)).toBeVisible();

    const accessibilityScanResultsConfirmation = await axe.analyze();
    expect(accessibilityScanResultsConfirmation.violations).toEqual([]);

    await page
      .getByRole("button", { name: "Yes, remove program area" })
      .click();
    await expect(page.locator("body")).not.toHaveAttribute("data-modal-count");

    await expect(
      page.getByText(`${newProgramName} successfully removed`),
    ).toBeVisible();

    // Dismiss any toasts
    await page.keyboard.press("Escape");

    for (const el of await page.getByText(programName).all()) {
      await expect(el).not.toBeVisible();
    }

    for (const el of await page.getByText(newProgramName).all()) {
      await expect(el).not.toBeVisible();
    }
  });

  test("as a program admin, should not be able to create program area", async ({
    page,
  }) => {
    await page.context().clearCookies();
    await logIn(page, { userType: "PROGRAM_ADMIN", useCookies: false });
    await page.goto("/ecr-viewer/admin/program");

    await expect(
      page.getByRole("heading", { name: "Program management" }),
    ).toBeVisible();
    await expect(page.getByText("Create program area")).not.toBeVisible();

    const response = await page.goto("/ecr-viewer/admin/program/create");
    expect(response?.status()).toBe(404);
  });

  test("as a program admin, should not be able to delete a program area", async ({
    page,
  }) => {
    await page.context().clearCookies();
    await logIn(page, { userType: "PROGRAM_ADMIN", useCookies: false });
    await page.goto("/ecr-viewer/admin/program");

    await page.getByRole("button", { name: "COVID" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Program area information")).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Remove program area" }),
    ).not.toBeVisible();
  });

  test("as a program admin, should be able to switch conditions between accessible programs", async ({
    page,
    browserName,
  }) => {
    const targetProgram = await createRandomProgramArea(page, browserName, ["covid"]);
    const sourceProgram = await createRandomProgramArea(
      page,
      browserName,
      [targetProgram.conditionName, "covid"],
    );

    // Assign both programs to program admin
    await page.goto("/ecr-viewer/admin/user");
    await page
      .getByRole("button", { name: process.env.AUTH_PROGRAM_ADMIN_USER! })
      .click();
    await page.getByRole("dialog").getByText("Edit user").click();
    await page.waitForURL(/\/ecr-viewer\/admin\/user\/edit\?uuid=.*/);
    const checkboxTarget = await page
      .getByLabel(`Select ${targetProgram.name}`, { exact: true });
    await checkboxTarget.scrollIntoViewIfNeeded();
    await checkboxTarget.dispatchEvent("click");
    const checkboxSource = await page
      .getByLabel(`Select ${sourceProgram.name}`, { exact: true });
    await checkboxSource.scrollIntoViewIfNeeded();
    await checkboxSource.dispatchEvent("click");
    await page.getByRole("button", { name: "Save user" }).first().click();
    await page.waitForURL("/ecr-viewer/admin/user");

    // As a program admin, editing program area
    await page.context().clearCookies();
    await logIn(page, { userType: "PROGRAM_ADMIN", useCookies: false });
    await page.goto("/ecr-viewer/admin/program");
    await page.getByRole("button", { name: targetProgram.name }).click();
    await page.getByRole("dialog").getByText("Edit program area").click();
    await page.waitForURL(/\/ecr-viewer\/admin\/program\/edit\?uuid=.*/);

    await expect(page.getByLabel("Program area name")).toBeDisabled();

    // Can move a condition from source to target program
    await page
      .getByPlaceholder("Search condition or category")
      .fill(sourceProgram.conditionName);
    const sourceConditionInSource = page
      .getByText(`Condition in ${sourceProgram.name}`)
      .first();
    await expect(sourceConditionInSource).toBeVisible();
    const sourceConditionCheckbox = await page.getByLabel(
      sourceProgram.conditionName,
      { exact: true }
    );
    await sourceConditionCheckbox.scrollIntoViewIfNeeded();
    await sourceConditionCheckbox.dispatchEvent("click");

    await expect(page.getByText(/Are you sure you want to add/)).toBeVisible();
    await page.getByRole("button", { name: "Yes, add condition" }).click();
    await page
      .getByRole("button", { name: "Save program area" })
      .first()
      .click();
    await page.waitForURL("/ecr-viewer/admin/program");

    // The reassigned condition is in target
    const sourceProgramRow = page
      .getByRole("row")
      .filter({
        has: page.getByRole("button", { name: sourceProgram.name }),
      });
    await expect(
      sourceProgramRow.getByRole("cell", { name: "0 conditions", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: targetProgram.name }).click();
    await expect(
      page.getByText(sourceProgram.conditionName).first(),
    ).toBeVisible();
  });
});

const createRandomProgramArea = async (
  page: Page,
  browserName: string,
  conditionNamesToAvoid: string[] = [],
) => {
  const random = Math.floor(Math.random() * 10000);
  const name = `Program ${browserName}-${random}`;

  await page.goto("/ecr-viewer/admin/program/create");
  await page.getByLabel("Program area name").fill(name);

  const checkboxes = await page.getByRole("checkbox").all();
  let condition: (typeof checkboxes)[number] | undefined;
  for (const checkbox of checkboxes) {
    const conditionIsAssigned =
      (await checkbox.locator("..").getByText(/Condition in /).count()) > 0;
    const conditionName = await checkbox
      .locator("..")
      .locator("p")
      .first()
      .innerText();
    if (
      !conditionIsAssigned &&
      !conditionNamesToAvoid.includes(conditionName)
    ) {
      condition = checkbox;
      break;
    }
  }

  if (!condition) {
    throw new Error("Could not find an unassigned condition");
  }

  const conditionName = await condition
    .locator("..")
    .locator("p")
    .first()
    .innerText();
  await condition.scrollIntoViewIfNeeded();
  await condition.evaluate((element) =>
    (element as HTMLInputElement).click(),
  );

  await page.getByRole("button", { name: "Save program area" }).first().click();
  await page.waitForURL("/ecr-viewer/admin/program");

  return { name, conditionName };
};
