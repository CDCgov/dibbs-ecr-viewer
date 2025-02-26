import { test, expect } from "@playwright/test";

test.describe("keycloak", () => {
  test("should require a login on main page", async ({ page }) => {
    await page.goto("/ecr-viewer");
    await page.waitForURL(
      "ecr-viewer/api/auth/signin?callbackUrl=%2Fecr-viewer%2F",
    );

    await page.getByRole("button").click();

    await page
      .getByRole("textbox", { name: "username" })
      .fill("ecr-viewer-admin");
    await page.getByRole("textbox", { name: "password" }).fill("pw");
    await page.getByRole("button", { name: "Sign in" }).click();

    expect(page.getByText("eCR Library"));
  });
  test("should require a login on view-data page", async ({ page }) => {
    await page.goto("/ecr-viewer/view-data?id=1234");
    await page.waitForURL(
      "ecr-viewer/api/auth/signin?callbackUrl=%2Fecr-viewer%2Fview-data%3Fid%3D1234",
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
});
