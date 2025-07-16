import { DefaultAzureCredential } from "@azure/identity";
import { Page, expect, APIRequestContext, Cookie } from "@playwright/test";

type UserType = "ADMIN" | "STANDARD";

// Instead of going to IDP to log in on every page, store the cookies
// globally and re-use once logged in
const cookies: { [key in UserType]?: Cookie[] } = {};

/**
 * Helper to log into ecr viewer
 * @param page page
 * @param config config object
 * @param config.url optionally, the url to go to to force login
 * @param config.expectedHeading optionally, the heading text to expect upon successful login
 * @param config.userType optionally, the user type to log in with. Default "ADMIN"
 */
export const logIn = async (
  page: Page,
  config: {
    url?: string;
    expectedHeading?: string;
    userType?: UserType;
  } = {},
) => {
  const {
    url = "/ecr-viewer/",
    expectedHeading = "eCR library",
    userType = "ADMIN",
  } = config;

  if (cookies[userType]) {
    // set cookies to previously saved ones
    await page.context().addCookies(cookies[userType]!);
  }

  await page.goto(url);

  if (!cookies[userType]) {
    // Not using NBS auth, strip out search param token
    let newUrl = url.replace(/&?auth\=[^&]+/, "");
    if (newUrl.endsWith("?")) {
      newUrl = newUrl.replace("?", "/");
    }
    await page.waitForURL(
      `/ecr-viewer/signin?callbackUrl=${encodeURIComponent(newUrl)}`,
    );

    await page.getByRole("button").click();

    const userName = process.env[`AUTH_${userType}_USER`];
    const password = process.env[`AUTH_${userType}_PASSWORD`];

    switch (process.env.AUTH_PROVIDER) {
      case "keycloak": {
        await logInToKeycloak(page, userName!, password!);
        break;
      }
      case "ad": {
        await logInToAd(page, userName!, password!);
        break;
      }
    }
  }

  await expect(
    page.getByRole("heading", { name: expectedHeading }).first(),
  ).toBeVisible();

  if (!cookies[userType]) {
    // save cookies
    cookies[userType] = await page.context().cookies();
  }
};

// Helper to log into via keycloak and go to the viewer page
const logInToKeycloak = async (
  page: Page,
  userName: string,
  password: string,
) => {
  await page.getByRole("textbox", { name: "username" }).fill(userName!);
  await page.getByRole("textbox", { name: "password" }).fill(password!);
  await page.getByRole("button", { name: "Sign in" }).click();
};

// Helper to log into via Azure AD and go to the viewer page
const logInToAd = async (page: Page, userName: string, password: string) => {
  await page.getByLabel("Enter your email, phone, or Skype.").fill(userName!);
  await page.getByRole("button", { name: "Next" }).click();

  await page.getByRole("textbox", { name: "password" }).fill(password!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("button", { name: "No" }).click();
};

/**
 * non-expiring auth search param for testing local nbs auth
 */
export const nbsAuthParam = `auth=${process.env.DUMMY_NBS_JWT}`;

// Instead of going to IDP to to get a token on every request, store the token
// globally and re-use once acquired
let apiToken = "";

export const getToken = async (request: APIRequestContext) => {
  if (apiToken) return apiToken;

  switch (process.env.AUTH_PROVIDER) {
    case "keycloak": {
      apiToken = await getKeycloakToken(request);
      return apiToken;
    }
    case "ad": {
      apiToken = await getAdToken();
      return apiToken;
    }
    default: {
      throw new Error("unknown auth provider");
    }
  }
};

// Helper to get an auth token from keycloak
const getKeycloakToken = async (request: APIRequestContext) => {
  const form = new FormData();
  form.append("client_id", process.env.AUTH_CLIENT_ID!);
  form.append("client_secret", process.env.AUTH_CLIENT_SECRET!);
  form.append("username", process.env.AUTH_ADMIN_USER!);
  form.append("password", process.env.AUTH_ADMIN_PASSWORD!);
  form.append("grant_type", "password");
  form.append("scope", "openid email profile");
  const resp = await request.post(
    `${process.env.AUTH_ISSUER}/protocol/openid-connect/token`,
    { form },
  );
  const body = await resp.json();
  return body.access_token;
};

// Helper to get azure auth token
const getAdToken = async () => {
  process.env.AZURE_CLIENT_ID = process.env.AUTH_CLIENT_ID;
  process.env.AZURE_TENANT_ID = process.env.AUTH_ISSUER;
  process.env.AZURE_CLIENT_SECRET = process.env.AUTH_CLIENT_SECRET;
  const tokenCredential = new DefaultAzureCredential();
  const tokenInfo = await tokenCredential.getToken(
    `${process.env.AUTH_CLIENT_ID}/.default`,
  );
  return tokenInfo.token;
};
