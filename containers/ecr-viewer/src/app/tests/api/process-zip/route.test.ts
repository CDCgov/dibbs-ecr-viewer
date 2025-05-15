/**
 * @jest-environment node
 */
import { Bundle } from "fhir/r4";
import { NextRequest } from "next/server";

import { orchestrationRequest } from "@/app/api/process-ecr/service";
import { POST } from "@/app/api/process-zip/route";

jest.mock("../../../api/services/orchestrationService");

const bundle: Bundle = {
  type: "document",
  resourceType: "Bundle",
};

afterEach(() => {
  jest.clearAllMocks();
});

describe("POST Process Zip", () => {
  const mockFile = new File(["content"], "test.zip", {
    type: "application/zip",
  });

  const createRequest = (formData: FormData) => {
    return new NextRequest("localhost:3000/ecr-viewer/api/process-zip", {
      method: "post",
      body: formData,
    });
  };

  it("should return a 200 response when valid zip file is provided", async () => {
    const formData = new FormData();
    formData.append("upload_file", mockFile);
    const request = createRequest(formData);

    (orchestrationRequest as jest.Mock).mockResolvedValue({
      message: "ok",
      status: 200,
    });

    const response = await POST(request);

    expect(response.status).toEqual(200);
    expect(await response.json()).toEqual({ message: "ok" });
  });

  it("should return a 200 response when valid zip file and return fhir bundle flag provided", async () => {
    const formData = new FormData();
    formData.append("upload_file", mockFile);
    formData.append("return_fhir_bundle", "True");
    const request = createRequest(formData);

    (orchestrationRequest as jest.Mock).mockResolvedValue({
      message: "ok",
      status: 200,
      bundle,
    });

    const response = await POST(request);

    expect(response.status).toEqual(200);
    expect(await response.json()).toEqual({ message: "ok", bundle });
  });

  it("should return a 400 response when file is not a zip", async () => {
    const invalidFile = new File(["content"], "test.txt", {
      type: "text/plain",
    });
    const formData = new FormData();
    formData.append("upload_file", invalidFile);
    const request = createRequest(formData);

    const response = await POST(request);

    expect(response.status).toEqual(400);
    const jsonResponse = await response.json();
    expect(jsonResponse.message).toEqual("Validation error");
    expect(jsonResponse.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "File must be a zip",
        }),
      ]),
    );
  });

  it("should return a 400 response when required fields are missing", async () => {
    const formData = new FormData();
    const request = createRequest(formData);

    const response = await POST(request);

    expect(response.status).toEqual(400);
    const jsonResponse = await response.json();
    expect(jsonResponse.message).toEqual("Validation error");
    expect(jsonResponse.errors).toBeDefined();
  });

  it("should return a 400 response when required no form sent", async () => {
    const response = await POST(
      new NextRequest("localhost:3000/ecr-viewer/api/process-zip"),
    );

    expect(response.status).toEqual(400);
    const jsonResponse = await response.json();
    expect(jsonResponse.message).toEqual("Validation error");
    expect(jsonResponse.errors).toBeDefined();
  });

  it("should return a 500 response when an unexpected error occurs", async () => {
    const formData = new FormData();
    formData.append("upload_file", mockFile);
    const request = createRequest(formData);
    (orchestrationRequest as jest.Mock).mockRejectedValue(new Error("oh no!"));

    jest.spyOn(console, "error").mockImplementation();
    const response = await POST(request);

    expect(response.status).toEqual(500);
    expect(await response.json()).toEqual({ message: "Internal Server Error" });
  });
});
