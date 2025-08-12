import { test as teardown, Page } from "@playwright/test";

import { logIn } from "../utils";
import { toSentenceCase } from "@/app/utils/format-utils";

const matcher: Record<string, RegExp> = {
  user: /.*-\d+@test-user.com/,
  "program area": /Test Program \d+/,
};

["user", "program area"].map((item) =>
  teardown(`delete test ${item}s`, async ({ page }) => {
    await logIn(page);

    await page.goto(`/ecr-viewer/admin/${item.split(" ")[0]}`);
    await page
      .getByLabel(`${toSentenceCase(item)}s per page`)
      .selectOption("100");
    const rows = await page.getByRole("row").all();
    const itemsToDelete: string[] = [];
    for (const row of rows) {
      const cell = row.getByRole("cell").first();
      const itemName = (await cell.allInnerTexts()).join(" ");
      if (!!itemName && itemName.match(matcher[item])) {
        itemsToDelete.push(itemName);
      }
    }

    for (const i of itemsToDelete) {
      await deleteItem(item, page, i);
    }
  }),
);

const deleteItem = async (itemType: string, page: Page, item: string) => {
  await page.getByRole("button", { name: item }).click();
  await page.getByRole("button", { name: `Remove ${itemType}` }).click();
  await page.getByRole("button", { name: `Yes, remove ${itemType}` }).click();
};
