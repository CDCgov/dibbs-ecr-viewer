import { Bundle, Observation, Patient } from "fhir/r4";
import fhirpath_r4_model from "fhirpath/fhir-context/r4";

import BundleMiscNotes from "@/app/tests/assets/BundleMiscNotes.json";
import BundlePatient from "@/app/tests/assets/BundlePatient.json";
import {
  evaluate,
  evaluateFor,
  evaluateReference,
  evaluateValue,
} from "@/app/utils/evaluate";

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
    evaluateFor<string>({ id: "1234" }, "id");

    expect(fhirPathEvaluateSpy).toHaveBeenCalledExactlyOnceWith(
      { id: "1234" },
      "id",
      undefined,
      fhirpath_r4_model,
      undefined,
    );
  });
  it("should call fhirpath.evaluate 1 time when the same call is made 2 times", () => {
    evaluateFor<string>({ id: "2345" }, "id");
    evaluateFor<string>({ id: "2345" }, "id");

    expect(fhirPathEvaluateSpy).toHaveBeenCalledExactlyOnceWith(
      { id: "2345" },
      "id",
      undefined,
      fhirpath_r4_model,
      undefined,
    );
  });
  it("should call fhirpath.evaluate 2 time when the context is different", () => {
    evaluateFor<string>({ id: "%id" }, "id", "string", { id: 1 });
    evaluateFor<string>({ id: "%id" }, "id", "string", { id: 2 });

    expect(fhirPathEvaluateSpy).toHaveBeenCalledTimes(2);
    expect(fhirPathEvaluateSpy).toHaveBeenNthCalledWith(
      1,
      { id: "%id" },
      "id",
      { id: 1 },
      fhirpath_r4_model,
      undefined,
    );
    expect(fhirPathEvaluateSpy).toHaveBeenNthCalledWith(
      2,
      { id: "%id" },
      "id",
      { id: 2 },
      fhirpath_r4_model,
      undefined,
    );
  });

  it("should call once per bundle url", () => {
    // this test can use any valid mapping
    evaluate(
      {
        resourceType: "Bundle",
        type: "document",
        entry: [{ fullUrl: "test/123" }],
      },
      "careTeamParticipantPeriod",
    );
    evaluate(
      {
        resourceType: "Bundle",
        type: "document",
        entry: [{ fullUrl: "test/123" }],
      },
      "careTeamParticipantPeriod",
    );

    expect(fhirPathEvaluateSpy).toHaveBeenCalledExactlyOnceWith(
      {
        resourceType: "Bundle",
        type: "document",
        entry: [{ fullUrl: "test/123" }],
      },
      "period.text",
      undefined,
      fhirpath_r4_model,
      undefined,
    );
  });

  it("should call once if id is the same", () => {
    // this test can use any valid mapping
    evaluate({ id: "1234" }, "careTeamParticipantPeriod");
    evaluate(
      { id: "1234", resourceType: "Observation" },
      "careTeamParticipantPeriod",
    );

    expect(fhirPathEvaluateSpy).toHaveBeenCalledExactlyOnceWith(
      { id: "1234" },
      "period.text",
      undefined,
      fhirpath_r4_model,
      undefined,
    );
  });
});

describe("evaluate value", () => {
  it("should provide the string in the case of valueString", () => {
    const actual = evaluateValue(
      { resourceType: "Observation", valueString: "abc" } as any,
      "value",
    );

    expect(actual).toEqual("abc");
  });
  it("should provide the string in the case of valueCodeableConcept", () => {
    const actual = evaluateValue(
      {
        resourceType: "Observation",
        valueCodeableConcept: {
          coding: [
            {
              display: "Negative",
              code: "N",
            },
          ],
        },
      } as any,
      "value",
    );

    expect(actual).toEqual("Negative");
  });
  it("should provide the string in the case of valueCoding", () => {
    const actual = evaluateValue(
      {
        resourceType: "Extension",
        valueCoding: {
          display: "Negative",
          code: "N",
        },
      } as any,
      "value",
    );

    expect(actual).toEqual("Negative");
  });
  it("should provide the string in the case of valueBoolean", () => {
    const actual = evaluateValue(
      {
        resourceType: "Extension",
        valueBoolean: true,
      } as any,
      "value",
    );

    expect(actual).toEqual("true");
  });
  it("should provide the code as a fallback in the case of valueCodeableConcept", () => {
    const actual = evaluateValue(
      {
        resourceType: "Observation",
        valueCodeableConcept: {
          coding: [
            {
              code: "N",
            },
          ],
        },
      } as any,
      "value",
    );

    expect(actual).toEqual("N");
  });
  it("should provide the code as a fallback in the case of valueCoding", () => {
    const actual = evaluateValue(
      {
        resourceType: "Extension",
        valueCoding: {
          code: "N",
        },
      } as any,
      "value",
    );

    expect(actual).toEqual("N");
  });
  describe("Quantity", () => {
    it("should provide the value and string unit with a space inbetween", () => {
      const actual = evaluateValue(
        {
          resourceType: "Observation",
          valueQuantity: { value: 1, unit: "ft" },
        } as any,
        "value",
      );

      expect(actual).toEqual("1 ft");
    });
    it("should provide the value and symbol unit", () => {
      const actual = evaluateValue(
        {
          resourceType: "Observation",
          valueQuantity: { value: 1, unit: "%" },
        } as any,
        "value",
      );

      expect(actual).toEqual("1%");
    });

    it("should map the unit if set in UNIT_MAP", () => {
      const actual = evaluateValue(
        {
          resourceType: "Observation",
          valueQuantity: { value: 1, unit: "[in_i]" },
        } as any,
        "value",
      );

      expect(actual).toEqual("1 in");
    });
  });
});

// TODO PR: move these tests
describe("Evaluate Reference", () => {
  it("should return undefined if resource not found", () => {
    const actual = evaluateReference<Observation>(
      BundleMiscNotes as unknown as Bundle,
      "Observation/1234",
    );

    expect(actual).toBeUndefined();
  });
  it("should return the resource if the resource is available", () => {
    const actual = evaluateReference<Patient>(
      BundlePatient as unknown as Bundle,
      "Patient/99999999-4p89-4b96-b6ab-c46406839cea",
    );

    expect(actual?.id).toEqual("99999999-4p89-4b96-b6ab-c46406839cea");
    expect(actual?.resourceType).toEqual("Patient");
  });
});
