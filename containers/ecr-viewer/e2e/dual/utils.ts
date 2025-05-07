import {
  APIRequestContext,
  PlaywrightTestArgs,
  expect,
} from "@playwright/test";

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

/**
 * Get an auth token from keycloak
 * @param request api request context from test
 * @returns token
 */
export const getKeycloakToken = async (request: APIRequestContext) => {
  const form = new FormData();
  form.append("client_id", process.env.AUTH_CLIENT_ID!);
  form.append("client_secret", process.env.AUTH_CLIENT_SECRET!);
  form.append("username", process.env.AUTH_USER!);
  form.append("password", process.env.AUTH_PASSWORD!);
  form.append("grant_type", "password");
  form.append("scope", "openid email profile");
  const resp = await request.post(
    `${process.env.AUTH_ISSUER}/protocol/openid-connect/token`,
    { form },
  );
  const body = await resp.json();
  return body.access_token;
};
