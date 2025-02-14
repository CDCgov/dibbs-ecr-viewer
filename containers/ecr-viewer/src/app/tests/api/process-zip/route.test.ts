/**
 * @jest-environment node
 */
import { POST } from "@/app/api/process-zip/route";
import { processZip } from "@/app/api/process-zip/service";
import { NextRequest } from "next/server";

jest.mock("../../../api/process-zip/service");

describe("POST Process Zip", () => {
  const mockFile = new File(["content"], "test.zip", {
    type: "application/zip",
  });

  const createRequest = (formData: FormData) => {
    const a = new NextRequest("localhost:3000/ecr-viewer/api/process-zip");
    a.formData = () => Promise.resolve(formData);
    return a;
  };

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("should return a 200 response when valid zip file is provided", async () => {
    const formData = new FormData();
    formData.append("upload_file", mockFile);
    const request = createRequest(formData);
    (processZip as jest.Mock).mockReturnValue({ message: "ok", status: 200 });

    const response = await POST(request);

    expect(response.status).toEqual(200);
    expect(await response.json()).toEqual({ message: "ok" });
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

  it("should return a 500 response when an unexpected error occurs", async () => {
    jest.spyOn(console, "error").mockImplementation();
    const response = await POST(undefined as unknown as NextRequest);

    expect(response.status).toEqual(500);
    expect(await response.json()).toEqual({ message: "Server error" });
  });
});
