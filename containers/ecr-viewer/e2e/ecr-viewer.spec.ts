import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.skip("should not have any automatically detectable accessibility issues", async ({
  page,
}) => {
  // Set timetout to 2 minutes because the first call to local stack s3 can take ~1:30
  test.setTimeout(120_000);

  await page.goto(
    "/ecr-viewer/view-data?id=1.2.840.114350.1.13.297.3.7.8.688883.567479",
  );
  await page.getByText("Patient Name").first().waitFor();

  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});

test.skip("fully expanded should not have any automatically detectable accessibility issues", async ({
  page,
}) => {
  await page.goto(
    "/ecr-viewer/view-data?id=1.2.840.114350.1.13.297.3.7.8.688883.567479",
  );
  await page.getByRole("button", { name: "Expand all labs" }).click();

  const viewCommentButtons = await page.getByTestId("comment-button").all();
  for (let viewCommentButton of viewCommentButtons) {
    await viewCommentButton.scrollIntoViewIfNeeded();
    await viewCommentButton.click();
  }
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
