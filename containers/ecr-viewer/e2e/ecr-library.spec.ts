import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe.skip("eCR Library page", () => {
  test("has title", async ({ page }) => {
    await page.goto("/ecr-viewer");

    await expect(page).toHaveTitle(/DIBBs eCR Viewer/);
  });

  test("should pass accessiblity", async ({ page }) => {
    await page.goto("/ecr-viewer");

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
test.describe.skip("eCR Library Filtering", () => {
  const totalNumOfConditions = "4";
  test("Set reportable condition filter to anthrax", async ({ page }) => {
    await page.goto("/ecr-viewer");
    await page.waitForURL("/ecr-viewer?columnId=date_created&direction=DESC");
    await expect(page.getByTestId("filter-tag")).toContainText(
      totalNumOfConditions,
    );

    await page.getByLabel("Filter by reportable condition").click();
    // Add delay since conditions rerenders shortly after opening
    await page.getByText("Deselect all").click({ delay: 200 });
    await page.getByRole("group").getByText("Anthrax (disorder)").click();
    await page.getByLabel("Apply Filter").click();
    await expect(page.getByText("Showing 1-1")).toBeVisible();
    expect((await page.locator("tbody > tr").allTextContents()).length).toEqual(
      1,
    );
  });

  test("Search should filter results ", async ({ page }) => {
    await page.goto("/ecr-viewer");
    await page.waitForURL("/ecr-viewer?columnId=date_created&direction=DESC");
    await expect(page.getByTestId("filter-tag")).toContainText(
      totalNumOfConditions,
    );

    await page.getByTestId("textInput").fill("Han");
    await page.getByTestId("form").getByTestId("button").click();

    await expect(page.getByText("Showing 1-1 of 1 eCRs")).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "Han Solo DOB: 02/07/2025" }),
    ).toBeVisible();
    expect((await page.locator("tbody > tr").allTextContents()).length).toEqual(
      1,
    );
  });

  test("Search and reportable condition should filter results", async ({
    page,
  }) => {
    await page.goto("/ecr-viewer");
    await page.waitForURL("/ecr-viewer?columnId=date_created&direction=DESC");
    await expect(page.getByTestId("filter-tag")).toContainText(
      totalNumOfConditions,
    );

    await page.getByTestId("textInput").click();
    await page.getByTestId("textInput").fill("Abel");
    await page.getByTestId("form").getByTestId("button").click();

    await expect(page.getByText("Showing 1-1 of 1 eCRs")).toBeVisible();

    await page.getByLabel("Filter by reportable condition").click();
    await page.getByText("Deselect all").click();
    await page.getByRole("group").getByText("Anthrax (disorder)").click();
    await page.getByLabel("Apply Filter").click();

    await expect(page.getByText("Showing 0-0 of 0 eCRs")).toBeVisible();
    expect((await page.locator("tbody > tr").allTextContents()).length).toEqual(
      0,
    );
  });

  // BUG: When selecting eCRs per page so quickly after load the table doesn't get updated
  test.skip("Set 100 results per page", async ({ page }) => {
    await page.goto("/ecr-viewer?columnId=date_created&direction=DESC");
    await page.waitForURL("/ecr-viewer?columnId=date_created&direction=DESC");
    await expect(page.getByTestId("filter-tag")).toContainText(
      totalNumOfConditions,
    );

    await page.getByText("Showing 1-25").waitFor();

    await page.getByTestId("Select").selectOption("100");

    await expect(page.getByLabel("Page 3")).not.toBeVisible();
    expect((await page.locator("tbody > tr").allTextContents()).length).toEqual(
      100,
    );
  });

  // BUG: Items per page does not get set when in query parameters
  test.skip("When visiting a direct url all query parameters should be applied", async ({
    page,
  }) => {
    await page.goto(
      "/ecr-viewer?columnId=date_created&direction=DESC&itemsPerPage=100&page=1&condition=Anthrax+%28disorder%29&search=Cutla",
    );
    await expect(page.getByTestId("textInput")).toHaveValue("Cutla");
    await expect(page.getByTestId("Select")).toHaveValue("100");
    await page.getByText("Showing 1-6 of 6 eCRs").click();
    await page.getByLabel("Filter by reportable condition").click();
    await expect(
      page.getByRole("group").getByText("Anthrax (disorder)"),
    ).toBeChecked();
    expect((await page.locator("tbody > tr").allTextContents()).length).toEqual(
      6,
    );
  });
});
