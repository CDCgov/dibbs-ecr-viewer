import { Page, expect } from "@playwright/test";

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

/**
 * Helper to lot into via Azure AD and go to the viewer page
 * @param page page
 */
const logInToAd = async (page: Page) => {
  // TODO: not implemented
  await page
    .getByLabel("Enter your email, phone, or Skype.")
    .fill(process.env.AZURE_AD_USER!);
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Password").fill(process.env.AZURE_AD_PASSWORD!);
  await page.getByRole("button", { name: "Sign In" }).click();
};

/**
 * Helper to lot into ecr viewer
 * @param page page
 * @param url optionally, the url to go to to force login
 * @param expectText optionally, the text to expect upon successful login
 */
export const logIn = async (
  page: Page,
  url = "/ecr-viewer/",
  expectText = "eCR Library",
) => {
  await page.goto(url);
  await page.waitForURL(
    `ecr-viewer/signin?callbackUrl=${encodeURIComponent(url)}`,
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

  await expect(page.getByText(expectText)).toBeVisible();
};

/**
 * non-expiring auth search param for testing local nbs auth
 */
export const nbsAuthParam = `auth=eyJhbGciOiJSUzI1NiIsImlkIjoiYmxhaCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.hXmX6wu9ThiSqNEl6Y3pBETppiIt0j4RKSVPO_AAYZJZsngSFiu8GuGDtA13kJ-texfUHshqcy4euoVwfmN-naDi2Ly6p6lPjY6xzmTuQ1DtiKLZDNBsDupjoLAuIJQ3K8uWRnCdRGG1ZlTkZa-SG8b4jfDLRrl1fPiJCWM62XV7_gIvqCvRAPdP9kMrOV1LtLEuXgoXZGifVNnPQhtT7fQ7kDmbM-HDG4MquZy89CIRy2q22xIclePOAoe0Ifz6q7-NG3I9CzKOAa_Vx6Oy5ZYBYphfV1n46gp4OC0Cb_w-wFLfRDuDPJZvcS5ed2HxdyZrU_GeD4WSN5IQpEn_45CZifBzmv9-jweEUD2or3sp1DReORLZG2CvBqtixC0p3gIeGnY4HROduafmDfyI0gcv7pDM-fcreMCBG-7uqUPkk9rqhCPw9n6fhWvNMSGrtW9tx6hAPNxjKJ2AsyTh7cJyR0teVpijhXZz0dGJOtYY1-nlR7_BnJH2lC9tLiIJcVl1JKfGRu18MV1bHs7y25Wp1HxVDUXllShXa7_oD7ljnE3stmpO5GPMbxvWC_RKO_bu_e2mAgJ3yiPImFpLVYZZgBqClctciZMQeV1lZTAy-7Xlzgdx-IvFc9VuigKw6hfk4on98BxMUENeh20KIgVv8cMr4ZjAGV3MjnFnHWw`;
