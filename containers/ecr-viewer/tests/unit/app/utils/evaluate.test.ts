import { Bundle, Observation, Patient, Resource } from "fhir/r4";
import fhirpath_r4_model from "fhirpath/fhir-context/r4";

import BundleMiscNotes from "../../../../../../test-data/fhir/BundleMiscNotes.json";
import BundlePatient from "../../../../../../test-data/fhir/BundlePatient.json";
import {
  evaluateAll,
  evaluateAllAndCheck,
  evaluateOne,
  evaluateReference,
  evaluateReference2,
  evaluateValue,
} from "@/app/utils/evaluate";
import fhirPathMappings from "@/app/utils/evaluate/fhir-paths";
import { FhirIndex } from "@/app/view-data/services/fhirResourcesIndexService";

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
    evaluateAllAndCheck<string>({ id: "1234" }, "id", "string");

    expect(fhirPathEvaluateSpy).toHaveBeenCalledExactlyOnceWith(
      { id: "1234" },
      "id",
      undefined,
      fhirpath_r4_model,
    );
  });
  it("should call fhirpath.evaluate 1 time when the same call is made 2 times", () => {
    const resource = { id: "2345" };

    evaluateAllAndCheck<string>(resource, "id", "string");
    evaluateAllAndCheck<string>(resource, "id", "string");

    expect(fhirPathEvaluateSpy).toHaveBeenCalledExactlyOnceWith(
      resource,
      "id",
      undefined,
      fhirpath_r4_model,
    );
  });
  it("should call fhirpath.evaluate 2 time when the context is different", () => {
    const resource = { id: "%id" };

    evaluateAllAndCheck<string>(resource, "id", "string", { id: 1 });
    evaluateAllAndCheck<string>(resource, "id", "string", { id: 2 });

    expect(fhirPathEvaluateSpy).toHaveBeenCalledTimes(2);
    expect(fhirPathEvaluateSpy).toHaveBeenNthCalledWith(
      1,
      resource,
      "id",
      { id: 1 },
      fhirpath_r4_model,
    );
    expect(fhirPathEvaluateSpy).toHaveBeenNthCalledWith(
      2,
      resource,
      "id",
      { id: 2 },
      fhirpath_r4_model,
    );
  });

  it("should reuse an evaluation for the same bundle instance", () => {
    const bundle: Bundle = {
      resourceType: "Bundle",
      type: "document",
      entry: [{ fullUrl: "test/123" }],
    };

    evaluateAll(bundle, fhirPathMappings.careTeamParticipantPeriod);
    evaluateAll(bundle, fhirPathMappings.careTeamParticipantPeriod);

    expect(fhirPathEvaluateSpy).toHaveBeenCalledExactlyOnceWith(
      bundle,
      "period.text",
      undefined,
      fhirpath_r4_model,
    );
  });

  it("should evaluate distinct resources that share an ID separately", () => {
    const preliminary = {
      id: "same-id",
      resourceType: "Observation",
      status: "preliminary",
    } as Observation;
    const final = {
      id: "same-id",
      resourceType: "Observation",
      status: "final",
    } as Observation;

    expect(
      evaluateAllAndCheck<string>(preliminary, "status", "string"),
    ).toEqual(["preliminary"]);
    expect(evaluateAllAndCheck<string>(final, "status", "string")).toEqual([
      "final",
    ]);
    expect(fhirPathEvaluateSpy).toHaveBeenCalledTimes(2);
  });

  describe("evaluateOne", () => {
    it("should return undefined if no result", () => {
      const res = evaluateOne({}, fhirPathMappings.observationOrganismMethod);
      expect(res).toBeUndefined();
    });

    it("should return value if one result", () => {
      const res = evaluateOne(
        {
          resourceType: "Procedure",
          reasonCode: [
            {
              text: "first",
            },
          ],
        } as Resource,
        fhirPathMappings.procedureReason,
      );
      expect(res).toEqual("first");
    });

    it("should return first value and log error if multiple results", () => {
      jest.spyOn(console, "error").mockImplementation((msg) => {
        expect(msg).toContain("Expected one result, but got 2.");
      });

      const res = evaluateOne(
        {
          resourceType: "Procedure",
          reasonCode: [
            {
              text: "first",
            },
            {
              text: "second",
            },
          ],
        } as Resource,
        fhirPathMappings.procedureReason,
      );
      expect(res).toEqual("first");
    });
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
  it("should provide the formatted date in the case of a valueDateTime", () => {
    const actual = evaluateValue(
      {
        resourceType: "Observation",
        valueDateTime: "2017-05-22",
      } as any,
      "value",
    );

    expect(actual).toEqual("05/22/2017");
  });
  it("should provide the formatted date and time in the case of a valueDateTime", () => {
    const actual = evaluateValue(
      {
        resourceType: "Observation",
        valueDateTime: "2017-10-01T10:15:00",
      } as any,
      "value",
    );

    expect(actual).toEqual("10/01/2017 10:15\u00A0AM");
  });
  it("should provide the formatted date in the case of a valueDateTime and invalid date", () => {
    const actual = evaluateValue(
      {
        resourceType: "Observation",
        valueDateTime: "2017-02-31",
      } as any,
      "value",
    );

    expect(actual).toEqual("03/03/2017");
  });
  it("should provide the original string in the case of a valueDateTime and not a date but a string", () => {
    const actual = evaluateValue(
      {
        resourceType: "Observation",
        valueDateTime: "this is not a date but there is a number 10.1",
      } as any,
      "value",
    );

    expect(actual).toEqual("this is not a date but there is a number 10.1");
  });
  it("should provide the original string in the case of a valueDateTime and not a date but a number", () => {
    const actual = evaluateValue(
      {
        resourceType: "Observation",
        valueDateTime: "0",
      } as any,
      "value",
    );

    expect(actual).toEqual("0");
  });
  describe("Quantity", () => {
    it("should provide the value and string unit with a space in between", () => {
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
  describe("TimeX", () => {
    it("should provide the formatted date time if date/time returned", () => {
      const actual = evaluateValue(
        {
          resourceType: "Observation",
          effectiveDateTime: "20201010",
        } as any,
        { path: "effective", type: "TimeX", name: "dateTime" },
      );

      expect(actual).toEqual("10/10/2020");
    });
    it("should provide the formatted start/end if period returned", () => {
      const actual = evaluateValue(
        {
          resourceType: "Observation",
          effectivePeriod: { start: "20201010" },
        } as any,
        { path: "effective", type: "TimeX", name: "dateTime" },
      );

      expect(actual).toEqual("Start: 10/10/2020");
    });
  });
});

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

describe("Evaluate Reference 2", () => {
  const resource1 = {
    fullUrl: "urn:uuid:1",
    resource: {
      resourceType: "Observation",
      id: "1",
    },
  };
  const resource2 = {
    fullUrl: "urn:uuid:2",
    resource: {
      resourceType: "Observation",
      id: "2",
    },
  };
  const fhirIndexBundleSample: FhirIndex = {
    fhirIndexByType: {
      Observation: [resource1.resource, resource2.resource],
    },
    fhirIndexByTypeAndId: {
      Observation: {
        "1": resource1.resource,
        "2": resource2.resource,
      },
    },
  };

  it("should return undefined if resource not found", () => {
    const actual = evaluateReference2<Observation>(
      fhirIndexBundleSample,
      "Observation/not-valid-id",
    );

    expect(actual).toBeUndefined();
  });
  it("should return the resource if the resource is available", () => {
    const actual = evaluateReference2<Observation>(
      fhirIndexBundleSample,
      "Observation/2",
    );

    expect(actual?.id).toEqual("2");
    expect(actual?.resourceType).toEqual("Observation");
  });
  it("should error when resource is found but resourceType does not match expected resourceType", () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const fhirIndexMismatch: FhirIndex = {
      fhirIndexByType: {
        Patient: [resource1.resource], // Resource 1 = Observation
      },
      fhirIndexByTypeAndId: {
        Patient: {
          "1": resource1.resource,
        },
      },
    };
    evaluateReference2<Patient>(fhirIndexMismatch, "Patient/1");
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Resource type mismatch"),
    );
    consoleSpy.mockRestore();
  });
});
