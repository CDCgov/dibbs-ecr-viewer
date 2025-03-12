import { PlaywrightTestArgs, expect, request } from "@playwright/test";

/**
 * Helper to ensuer keycloak is ready to use
 */
export const waitForKeycloak = async () => {
  const context = await request.newContext();
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      const response = await context.get(
        process.env.AUTH_KEYCLOAK_ISSUER ??
          "http://localhost:8070/realms/master/",
      );
      if (response.status() === 200) {
        console.log(`Keycloak is ready`);
        break;
      }
    } catch (error) {
      console.log(`Waiting for Keycloak...`);
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
};

/**
 * Helper to lot into via keycloak and go to the viewer page
 * @param props playwright test args
 * @param props.page page
 */
export const logInToKeycloack = async ({ page }: PlaywrightTestArgs) => {
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
