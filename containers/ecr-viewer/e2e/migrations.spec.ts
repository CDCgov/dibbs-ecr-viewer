// NOTE: this file assume it is running on a deployment with an un-set-up DB
import { test, expect } from "@playwright/test";

import { logInToKeycloak } from "./dual/utils";

const toForm = (obj: Record<string, string>) => {
  const form = new FormData();
  // for this spec, we always skip conditions to avoid requiring
  // orchestration service (not worth it at this time, this could change
  // down the road)
  form.append("skip_condition_update", "true");
  for (const [k, v] of Object.entries(obj)) {
    form.append(k, v);
  }
  return form;
};

const headers = {
  Authorization: `Bearer eyJhbGciOiJSUzI1NiIsImlkIjoiYmxhaCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.hXmX6wu9ThiSqNEl6Y3pBETppiIt0j4RKSVPO_AAYZJZsngSFiu8GuGDtA13kJ-texfUHshqcy4euoVwfmN-naDi2Ly6p6lPjY6xzmTuQ1DtiKLZDNBsDupjoLAuIJQ3K8uWRnCdRGG1ZlTkZa-SG8b4jfDLRrl1fPiJCWM62XV7_gIvqCvRAPdP9kMrOV1LtLEuXgoXZGifVNnPQhtT7fQ7kDmbM-HDG4MquZy89CIRy2q22xIclePOAoe0Ifz6q7-NG3I9CzKOAa_Vx6Oy5ZYBYphfV1n46gp4OC0Cb_w-wFLfRDuDPJZvcS5ed2HxdyZrU_GeD4WSN5IQpEn_45CZifBzmv9-jweEUD2or3sp1DReORLZG2CvBqtixC0p3gIeGnY4HROduafmDfyI0gcv7pDM-fcreMCBG-7uqUPkk9rqhCPw9n6fhWvNMSGrtW9tx6hAPNxjKJ2AsyTh7cJyR0teVpijhXZz0dGJOtYY1-nlR7_BnJH2lC9tLiIJcVl1JKfGRu18MV1bHs7y25Wp1HxVDUXllShXa7_oD7ljnE3stmpO5GPMbxvWC_RKO_bu_e2mAgJ3yiPImFpLVYZZgBqClctciZMQeV1lZTAy-7Xlzgdx-IvFc9VuigKw6hfk4on98BxMUENeh20KIgVv8cMr4ZjAGV3MjnFnHWw`,
};

test.describe("migrations", () => {
  test.beforeEach(logInToKeycloak);

  test("should follow whole flow through up and down", async ({
    page,
    request,
  }) => {
    await page.goto("/ecr-viewer");

    await expect(
      page.getByText("eCR Viewer setup is incomplete"),
    ).toBeVisible();
    await expect(page.getByText("eCR Library")).not.toBeVisible();

    const noSecret = await request.post(`/ecr-viewer/api/migrate-db`, {
      headers,
    });
    expect(await noSecret.json()).toEqual(
      expect.objectContaining({
        message: "Validation error",
      }),
    );
    expect(noSecret.ok()).toBeFalsy();

    const wrongSecret = await request.post(`/ecr-viewer/api/migrate-db`, {
      form: toForm({ migration_secret: "nope" }),
      headers,
    });
    expect(await wrongSecret.json()).toEqual(
      expect.objectContaining({
        message:
          "Request did not have expected migration secret. See server logs for expected value",
      }),
    );
    expect(wrongSecret.ok()).toBeFalsy();

    const up = await request.post(`/ecr-viewer/api/migrate-db`, {
      form: toForm({ migration_secret: "test" }),
      headers,
    });
    expect(await up.json()).toEqual(
      expect.objectContaining({ message: "success" }),
    );
    expect(up.ok()).toBeTruthy();

    await page.goto("/ecr-viewer");
    await expect(
      page.getByText("eCR Viewer setup is incomplete"),
    ).not.toBeVisible();
    await expect(page.getByText("eCR Library")).toBeVisible();

    const down = await request.post(`/ecr-viewer/api/migrate-db`, {
      form: toForm({ migration_secret: "test", direction: "down" }),
      headers,
    });
    expect(await down.json()).toEqual(
      expect.objectContaining({ message: "success" }),
    );
    expect(down.ok()).toBeTruthy();

    await page.goto("/ecr-viewer");
    await expect(
      page.getByText("eCR Viewer setup is incomplete"),
    ).toBeVisible();
    await expect(page.getByText("eCR Library")).not.toBeVisible();
  });
});
