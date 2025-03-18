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
});
