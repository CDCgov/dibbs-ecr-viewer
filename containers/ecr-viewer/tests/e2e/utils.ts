import { DefaultAzureCredential } from "@azure/identity";
import { Page, expect, APIRequestContext } from "@playwright/test";
/**
 * Helper to lot into via keycloak and go to the viewer page
 * @param page page
 */
const logInToKeycloak = async (page: Page) => {
  await page
    .getByRole("textbox", { name: "username" })
    .fill("ecr-viewer-admin");
  await page.getByRole("textbox", { name: "password" }).fill("pw");
  await page.getByRole("button", { name: "Sign in" }).click();
};

// Stores the token in the session storage and reloads the page
const setSessionStorage = async (page: Page, tokens: any) => {
  const cacheKeys = Object.keys(tokens);
  for (const key of cacheKeys) {
    const value = JSON.stringify(tokens[key]);
    await page.context().addInitScript(
      (arr) => {
        window.sessionStorage.setItem(arr[0], arr[1]);
      },
      [key, value],
    );
  }
  await page.reload();
};

let token: any;
/**
 * Helper to lot into via Azure AD and go to the viewer page
 * @param page page
 */
const logInToAd = async (page: Page) => {
  if (token) {
    await setSessionStorage(page, token);
  }
  process.env.AZURE_CLIENT_ID = process.env.AUTH_CLIENT_ID;
  process.env.AZURE_TENANT_ID = process.env.AUTH_ISSUER;
  process.env.AZURE_CLIENT_SECRET = process.env.AUTH_CLIENT_SECRET;
  const tokenCredential = new DefaultAzureCredential();
  token = await tokenCredential.getToken(".default");
  console.log({ token });

  // const pca = new PublicClientApplication({auth: {
  //   clientId: process.env.AUTH_CLIENT_ID!,
  //   authority: `https://login.microsoftonline.com/${process.env.AUTH_ISSUER}`
  // }});

  // const usernamePasswordRequest = {
  //   scopes: ['user.read', 'User.ReadBasic.All'],
  //   username: 'b06be871-38e8-4ba7-bd74-01e91635629c',
  //   password: process.env.AUTH_CLIENT_SECRET!,
  // };
  // await pca.acquireTokenByUsernamePassword(usernamePasswordRequest);
  // tokenCache = pca.getTokenCache().getKVStore();

  await setSessionStorage(page, token);
};

/**
 * Helper to lot into ecr viewer
 * @param page page
 * @param url optionally, the url to go to to force login
 * @param expectHeading optionally, the heading text to expect upon successful login
 */
export const logIn = async (
  page: Page,
  url = "/ecr-viewer/",
  expectHeading = "eCR library",
) => {
  await page.goto(url);

  // Not using NBS auth, strip out search param token
  let newUrl = url.replace(/&?auth\=[^&]+/, "");
  if (newUrl.endsWith("?")) {
    newUrl = newUrl.replace("?", "/");
  }
  await page.waitForURL(
    `/ecr-viewer/signin?callbackUrl=${encodeURIComponent(newUrl)}`,
  );

  await page.getByRole("button").click();

  switch (process.env.AUTH_PROVIDER) {
    case "keycloak": {
      await logInToKeycloak(page);
      break;
    }
    case "ad": {
      await logInToAd(page);
      break;
    }
  }

  await expect(
    page.getByRole("heading", { name: expectHeading }).first(),
  ).toBeVisible();
};

/**
 * non-expiring auth search param for testing local nbs auth
 */
export const nbsAuthParam = `auth=${process.env.DUMMY_NBS_JWT}`;

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
