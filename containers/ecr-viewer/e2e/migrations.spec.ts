// NOTE: this file assume it is running on a deployment with an un-set-up DB
import { test, expect } from "@playwright/test";

import { logIn } from "./utils";

const toForm = (obj: Record<string, string>) => {
  const form = new FormData();
  // for this spec, we always skip conditions to avoid requiring
  // orchestration service (not worth it at this time, this could change
  // down the road)
  form.append("skip_condition_update", "true");
  for (const [k, v] of Object.entries(obj)) {
    form.append(k, v);
  }
  return form;
};

test.describe("migrations", () => {
  test.beforeEach(({ page }) => logIn(page));

  test("should follow whole flow through up and down", async ({
    page,
    request,
  }) => {
    await page.goto("/ecr-viewer");

    await expect(
      page.getByText("eCR Viewer setup is incomplete"),
    ).toBeVisible();
    await expect(page.getByText("eCR Library")).not.toBeVisible();

    const noSecret = await request.post(`/ecr-viewer/api/migrate-db`);
    expect(await noSecret.json()).toEqual(
      expect.objectContaining({
        message: "Validation error",
      }),
    );
    expect(noSecret.ok()).toBeFalsy();

    const wrongSecret = await request.post(`/ecr-viewer/api/migrate-db`, {
      form: toForm({ migration_secret: "nope" }),
    });
    expect(await wrongSecret.json()).toEqual(
      expect.objectContaining({
        message:
          "Request did not have expected migration secret. See server logs for expected value",
      }),
    );
    expect(wrongSecret.ok()).toBeFalsy();

    const up = await request.post(`/ecr-viewer/api/migrate-db`, {
      form: toForm({ migration_secret: "test" }),
    });
    expect(await up.json()).toEqual(
      expect.objectContaining({ message: "success" }),
    );
    expect(up.ok()).toBeTruthy();

    await page.goto("/ecr-viewer");
    await expect(
      page.getByText("eCR Viewer setup is incomplete"),
    ).not.toBeVisible();
    await expect(page.getByText("eCR Library")).toBeVisible();

    const down = await request.post(`/ecr-viewer/api/migrate-db`, {
      form: toForm({ migration_secret: "test", direction: "down" }),
    });
    expect(await down.json()).toEqual(
      expect.objectContaining({ message: "success" }),
    );
    expect(down.ok()).toBeTruthy();

    await page.goto("/ecr-viewer");
    await expect(
      page.getByText("eCR Viewer setup is incomplete"),
    ).toBeVisible();
    await expect(page.getByText("eCR Library")).not.toBeVisible();
  });
});
