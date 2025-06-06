import { test, expect } from "@playwright/test";

import { getKeycloakToken } from "./utils";

test.describe("keycloak", () => {
  test("should require a login on main page and can log out", async ({
    page,
  }) => {
    await page.goto("/ecr-viewer");
    await page.waitForURL("ecr-viewer/signin?callbackUrl=%2Fecr-viewer%2F");

    await page.getByRole("button").click();

    await page
      .getByRole("textbox", { name: "username" })
      .fill("ecr-viewer-admin");
    await page.getByRole("textbox", { name: "password" }).fill("pw");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole('heading', { name: "eCR Library" })).toBeVisible();

    await page.getByRole("button", {name: "User Menu"}).click({ timeout: 5000 });

    await expect(page.getByRole("button", {name: "Sign Out"})).toBeVisible();
    await page.getByRole("button", { name: "Sign Out" }).click();

    await page.waitForURL("ecr-viewer/signin?callbackUrl=%2Fecr-viewer%2F");
    await expect(page.getByText("You need to sign in")).toBeVisible();
  });

  test("should require a login on main page even if valid auth token provided", async ({
    page,
  }) => {
    await page.goto(`/ecr-viewer?auth=${process.env.DUMMY_NBS_JWT}`);
    await page.waitForURL("ecr-viewer/signin?callbackUrl=%2Fecr-viewer%2F");

    await page.getByRole("button").click();

    await page
      .getByRole("textbox", { name: "username" })
      .fill("ecr-viewer-admin");
    await page.getByRole("textbox", { name: "password" }).fill("pw");
    await page.getByRole("button", { name: "Sign in" }).click();

    expect(page.getByText("eCR Library"));
  });

  test("should require a login on view-data page", async ({ page }) => {
    await page.goto(
      "/ecr-viewer/view-data?id=db734647-fc99-424c-a864-7e3cda82e703",
    );
    await page.waitForURL(
      "ecr-viewer/signin?callbackUrl=%2Fecr-viewer%2Fview-data%3Fid%3Ddb734647-fc99-424c-a864-7e3cda82e703",
    );

    await page.getByRole("button").click();

    await page
      .getByRole("textbox", { name: "username" })
      .fill("ecr-viewer-admin");
    await page.getByRole("textbox", { name: "password" }).fill("pw");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Patient Name")).toHaveCount(2);

    // via regular auth, should be able to navigate to library
    await expect(page.getByText("Back to eCR Library")).toBeVisible();
    await expect(page).toHaveURL(
      "http://localhost:3000/ecr-viewer/view-data?id=db734647-fc99-424c-a864-7e3cda82e703",
    );
  });
  test("should require a login on view-data page when invalid token provided", async ({
    page,
  }) => {
    await page.goto("/ecr-viewer/view-data?id=1234&auth=hi");
    await page.waitForURL(
      "ecr-viewer/signin?callbackUrl=%2Fecr-viewer%2Fview-data%3Fid%3D1234",
    );

    await page.getByRole("button").click();

    await page
      .getByRole("textbox", { name: "username" })
      .fill("ecr-viewer-admin");
    await page.getByRole("textbox", { name: "password" }).fill("pw");
    await page.getByRole("button", { name: "Sign in" }).click();

    expect(
      page.getByText(
        "The eCR Viewer couldn't retrieve the associated eCR file",
      ),
    );
    await expect(page).toHaveURL(
      "http://localhost:3000/ecr-viewer/view-data?id=1234",
    );
  });

  test("should not require a login on view-data page when valid token provided", async ({
    page,
  }) => {
    await page.goto(
      `/ecr-viewer/view-data?id=db734647-fc99-424c-a864-7e3cda82e703&auth=${process.env.DUMMY_NBS_JWT}`,
    );
    await page.getByText("Patient Name").first().waitFor();

    // via nbs auth, cannot navigate to library or sign out
    await expect(page.getByText("Back to eCR Library")).not.toBeVisible();
    await expect(page.getByText("Sign Out")).not.toBeVisible();
    await expect(page).toHaveURL(
      "http://localhost:3000/ecr-viewer/view-data?id=db734647-fc99-424c-a864-7e3cda82e703",
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

  test("should authenticate on api route if IDP auth token header provided", async ({
    request,
  }) => {
    const token = await getKeycloakToken(request);
    const resp = await request.post(`/ecr-viewer/api/migrate-db`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // This means we got past auth and failed on a bad migration call - this is good
    expect(await resp.json()).toEqual(
      expect.objectContaining({
        message: "Validation error",
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
