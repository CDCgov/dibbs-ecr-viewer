import { expect, test } from "@playwright/test";

import { logIn } from "./utils";

// This test is not really a test, but more of a seed script to add a
// standard user with access to the covid program area. It is run as part of
// the `convert-seed-data` npm script.

test("seed standard user and covid program", async ({ page }) => {
  test.skip(
    !process.env.METADATA_DATABASE_SCHEMA,
    "No seeding if no metadata db",
  );
  test.setTimeout(60000); // keycloak is slow
  await logIn(page);

  await page.goto("/ecr-viewer/admin/program");

  await expect(
    page.getByRole("heading", { name: "Program management" }),
  ).toBeVisible();

  if ((await page.getByText("COVID").all()).length === 0) {
    await page.goto("/ecr-viewer/admin/program/create");

    await expect(
      page.getByRole("heading", { name: "Create program area" }),
    ).toBeVisible();

    await page.getByLabel("Program area name").fill("COVID");

    await page.getByPlaceholder("Search conditions").fill("covid");
    await page.getByRole("button", { name: "Select all", exact: true }).click();

    await page
      .getByRole("button", { name: "Save program area" })
      .first()
      .click();

    await page.waitForURL("/ecr-viewer/admin/program");
  }

  await page.goto("/ecr-viewer/admin/user");

  await expect(
    page.getByRole("heading", { name: "User management" }),
  ).toBeVisible();

  if ((await page.getByText("ecr-viewer@standard.com").all()).length === 0) {
    await page.goto("/ecr-viewer/admin/user/create");
    await expect(
      page.getByRole("heading", { name: "Create user" }),
    ).toBeVisible();

    await page.getByLabel("Email").fill(process.env.AUTH_STANDARD_USER!);

    const adminRadio = page.getByLabel("Standard");
    await adminRadio.scrollIntoViewIfNeeded();
    await adminRadio.dispatchEvent("click");

    await page.getByRole("button", { name: "Select all", exact: true }).click();

    await page.getByRole("button", { name: "Save user" }).first().click();

    await page.waitForURL("/ecr-viewer/admin/user");
  }
});
