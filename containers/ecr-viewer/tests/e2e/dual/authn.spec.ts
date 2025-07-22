import { test, expect } from "@playwright/test";

import { getToken, logIn, nbsAuthParam } from "../utils";
import { getDb } from "@/app/data/metadataDb/database";
import { Core } from "@/app/data/metadataDb/types/core";
import { setupConfigurationVariables } from "@/instrumentation";

test.describe("auth", () => {
  test("should require a login on main page and allow sign out", async ({
    page,
  }) => {
    await logIn(page);
    const logInTime = Date.now();

    await page
      .getByRole("button", { name: "User Menu" })
      .click({ timeout: 5000 });

    try {
      await expect(
        page.getByRole("button", { name: "Sign Out" }),
      ).toBeVisible();
    } catch {
      // try again - sometimes the button doesn't seem to hydrate fast enough
      await page
        .getByRole("button", { name: "User Menu" })
        .click({ timeout: 5000 });
      await expect(
        page.getByRole("button", { name: "Sign Out" }),
      ).toBeVisible();
    }
    await page.getByRole("button", { name: "Sign Out" }).click();

    await page.waitForURL("ecr-viewer/signin?callbackUrl=%2Fecr-viewer%2F");
    const logOutTime = Date.now();
    await expect(page.getByText("You need to sign in")).toBeVisible();

    setupConfigurationVariables();
    const signinLogs = await getDb<Core>()
      .selectFrom("audit_log")
      .selectAll()
      .where("subject", "=", "user")
      .where("action", "=", "signin")
      .execute();
    const signoutLogs = await getDb<Core>()
      .selectFrom("audit_log")
      .selectAll()
      .where("subject", "=", "user")
      .where("action", "=", "signout")
      .execute();

    // Log in and logout for our user within 5 seconds of the recorded time
    expect(
      signinLogs.filter(
        ({ parameter_json, date }) =>
          JSON.parse(parameter_json).user.email ===
            process.env.AUTH_ADMIN_USER &&
          Math.abs(date.valueOf() - logInTime) < 5000,
      ).length,
    ).toBeGreaterThan(0);
    expect(
      signoutLogs.filter(
        ({ parameter_json, date }) =>
          JSON.parse(parameter_json).token.email ===
            process.env.AUTH_ADMIN_USER &&
          Math.abs(date.valueOf() - logOutTime) < 5000,
      ).length,
    ).toBeGreaterThan(0);

    // make sure the last log in time and name were updated
    const user = await getDb<Core>()
      .selectFrom("user")
      .selectAll()
      .where("email", "=", process.env.AUTH_ADMIN_USER!)
      .executeTakeFirstOrThrow();
    expect(user.date_of_last_login).not.toBeNull();
    expect(
      Math.abs(user.date_of_last_login!.valueOf() - logInTime),
    ).toBeLessThan(5000);
    expect(user.name).not.toBeNull();
  });

  test("should require a login on main page even if valid auth token provided", async ({
    page,
  }) => {
    test.skip(
      process.env.CONFIG_NAME.endsWith("_NON_INTEGRATED"),
      "Only applies to dual",
    );
    await logIn(page, { url: `/ecr-viewer?${nbsAuthParam}` });
  });

  test("should require a login on view-data page", async ({ page }) => {
    await logIn(page, {
      url: "/ecr-viewer/view-data?id=db734647-fc99-424c-a864-7e3cda82e703",
      expectedHeading: "Facility Details",
    });

    // via regular auth, should be able to navigate to library
    await expect(page.getByText("Back to eCR Library")).toBeVisible();
    await expect(page).toHaveURL(
      "http://localhost:3000/ecr-viewer/view-data?id=db734647-fc99-424c-a864-7e3cda82e703",
    );
  });

  test("should require a login on view-data page when invalid token provided", async ({
    page,
  }) => {
    test.skip(
      process.env.CONFIG_NAME.endsWith("_NON_INTEGRATED"),
      "Only applies to dual",
    );
    await logIn(page, {
      url: "/ecr-viewer/view-data?id=1234&auth=hi",
      expectedHeading: "eCR retrieval failed",
    });
    await expect(page).toHaveURL(
      "http://localhost:3000/ecr-viewer/view-data?id=1234",
    );
  });

  test("should not require a login on view-data page when valid token provided", async ({
    page,
  }) => {
    test.skip(
      process.env.CONFIG_NAME.endsWith("_NON_INTEGRATED"),
      "Only applies to dual",
    );
    await page.goto(
      `/ecr-viewer/view-data?id=db734647-fc99-424c-a864-7e3cda82e703&${nbsAuthParam}`,
    );
    await page.getByText("Patient Name").first().waitFor();

    // via nbs auth, cannot navigate to library or sign out
    await expect(page.getByText("Back to eCR Library")).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign Out" }),
    ).not.toBeVisible();
    await expect(page).toHaveURL(
      "http://localhost:3000/ecr-viewer/view-data?id=db734647-fc99-424c-a864-7e3cda82e703",
    );
  });

  test("should authenticate on api route if NBS auth token header provided", async ({
    request,
  }) => {
    test.skip(
      !process.env.CONFIG_NAME.endsWith("DUAL"),
      "NBS auth only works in dual mode",
    );

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
    const token = await getToken(request);
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
