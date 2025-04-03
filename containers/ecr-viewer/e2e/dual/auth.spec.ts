import { test, expect } from "@playwright/test";

import { logIn, nbsAuthParam } from "../utils";

test.describe("auth", () => {
  test.only("should require a login on main page", async ({ page }) => {
    await logIn(page);
  });

  test("should require a login on main page even if valid auth token provided", async ({
    page,
  }) => {
    await logIn(page, `/ecr-viewer?${nbsAuthParam}`);
  });

  test("should require a login on view-data page", async ({ page }) => {
    await logIn(
      page,
      "/ecr-viewer/view-data?id=db734647-fc99-424c-a864-7e3cda82e703",
      "Patient Name",
    );

    // via regular auth, should be able to navigate to library
    await expect(page.getByText("Back to eCR Library")).toBeVisible();
    await expect(page).toHaveURL(
      "http://localhost:3000/ecr-viewer/view-data?id=db734647-fc99-424c-a864-7e3cda82e703",
    );
  });

  test("should require a login on view-data page when invalid token provided", async ({
    page,
  }) => {
    await logIn(
      page,
      "/ecr-viewer/view-data?id=1234&auth=hi",
      "The eCR Viewer couldn't retrieve the associated eCR file",
    );
    await expect(page).toHaveURL(
      "http://localhost:3000/ecr-viewer/view-data?id=1234",
    );
  });

  test("should not require a login on view-data page when valid token provided", async ({
    page,
  }) => {
    await page.goto(
      `/ecr-viewer/view-data?id=db734647-fc99-424c-a864-7e3cda82e703&${nbsAuthParam}`,
    );
    await page.getByText("Patient Name").first().waitFor();

    // via nbs auth, cannot navigate to library
    await expect(page.getByText("Back to eCR Library")).not.toBeVisible();
    await expect(page).toHaveURL(
      "http://localhost:3000/ecr-viewer/view-data?id=db734647-fc99-424c-a864-7e3cda82e703",
    );
  });
});
