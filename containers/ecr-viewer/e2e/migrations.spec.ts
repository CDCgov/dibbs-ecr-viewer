// NOTE: this file assume it is running on a deployment with an un-set-up DB
import { test, expect } from "@playwright/test";

import { logInToKeycloak } from "./dual/utils";

test.describe("migrations", () => {
  test.beforeEach(logInToKeycloak);

  test("should follow whole flow through up and down", async ({
    page,
    request,
  }) => {
    await page.goto("/ecr-viewer");

    await expect(
      page.getByText("eCR Viewer setup is incomplete"),
    ).toBeVisible();
    await expect(page.getByText("eCR Library")).not.toBeVisible();

    const noConfirm = await request.post(`/ecr-viewer/api/migrate-db`);
    expect(noConfirm.ok()).toBeFalsy();
    expect(await noConfirm.json()).toEqual(
      expect.objectContaining({
        message: "Request did not have confirm=yes param, rejecting request",
      }),
    );

    const confirm = await request.post(
      `/ecr-viewer/api/migrate-db?confirm=yes`,
    );
    expect(confirm.ok()).toBeTruthy();
    expect(await confirm.json()).toEqual(
      expect.objectContaining({ message: "success" }),
    );

    await page.goto("/ecr-viewer");
    await expect(
      page.getByText("eCR Viewer setup is incomplete"),
    ).not.toBeVisible();
    await expect(page.getByText("eCR Library")).toBeVisible();

    const down = await request.post(
      `/ecr-viewer/api/migrate-db?confirm=yes&direction=down`,
    );
    expect(down.ok()).toBeTruthy();
    expect(await down.json()).toEqual(
      expect.objectContaining({ message: "success" }),
    );

    await page.goto("/ecr-viewer");
    await expect(
      page.getByText("eCR Viewer setup is incomplete"),
    ).toBeVisible();
    await expect(page.getByText("eCR Library")).not.toBeVisible();
  });
});
