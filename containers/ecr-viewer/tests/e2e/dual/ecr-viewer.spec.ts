// While this file is housed in the `dual` folder, it is copied over and also run on integrated e2e
// tests, so needs to always work with either IDP or NBS auth

import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";

import { logIn, nbsAuthParam } from "../utils";
import { getDb } from "@/app/data/metadataDb/database";
import { Core } from "@/app/data/metadataDb/types/core";

test.describe("viewer page", () => {
  if (process.env.CONFIG_NAME.endsWith("NON_INTEGRATED")) {
    test.beforeEach(({ page }) => logIn(page));
  }

  test("should not have any automatically detectable accessibility issues", async ({
    page,
  }) => {
    // Set timeout to 2 minutes because the first call to local stack s3 can take ~1:30
    test.setTimeout(120_000);

    await page.goto(
      `/ecr-viewer/view-data?id=db734647-fc99-424c-a864-7e3cda82e703&${nbsAuthParam}`,
    );
    await page.getByText("Patient Name").first().waitFor();

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("fully expanded should not have any automatically detectable accessibility issues", async ({
    page,
  }) => {
    await page.goto(
      `/ecr-viewer/view-data?id=db734647-fc99-424c-a864-7e3cda82e703&${nbsAuthParam}`,
    );
    await page.getByRole("button", { name: "Expand all labs" }).click();

    const viewCommentButtons = await page
      .getByRole("button", { name: "View comment" })
      .all();
    for (const viewCommentButton of viewCommentButtons) {
      await viewCommentButton.scrollIntoViewIfNeeded();
      await viewCommentButton.click();
    }
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test.describe("side nav", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(
        `/ecr-viewer/view-data?id=db734647-fc99-424c-a864-7e3cda82e703&${nbsAuthParam}`,
      );
      await page.getByText("Patient Name").first().waitFor();
    });

    test("clicking each link scrolls and highlights", async ({ page }) => {
      const nav = page.getByRole("navigation");
      await expect(nav).toBeVisible();

      // use a test id here to avoid a lot of special casing around the back to
      // library link, which may or may not exist based on the config
      const navLinksLoc = nav.getByTestId("sidenav-link");
      await expect(navLinksLoc).toHaveCount(21);
      const navLinks = await navLinksLoc.all();
      expect(navLinks.length).toBe(21); // sanity check

      // Make sure after collapsing and reopening, nav links still work
      await page.getByText("Collapse all sections").click();
      expect(page.getByText("Miscellaneous Notes")).not.toBeVisible();

      await page.getByText("Expand all sections").click();
      expect(page.getByText("Miscellaneous Notes")).toBeVisible();

      // make sure clicking each link scrolls the heading and highlights the corresponding
      // side nav item
      for (const navLink of navLinks) {
        await navLink.scrollIntoViewIfNeeded();
        await navLink.click();
        await expect(
          page.locator((await navLink.getAttribute("href")) as string),
        ).toBeInViewport();
        await expect(navLink).toHaveAttribute("class", "usa-current");
      }
    });

    test("scrolling through highlights links appropriately", async ({
      page,
    }) => {
      // some browsers struggle with the small scroll iteration here
      test.slow();

      const nav = page.getByRole("navigation");
      await expect(nav).toBeVisible();

      // use a test id here to avoid a lot of special casing around the back to
      // library link, which may or may not exist based on the config
      const navLinksLoc = nav.getByTestId("sidenav-link");
      await expect(navLinksLoc).toHaveCount(21);
      const numLinks = (await navLinksLoc.all()).length;
      let navIndex = 0;
      while (navIndex < numLinks) {
        await page.mouse.wheel(0, 12);

        const className = await navLinksLoc
          .nth(navIndex)
          ?.getAttribute("class");
        if (className === "usa-current") {
          navIndex += 1;
        }
      }

      expect(navIndex).toBe(numLinks);
    });
  });

  test("audit logging", async ({ page }) => {
    test.skip(
      ["AWS_INTEGRATED", "AZURE_INTEGRATED", "GCP_INTEGRATED"].includes(
        process.env.CONFIG_NAME,
      ),
      "Does not apply to integrated configurations.",
    );

    await page.goto(
      `/ecr-viewer/view-data?id=db734647-fc99-424c-a864-7e3cda82e703&${nbsAuthParam}`,
    );

    const logs = await getDb<Core>()
      .selectFrom("audit_log")
      .selectAll()
      .where("subject", "=", "ecr")
      .where("action", "=", "view")
      .execute();

    expect(
      logs.filter(
        ({ parameter_json }) =>
          JSON.parse(parameter_json).ecr_id ===
          "db734647-fc99-424c-a864-7e3cda82e703",
      ).length,
    ).toBeGreaterThan(0);
  });
});
