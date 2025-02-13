import { evaluate } from "@/app/utils/evaluate";

describe("evaluate", () => {
  let fhirPathEvaluateSpy: jest.SpyInstance;

  beforeEach(() => {
    fhirPathEvaluateSpy = jest.spyOn(require("fhirpath"), "evaluate");
  });

  afterEach(() => {
    jest.clearAllMocks();
    fhirPathEvaluateSpy.mockRestore();
  });

  it("fhirpath should be called 1 time when 1 call is made ", () => {
    evaluate({ id: "1234" }, "id");

    expect(fhirPathEvaluateSpy).toHaveBeenCalledExactlyOnceWith(
      { id: "1234" },
      "id",
      undefined,
      undefined,
      undefined,
      undefined,
    );
  });
  it("should call fhirpath.evaluate 1 time when the same call is made 2 times", () => {
    evaluate({ id: "2345" }, "id");
    evaluate({ id: "2345" }, "id");

    expect(fhirPathEvaluateSpy).toHaveBeenCalledExactlyOnceWith(
      { id: "2345" },
      "id",
      undefined,
      undefined,
      undefined,
      undefined,
    );
  });
  it("should call fhirpath.evaluate 2 time when the context is different", () => {
    evaluate({ id: "%id" }, "id", { id: 1 });
    evaluate({ id: "%id" }, "id", { id: 2 });

    expect(fhirPathEvaluateSpy).toHaveBeenCalledTimes(2);
    expect(fhirPathEvaluateSpy).toHaveBeenNthCalledWith(
      1,
      { id: "%id" },
      "id",
      { id: 1 },
      undefined,
      undefined,
    );
    expect(fhirPathEvaluateSpy).toHaveBeenNthCalledWith(
      2,
      { id: "%id" },
      "id",
      { id: 2 },
      undefined,
      undefined,
    );
  });

  it("should call once if resource type is bundle", () => {
    evaluate({ resourceType: "Bundle" }, "name");
    evaluate({ resourceType: "Bundle" }, "name");

    expect(fhirPathEvaluateSpy).toHaveBeenCalledExactlyOnceWith(
      { resourceType: "Bundle" },
      "name",
      undefined,
      undefined,
      undefined,
    );
  });

  it("should call once if id is the same", () => {
    evaluate({ id: 1234 }, "name");
    evaluate({ id: 1234, resourceType: "Observation" }, "name");

    expect(fhirPathEvaluateSpy).toHaveBeenCalledExactlyOnceWith(
      { id: 1234 },
      "name",
      undefined,
      undefined,
      undefined,
    );
  });
});
