import { test, expect } from "@playwright/test";

// all integrated tests should start with 'integrated -' in order to match succesfully in npm run test:e2e:integrated
// test:e2e:integrated is only required since CONFIG_NAME needs to be changed. This can be removed when dual boot (nbs auth & idp auth) is supported
test.describe("integrated - nbs auth", () => {
  test("should redirect to not found when no token", async ({ page }) => {
    await page.goto("/ecr-viewer/view-data");

    await expect(
      page.getByText("The requested page could not be found"),
    ).toBeVisible();
  });
  test("should show unauthorized when invalid token is provided", async ({
    page,
  }) => {
    await page.goto("/ecr-viewer/view-data?auth=↑↑↓↓←→←→BAStart");

    await expect(page.getByText("Authentication Failed")).toBeVisible();
  });
  test("should grant access when a valid token is provided", async ({
    page,
  }) => {
    await page.goto(
      `/ecr-viewer/view-data?id=1234&auth=${process.env.DUMMY_NBS_JWT}`,
    );

    await expect(
      page.getByText(
        "The eCR Viewer couldn't retrieve the associated eCR file",
      ),
    ).toBeVisible();
    await expect(page).toHaveURL(
      "http://localhost:3000/ecr-viewer/view-data?id=1234",
    );
  });

  test("should not grant access to library when a valid token is provided", async ({
    page,
  }) => {
    await page.goto(`/ecr-viewer?auth=${process.env.DUMMY_NBS_JWT}`);

    await expect(page.getByText("Not Found")).toBeVisible();
    await expect(page).toHaveURL(
      "http://localhost:3000/ecr-viewer/error/notfound",
    );
  });

  test("should authenticate on api route if NBS auth token header provided", async ({
    request,
  }) => {
    const resp = await request.post(`/ecr-viewer/api/migrate-db`, {
      headers: {
        Authorization: `Bearer ${process.env.DUMMY_NBS_JWT}`,
      },
    });

    // This means we got past auth and failed on a bad migration call - this is good
    expect(await resp.json()).toEqual(
      expect.objectContaining({
        message: "Validation error",
      }),
    );
    expect(resp.ok()).toBeFalsy();
  });

  test("should not authenticate on api route if NBS auth token search param provided", async ({
    request,
  }) => {
    const resp = await request.post(
      `/ecr-viewer/api/migrate-db?auth=${process.env.DUMMY_NBS_JWT}`,
    );

    expect(await resp.json()).toEqual(
      expect.objectContaining({
        message: "API uses token authentication",
      }),
    );
    expect(resp.ok()).toBeFalsy();
  });

  test("should not authenticate on api route if bad auth token header provided", async ({
    request,
  }) => {
    const resp = await request.post(`/ecr-viewer/api/migrate-db`, {
      headers: { Authorization: "Bearer jibberish.token.please" },
    });
    expect(await resp.json()).toEqual(
      expect.objectContaining({
        message: "API uses token authentication",
      }),
    );
    expect(resp.ok()).toBeFalsy();
  });
});
