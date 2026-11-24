import { expect, Page } from "@playwright/test";

// Fixture creation must leave conditions owned by existing programs alone.
export const selectUnassignedCondition = async (page: Page) => {
  const unassignedRows = page
    .locator("div:has(> .usa-checkbox)")
    .filter({ hasNotText: /Condition in / });
  await expect(unassignedRows.first()).toBeAttached();

  const index = Math.floor(Math.random() * (await unassignedRows.count()));
  const checkbox = unassignedRows.nth(index).getByRole("checkbox");

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
};
