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
      await expect(page.getByTestId("filter-tag")).toContainText(
        totalNumOfConditions,
      );

      await page.getByLabel("Filter by reportable condition").click();
      // Add delay since conditions rerenders shortly after opening
      await page.getByText("Deselect all").click({ delay: 200 });
      await page.getByRole("group").getByText("Zika Virus Disease").click();
      await page.getByLabel("Apply Filter").click();
      await expect(page.getByText("Showing 1-1")).toBeVisible();
      await expect(page.getByText("Zika Virus Disease")).toBeVisible();
      expect(
        (await page.locator("tbody > tr").allTextContents()).length,
      ).toEqual(1);

      // Make sure reset button works
      await page.getByLabel("reset").click();
      await expect(page.getByText("Showing 1-2")).toBeVisible();
      await expect(page.getByText("Zika Virus Disease")).toBeVisible();
      expect(
        (await page.locator("tbody > tr").allTextContents()).length,
      ).toEqual(2);
    });

    test("Search should filter results ", async ({ page }) => {
      await page.goto("/ecr-viewer");
      await expect(page.getByTestId("filter-tag")).toContainText(
        totalNumOfConditions,
      );

      await page.getByTestId("textInput").fill("Yoda");
      await page.getByTestId("form").getByTestId("button").click();

      await expect(page.getByText("Showing 1-1 of 1 eCRs")).toBeVisible();
      await expect(
        page.getByRole("gridcell", { name: "Minch YodaV1\nDOB: 01/01/1125" }),
      ).toBeVisible();
      expect(
        (await page.locator("tbody > tr").allTextContents()).length,
      ).toEqual(1);
    });

    test("Search and reportable condition should filter results", async ({
      page,
    }) => {
      await page.goto("/ecr-viewer");
      await expect(page.getByTestId("filter-tag")).toContainText(
        totalNumOfConditions,
      );

      await page.getByTestId("textInput").click();
      await page.getByTestId("textInput").fill("Yoda");
      await page.getByTestId("form").getByTestId("button").click();

      await expect(page.getByText("Showing 1-1 of 1 eCRs")).toBeVisible();

      await page.getByLabel("Filter by reportable condition").click();
      await page.getByText("Deselect all").click();
      await page.getByRole("group").getByText("COVID-19").click();
      await page.getByLabel("Apply Filter").click();

      await expect(page.getByText("Showing 0-0 of 0 eCRs")).toBeVisible();
      expect(
        (await page.locator("tbody > tr").allTextContents()).length,
      ).toEqual(1);
      await expect(page.getByText("No eCRs found.")).toBeVisible();
    });

    test("Set results per page", async ({ page }) => {
      await page.goto("/ecr-viewer?itemsPerPage=1");
      await expect(page.getByTestId("filter-tag")).toContainText(
        totalNumOfConditions,
      );

      await page.getByText("Showing 1-1").waitFor();

      await expect(page.getByLabel("Page 2")).toBeVisible();

      await page.getByTestId("Select").selectOption("100");

      await expect(page.getByLabel("Page 2")).not.toBeVisible();
      await expect(page.getByText("Showing 1-2")).toBeVisible();
      await expect(page.getByText("Yoda")).toBeVisible();
      expect(
        (await page.locator("tbody > tr").allTextContents()).length,
      ).toEqual(2);
    });

    test("When visiting a direct url all query parameters should be applied", async ({
      page,
    }) => {
      await page.goto(
        "/ecr-viewer?columnId=date_created&direction=DESC&itemsPerPage=72&page=1&condition=Zika+Virus+Disease&search=Yoda&dateRange=last-30-days",
      );
      await expect(page.getByTestId("textInput")).toHaveValue("Yoda");
      await expect(page.getByTestId("Select")).toHaveValue("72");
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
      await expect(page.getByTestId("filter-tag")).toContainText(
        totalNumOfConditions,
      );
      await expect(page.getByText("Showing 1-2 of 2 eCRs")).toBeVisible();

      await page.getByLabel(/Filter by Received Date/).click();
      // playwright doesn't believe the option is in the viewport even though it very much is
      await page.getByLabel("Custom date range").dispatchEvent("click");
      await page.getByTestId("start-date").fill("2024-01-01");
      await page.getByTestId("end-date").fill("2024-01-02");
      await page.getByLabel("Apply Filter").click();

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
      ["Received Date", "2"],
      ["Encounter Date", "3"],
    ]) {
      const headerButton = page.getByRole("button", {
        name: header,
        exact: true,
      });

      await headerButton.click();
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
      await expect(
        (await page.getByRole("row", { level: 2 }).all()).length,
      ).toEqual(2);

      // collapse it back down
      await page.getByRole("button", { name: "Hide Related eCRs" }).click();
      await expect(
        (await page.getByRole("row", { level: 2 }).all()).length,
      ).toEqual(0);
    });
  });
});
