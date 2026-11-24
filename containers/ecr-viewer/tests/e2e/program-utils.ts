import { expect, Page } from "@playwright/test";

// Fixture creation must leave conditions owned by existing programs alone.
export const selectUnassignedCondition = async (page: Page) => {
  const checkboxes = page.getByRole("checkbox");
  await expect(checkboxes.first()).toBeAttached();

  for (const checkbox of await checkboxes.all()) {
    const conditionRow = checkbox.locator("../..");
    if ((await conditionRow.getByText(/^Condition in /).count()) > 0) {
      continue;
    }

    const conditionCode = await checkbox.inputValue();
    const conditionName = await checkbox
      .locator("..")
      .locator("p")
      .first()
      .innerText();

    await checkbox.scrollIntoViewIfNeeded();
    await checkbox.evaluate((element) => (element as HTMLInputElement).click());

    await expect(
      page
        .getByRole("dialog")
        .filter({ hasText: "Are you sure you want to add" }),
      "Fixture creation must not reassign a condition from another program",
    ).not.toBeVisible();
    await expect(checkbox).toBeChecked();

    return { conditionCode, conditionName };
  }

  throw new Error("Could not find an unassigned condition for a test program");
};
