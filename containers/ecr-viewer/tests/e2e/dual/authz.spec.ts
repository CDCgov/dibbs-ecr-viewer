import { test, expect } from "@playwright/test";

import { logIn } from "../utils";

test.describe("standard user authorization", () => {
  test.beforeEach(
    async ({ page }) => await logIn(page, { userType: "STANDARD" }),
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
    // COVID, no conditions reported and deselect all
    expect(await page.getByRole("checkbox").all()).toHaveLength(2);

    // Only COVID eCR are listed
    const rows = await page.getByRole("row").all();
    expect(rows).toHaveLength(3); // header + two eCR
    for (const row of rows) {
      if ((await row.getByRole("columnheader").count()) > 0) continue;

      expect(await row.getByText("COVID-19").count()).toBeGreaterThan(0);
    }

    await expect(page.getByText("Showing 1-2 of 2 eCRs")).toBeVisible();
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
