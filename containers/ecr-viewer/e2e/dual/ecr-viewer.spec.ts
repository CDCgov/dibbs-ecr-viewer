import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";

import { logInToKeycloak } from "./utils";

test.describe("viewer page", () => {
  test.beforeEach(logInToKeycloak);

  test("should not have any automatically detectable accessibility issues", async ({
    page,
  }) => {
    // Set timetout to 2 minutes because the first call to local stack s3 can take ~1:30
    test.setTimeout(120_000);

    await page.goto(
      "/ecr-viewer/view-data?id=db734647-fc99-424c-a864-7e3cda82e703",
    );
    await page.getByText("Patient Name").first().waitFor();

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  // TODO: we need seed data with structured labs to get this running again
  test.skip("fully expanded should not have any automatically detectable accessibility issues", async ({
    page,
  }) => {
    await page.goto(
      "/ecr-viewer/view-data?id=db734647-fc99-424c-a864-7e3cda82e703",
    );
    await page.getByRole("button", { name: "Expand all labs" }).click();

    const viewCommentButtons = await page.getByTestId("comment-button").all();
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
        "/ecr-viewer/view-data?id=db734647-fc99-424c-a864-7e3cda82e703",
      );
      await page.getByText("Patient Name").first().waitFor();
    });

    test("clicking each link scrolls and higlighlights", async ({ page }) => {
      const nav = page.getByRole("navigation");
      await expect(nav).toBeVisible();

      const navLinks = await nav.getByRole("link").all();
      expect(navLinks.length).toBe(22);

      // Make sure after collapsing and reopening, nav links still work
      await page.getByText("Collapse all sections").click();
      expect(page.getByText("Miscellaneous Notes")).not.toBeVisible();

      await page.getByText("Expand all sections").click();
      expect(page.getByText("Miscellaneous Notes")).toBeVisible();

      // make sure clicking each link scrolls the heading and highlights the corresponding
      // side nav item
      for (const navLink of navLinks) {
        const linkText = await navLink.innerText();
        if (linkText === "Back to eCR Library") continue;
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
      const nav = page.getByRole("navigation");
      await expect(nav).toBeVisible();

      const navLinks = await nav.getByRole("link");
      const numLinks = (await navLinks.all()).length;
      let navIndex = 1; // skip "back to library" link
      while (navIndex < numLinks) {
        await page.mouse.wheel(0, 10);

        const className = await navLinks.nth(navIndex)?.getAttribute("class");
        if (className === "usa-current") {
          navIndex += 1;
        }
      }

      expect(navIndex).toBe(numLinks);
    });
  });
});
