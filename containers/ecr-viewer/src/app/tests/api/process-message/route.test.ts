/**
 * @jest-environment node
 */
import { Bundle } from "fhir/r4";
import { NextRequest } from "next/server";

import { POST } from "@/app/api/process-message/route";
import { orchestrationRequest } from "@/app/api/services/orchestrationService";

jest.mock("../../../api/services/orchestrationService");

const bundle: Bundle = {
  type: "document",
  resourceType: "Bundle",
};

afterEach(() => {
  jest.clearAllMocks();
});

describe("POST Process Message", () => {
  const mockMessage = "<totally>real xml</totally>";
  const mockRR = "<optional>rr</optional>";

  const createRequest = (formData: FormData) => {
    const a = new NextRequest("localhost:3000/ecr-viewer/api/process-message");
    a.formData = () => Promise.resolve(formData);
    return a;
  };

  it("should return a 200 response when valid message is provided", async () => {
    const formData = new FormData();
    formData.append("message", mockMessage);
    const request = createRequest(formData);

    (orchestrationRequest as jest.Mock).mockResolvedValue({
      message: "ok",
      status: 200,
    });

    const response = await POST(request);

    expect(response.status).toEqual(200);
    expect(await response.json()).toEqual({ message: "ok" });
  });

  it("should return a 200 response when valid message and rr", async () => {
    const formData = new FormData();
    formData.append("message", mockMessage);
    formData.append("rr_data", mockRR);
    const request = createRequest(formData);

    (orchestrationRequest as jest.Mock).mockResolvedValue({
      message: "ok",
      status: 200,
    });

    const response = await POST(request);

    expect(response.status).toEqual(200);
    expect(await response.json()).toEqual({ message: "ok" });
  });

  it("should return a 200 response when valid message and return fhir bundle flag provided", async () => {
    const formData = new FormData();
    formData.append("message", mockMessage);
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

  it("should return a 400 response when message is not a string", async () => {
    const invalidFile = new File(["content"], "test.txt", {
      type: "text/plain",
    });
    const formData = new FormData();
    formData.append("message", invalidFile);
    const request = createRequest(formData);

    const response = await POST(request);

    expect(response.status).toEqual(400);
    const jsonResponse = await response.json();
    expect(jsonResponse.message).toEqual("Validation error");
    expect(jsonResponse.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "Expected string, received object",
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
      new NextRequest("localhost:3000/ecr-viewer/api/process-message"),
    );

    expect(response.status).toEqual(400);
    const jsonResponse = await response.json();
    expect(jsonResponse.message).toEqual("Validation error");
    expect(jsonResponse.errors).toBeDefined();
  });

  it("should return a 500 response when an unexpected error occurs", async () => {
    const formData = new FormData();
    formData.append("message", mockMessage);
    const request = createRequest(formData);
    (orchestrationRequest as jest.Mock).mockRejectedValue(new Error("oh no!"));

    jest.spyOn(console, "error").mockImplementation();
    const response = await POST(request);

    expect(response.status).toEqual(500);
    expect(await response.json()).toEqual({ message: "Internal Server Error" });
  });
});
