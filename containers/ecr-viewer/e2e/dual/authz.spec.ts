import { test, expect } from "@playwright/test";

import { logInToKeycloak } from "./utils";

test.describe("standarad user authorization", () => {
  test.beforeEach(
    async ({ page }) =>
      await logInToKeycloak({ page }, undefined, "ecr-viewer-standard"),
  );

  test("header", async ({ page }) => {
    await page.goto("/ecr-viewer");

    await expect(
      page.getByRole("heading", { name: "eCR library" }),
    ).toBeVisible();

    await expect(page.getByText("User management")).not.toBeVisible();
    await expect(page.getByText("Program management")).not.toBeVisible();
  });

  test("library", async ({ page }) => {
    await page.goto("/ecr-viewer");

    await expect(
      page.getByRole("heading", { name: "eCR library" }),
    ).toBeVisible();

    // Only COVID is filterable
    await expect(
      page.getByLabel("Filter by reportable condition"),
    ).toContainText("1");

    await page.getByLabel("Filter by reportable condition").click();
    await expect(page.getByLabel("COVID-19")).toBeVisible();
    // COVID and deselect all
    expect(await page.getByRole("checkbox").all()).toHaveLength(2);

    // TODO: add checks that correct eCRs are listed
  });

  test("can't see non-covid eCR", async ({ page }) => {
    await page.goto(
      "/ecr-viewer/view-data?id=db734647-fc99-424c-a864-7e3cda82e703",
    );

    await expect(page.getByText("Page not found")).toBeVisible();
  });

  test("can see covid eCR", async ({ page }) => {
    await page.goto(
      "/ecr-viewer/view-data?id=10c13861-86a8-4a9a-aec6-b615921178df",
    );

    await expect(
      page.getByRole("heading", { name: "eCR Summary" }),
    ).toBeVisible();
  });
});
