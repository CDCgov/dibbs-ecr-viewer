// NOTE: this file assume it is running on a deployment with an un-set-up DB
import { test, expect } from "@playwright/test";

import { getToken, logIn } from "./utils";

const toForm = (obj: Record<string, string>) => {
  const form = new FormData();
  // for this spec, we always skip conditions to avoid requiring
  // orchestration service (not worth it at this time, this could change
  // down the road)
  form.append("skip_condition_update", "true");
  form.append("init_admin_email", process.env.AUTH_ADMIN_USER!);
  for (const [k, v] of Object.entries(obj)) {
    form.append(k, v);
  }
  return form;
};

// don't run if no database
test.describe("migrations", () => {
  test.skip(
    process.env.CONFIG_NAME.endsWith("INTEGRATED") &&
      !process.env.CONFIG_NAME.endsWith("NON_INTEGRATED"),
    "No migrations if no metadata db",
  );

  test("should follow whole flow through up and down", async ({
    page,
    request,
  }) => {
    await logIn(page, { expectedHeading: "eCR Viewer setup is incomplete" });

    const token = process.env.CONFIG_NAME.endsWith("_DUAL")
      ? process.env.DUMMY_NBS_JWT
      : await getToken(request);

    const headers = {
      Authorization: `Bearer ${token}`,
    };

    const noSecret = await request.post(`/ecr-viewer/api/migrate-db`, {
      headers,
    });
    expect(await noSecret.json()).toEqual(
      expect.objectContaining({
        message: "Validation error",
      }),
    );
    expect(noSecret.ok()).toBeFalsy();

    const wrongSecret = await request.post(`/ecr-viewer/api/migrate-db`, {
      form: toForm({ migration_secret: "nope" }),
      headers,
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
      headers,
    });
    expect(await up.json()).toEqual(
      expect.objectContaining({ message: "success" }),
    );
    expect(up.ok()).toBeTruthy();

    await page.goto("/ecr-viewer");
    await expect(
      page.getByText("eCR Viewer setup is incomplete"),
    ).not.toBeVisible();
    await expect(
      page.getByRole("heading", { name: "eCR Library" }),
    ).toBeVisible();

    const down = await request.post(`/ecr-viewer/api/migrate-db`, {
      form: toForm({ migration_secret: "test", direction: "down" }),
      headers,
    });
    expect(await down.json()).toEqual(
      expect.objectContaining({ message: "success" }),
    );
    expect(down.ok()).toBeTruthy();

    await page.goto("/ecr-viewer");
    await expect(
      page.getByText("eCR Viewer setup is incomplete"),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "eCR Library" }),
    ).not.toBeVisible();
  });
});
