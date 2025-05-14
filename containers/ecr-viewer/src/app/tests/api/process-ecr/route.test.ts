/**
 * @jest-environment node
 */
import { Bundle } from "fhir/r4";
import { NextRequest } from "next/server";

import { POST } from "@/app/api/process-ecr/route";
import { orchestrationRequest } from "@/app/api/services/orchestrationService";

jest.mock("../../../api/services/orchestrationService");

const bundle: Bundle = {
  type: "document",
  resourceType: "Bundle",
};

afterEach(() => {
  jest.clearAllMocks();
});

describe("POST Process ecr", () => {
  const mockEcr = "<totally>real xml</totally>";
  const mockRR = "<optional>rr</optional>";

  const createRequestJSON = (
    body: Record<string, string | boolean | number | File>,
  ) => {
    return new NextRequest("localhost:3000/ecr-viewer/api/process-ecr", {
      method: "post",
      body: JSON.stringify(body),
    });
  };
  const createRequestForm = (
    body: Record<string, string | boolean | number | File>,
  ) => {
    const form = new FormData();
    for (const [k, v] of Object.entries(body)) {
      form.append(k, v.toString());
    }
    return new NextRequest("localhost:3000/ecr-viewer/api/process-ecr", {
      method: "post",
      body: form,
    });
  };

  for (const createRequest of [createRequestForm, createRequestJSON]) {
    it("should return a 200 response when valid ecr is provided as a string", async () => {
      const request = createRequest({ ecr: mockEcr });

      (orchestrationRequest as jest.Mock).mockResolvedValue({
        message: "ok",
        status: 200,
      });

      const response = await POST(request);

      expect(await response.json()).toEqual({ message: "ok" });
      expect(response.status).toEqual(200);
    });

    it("should return a 200 response when valid ecr and rr", async () => {
      const request = createRequest({ ecr: mockEcr, rr_data: mockRR });

      (orchestrationRequest as jest.Mock).mockResolvedValue({
        message: "ok",
        status: 200,
      });

      const response = await POST(request);

      expect(await response.json()).toEqual({ message: "ok" });
      expect(response.status).toEqual(200);
    });

    it("should return a 200 response when valid ecr and return fhir bundle flag provided", async () => {
      const request = createRequest({
        ecr: mockEcr,
        return_fhir_bundle: true,
      });

      (orchestrationRequest as jest.Mock).mockResolvedValue({
        message: "ok",
        status: 200,
        bundle,
      });

      const response = await POST(request);

      expect(response.status).toEqual(200);
      expect(await response.json()).toEqual({ message: "ok", bundle });
    });

    it("should return a 400 response when required fields are missing", async () => {
      const request = createRequest({});

      const response = await POST(request);

      expect(response.status).toEqual(400);
      const jsonResponse = await response.json();
      expect(jsonResponse.message).toEqual("Validation error");
      expect(jsonResponse.errors).toBeDefined();
    });

    it("should return a 400 response when required no form sent", async () => {
      const response = await POST(
        new NextRequest("localhost:3000/ecr-viewer/api/process-ecr"),
      );

      expect(response.status).toEqual(400);
      const jsonResponse = await response.json();
      expect(jsonResponse.message).toEqual("Validation error");
      expect(jsonResponse.errors).toBeDefined();
    });

    it("should return a 500 response when an unexpected error occurs", async () => {
      const request = createRequest({ ecr: mockEcr });
      (orchestrationRequest as jest.Mock).mockRejectedValue(
        new Error("oh no!"),
      );

      jest.spyOn(console, "error").mockImplementation();
      const response = await POST(request);

      expect(response.status).toEqual(500);
      expect(await response.json()).toEqual({
        message: "Internal Server Error",
      });
    });
  }

  describe("JSON data only", () => {
    it("should return a 400 response when ecr is not a string", async () => {
      const request = createRequestJSON({ ecr: 123 });

      const response = await POST(request);

      expect(response.status).toEqual(400);
      const jsonResponse = await response.json();
      expect(jsonResponse.message).toEqual("Validation error");
      expect(jsonResponse.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: "Invalid input",
          }),
        ]),
      );
    });
  });

  describe("Form data only", () => {
    it("should return a 200 response when valid ecr is provided as a file", async () => {
      const request = createRequestForm({
        ecr: new File([mockEcr], "CDA_eICR.xml"),
        rr: new File([mockRR], "CDA_RR.xml"),
      });

      (orchestrationRequest as jest.Mock).mockResolvedValue({
        message: "ok",
        status: 200,
      });

      const response = await POST(request);

      expect(await response.json()).toEqual({ message: "ok" });
      expect(response.status).toEqual(200);
    });

    it("should return a 200 response when valid ecr is provided as a zip file", async () => {
      const request = createRequestForm({
        ecr: new File([mockEcr], "CDA_eICR.xml", { type: "application/zip" }),
      });

      (orchestrationRequest as jest.Mock).mockResolvedValue({
        message: "ok",
        status: 200,
      });

      const response = await POST(request);

      expect(await response.json()).toEqual({ message: "ok" });
      expect(response.status).toEqual(200);
    });
  });
});
