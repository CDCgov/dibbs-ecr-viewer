import { PlaywrightTestArgs, expect } from "@playwright/test";

/**
 * Helper to lot into via keycloak and go to the viewer page
 * @param props playwright test args
 * @param props.page page
 */
export const logInToKeycloak = async ({ page }: PlaywrightTestArgs) => {
  await page.goto("/ecr-viewer");
  await page.waitForURL("ecr-viewer/signin?callbackUrl=%2Fecr-viewer%2F");

  await page.getByRole("button").click();

  await page
    .getByRole("textbox", { name: "username" })
    .fill("ecr-viewer-admin");
  await page.getByRole("textbox", { name: "password" }).fill("pw");
  await page.getByRole("button", { name: "Sign in" }).click();

  expect(page.getByText("eCR Library"));
};
