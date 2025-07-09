import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";

import { logInToKeycloak } from "./utils";

test.describe("ecr library page", () => {
  test.beforeEach(logInToKeycloak);

  test.describe("eCR Library page", () => {
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

  test.describe("eCR Library Filtering", () => {
    const totalNumOfConditions = "2";
    test("Set reportable condition filter to zika", async ({ page }) => {
      await page.goto("/ecr-viewer");
      await expect(
        page.getByLabel("Filter by reportable condition"),
      ).toContainText(totalNumOfConditions);

      await page.getByLabel("Filter by reportable condition").click();
      // Add delay since conditions rerenders shortly after opening
      await page.getByText("Deselect all").click({ delay: 200 });
      await page.getByRole("group").getByText("Zika Virus Disease").click();
      await page.getByLabel("Apply filter").click();
      await expect(page.getByText("Showing 1-1")).toBeVisible();
      await expect(page.getByText("Zika Virus Disease")).toBeVisible();
      await expect(
        page.getByText("Rule used in reportability determination"),
      ).toBeVisible();
      expect(
        (await page.locator("tbody > tr").allTextContents()).length,
      ).toEqual(1);

      // Make sure reset button works
      await page.getByLabel("reset").click();
      await expect(page.getByText("Showing 1-3")).toBeVisible();
      await expect(page.getByText("Zika Virus Disease")).toBeVisible();
      expect(
        (await page.locator("tbody > tr").allTextContents()).length,
      ).toEqual(3);
    });

    test("Search should filter results ", async ({ page }) => {
      await page.goto("/ecr-viewer");
      await expect(
        page.getByLabel("Filter by reportable condition"),
      ).toContainText(totalNumOfConditions);

      await page.getByRole("searchbox").fill("Yoda");
      await page.getByRole("button", { name: "search" }).click();

      await expect(page.getByText("Showing 1-1 of 1 eCRs")).toBeVisible();
      await expect(
        page.getByRole("gridcell", { name: "Minch YodaV1\nDOB: 01/01/1125" }),
      ).toBeVisible();
      expect(
        (await page.locator("tbody > tr").allTextContents()).length,
      ).toEqual(1);
    });

    test("Clearing search box text should clear search and show all eCRs", async ({
      page,
    }) => {
      await page.goto("/ecr-viewer");
      await expect(
        page.getByLabel("Filter by reportable condition"),
      ).toContainText(totalNumOfConditions);

      const searchBox = page.getByRole("searchbox");
      await searchBox.fill("Yoda");
      await page.getByRole("button", { name: "search" }).click();

      await expect(page.getByText("Showing 1-1 of 1 eCRs")).toBeVisible();
      await expect(
        page.getByRole("gridcell", { name: "Minch YodaV1\nDOB: 01/01/1125" }),
      ).toBeVisible();
      expect(
        (await page.locator("tbody > tr").allTextContents()).length,
      ).toEqual(1);

      // This is a workaround to simulate the effect of pressing ESC on the search box which clears it to empty string.
      // Playwright's functions for simulating key presses did not work for this test for some reason
      await searchBox.fill(""); // Clear the input

      // Verify all eCRs are visible again
      await expect(page.getByText("Showing 1-3 of 3 eCRs")).toBeVisible();
      expect(
        (await page.locator("tbody > tr").allTextContents()).length,
      ).toEqual(3);
    });

    test("Search and reportable condition should filter results", async ({
      page,
    }) => {
      await page.goto("/ecr-viewer");
      await expect(
        page.getByLabel("Filter by reportable condition"),
      ).toContainText(totalNumOfConditions);

      await page.getByRole("searchbox").click();
      await page.getByRole("searchbox").fill("Yoda");
      await page.getByRole("button", { name: "search" }).click();

      await expect(page.getByText("Showing 1-1 of 1 eCRs")).toBeVisible();

      await page.getByLabel("Filter by reportable condition").click();
      await page.getByText("Deselect all").click();
      await page.getByRole("group").getByText("COVID-19").click();
      await page.getByLabel("Apply filter").click();

      await expect(page.getByText("Showing 0-0 of 0 eCRs")).toBeVisible();
      expect(
        (await page.locator("tbody > tr").allTextContents()).length,
      ).toEqual(1);
      await expect(page.getByText("No eCRs found.")).toBeVisible();
    });

    test("Set results per page", async ({ page }) => {
      await page.goto("/ecr-viewer?itemsPerPage=1");
      await expect(
        page.getByLabel("Filter by reportable condition"),
      ).toContainText(totalNumOfConditions);

      await page.getByText("Showing 1-1").waitFor();

      await expect(page.getByLabel("Page 2")).toBeVisible();

      await page.getByLabel("eCRs per page").selectOption("100");

      await expect(page.getByLabel("Page 2")).not.toBeVisible();
      await expect(page.getByText("Showing 1-3")).toBeVisible();
      await expect(page.getByText("Yoda")).toBeVisible();
      expect(
        (await page.locator("tbody > tr").allTextContents()).length,
      ).toEqual(3);
    });

    test("When visiting a direct url all query parameters should be applied", async ({
      page,
    }) => {
      await page.goto(
        "/ecr-viewer?columnId=date_created&direction=DESC&itemsPerPage=72&page=1&condition=Zika+Virus+Disease&search=Yoda&dateRange=last-30-days",
      );
      await expect(page.getByRole("searchbox")).toHaveValue("Yoda");
      await expect(page.getByLabel("eCRs per page")).toHaveValue("72");
      await page.getByText("Showing 1-1 of 1 eCRs").click();
      await page.getByLabel("Filter by reportable condition").click();
      await expect(
        page.getByRole("group").getByText("Zika Virus Disease"),
      ).toBeChecked();
      await expect(
        page.getByRole("group").getByText("COVID-19"),
      ).not.toBeChecked();
      expect(
        (await page.locator("tbody > tr").allTextContents()).length,
      ).toEqual(1);
      await expect(page.getByLabel("Last 30 Days")).toBeVisible();
    });

    test("when selecting an old date range, eCRs should be filtered out", async ({
      page,
    }) => {
      await page.goto("/ecr-viewer");
      await expect(
        page.getByLabel("Filter by reportable condition"),
      ).toContainText(totalNumOfConditions);
      await expect(page.getByText("Showing 1-3 of 3 eCRs")).toBeVisible();

      await page.getByLabel(/Filter by received date/).click();
      // playwright doesn't believe the option is in the viewport even though it very much is
      await page.getByLabel("Custom date range").dispatchEvent("click");
      await page.getByLabel("Start date").fill("2024-01-01");
      await page.getByLabel("End date").fill("2024-01-02");
      await page.getByLabel("Apply filter").click();

      await page.waitForURL(
        "/ecr-viewer?dateRange=custom&dates=2024-01-01%7C2024-01-02",
      );

      await expect(page.getByText("Showing 0-0 of 0 eCRs")).toBeVisible();
    });
  });

  test("eCR sorting", async ({ page }) => {
    await page.goto("/ecr-viewer");

    for (const [header, colIndex] of [
      ["Patient", "1"],
      ["Received date", "2"],
      ["Encounter date", "3"],
    ]) {
      const headerButton = page.getByRole("button", {
        name: header,
        exact: true,
      });

      await headerButton.click();
      // No role/label based selector available here, using test ID
      await expect(page.getByTestId("loading-table")).toBeVisible();
      await expect(page.getByText("Yoda")).toBeVisible();
      await expect(
        page.getByRole("columnheader", { name: header }),
      ).toHaveAttribute("aria-sort", "ascending");
      const ascContents = await Promise.all(
        (await page.locator(`tr > td:nth-child(${colIndex})`).all()).map((td) =>
          td.innerText(),
        ),
      );

      await headerButton.click();
      // No role/label based selector available here, using test ID
      await expect(page.getByTestId("loading-table")).toBeVisible();
      await expect(page.getByText("Yoda")).toBeVisible();
      await expect(
        page.getByRole("columnheader", { name: header }),
      ).toHaveAttribute("aria-sort", "descending");
      const descContents = await Promise.all(
        (await page.locator(`tr > td:nth-child(${colIndex})`).all()).map((td) =>
          td.innerText(),
        ),
      );

      ascContents.forEach((ascContent, i) => {
        expect(ascContent).toBe(descContents.at(-1 * (i + 1)));
      });
    }
  });

  test.describe("eCR grouping", () => {
    test("expanding group", async ({ page }) => {
      await page.goto("/ecr-viewer");
      await expect(
        page.getByRole("button", { name: "View Related eCRs" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "View Related eCRs" }).click();
      expect((await page.getByRole("row", { level: 2 }).all()).length).toEqual(
        2,
      );

      // collapse it back down
      await page.getByRole("button", { name: "Hide Related eCRs" }).click();
      expect((await page.getByRole("row", { level: 2 }).all()).length).toEqual(
        0,
      );
    });
  });
});
