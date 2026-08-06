import { render, screen } from "@testing-library/react";
import { Bundle } from "fhir/r4";

import * as _BundlePatient from "@/../../../test-data/fhir/BundlePatient.json";
import * as _BundleWithTravelHistory from "@/../../../test-data/fhir/BundleTravelHistory.json";
import * as _BundlePatientMultiple from "@/../../../test-data/fhir/BundlePatientMultiple.json";
import * as _BundleWithSDOH from "@/../../../test-data/fhir/BundleSDOH.json";
import * as _BundleWithSexualOrientation from "@/../../../test-data/fhir/BundleSexualOrientation.json";
import * as _BundleWithTobaccoUse from "@/../../../test-data/fhir/BundleTobaccoUse.json";
import {
  evaluateTravelHistoryTable,
  returnDisabilityStatusTable,
  evaluateSocialDeterminantsOfHealth,
  evaluateSocialData,
  evaluateAlcoholUse,
  evaluateOccupation,
  evaluateOccupationHistory,
} from "@/app/view-data/services/socialHistoryService";
import { getFhirIndex } from "@/app/view-data/services/fhirResourcesIndexService";

const BundlePatient = _BundlePatient as unknown as Bundle;
const fhirIndexBundlePatient = getFhirIndex(BundlePatient);

const BundleWithTravelHistory = _BundleWithTravelHistory as unknown as Bundle;
const fhirIndexBundleWithTravelHistory = getFhirIndex(BundleWithTravelHistory);

const BundlePatientMultiple = _BundlePatientMultiple as unknown as Bundle;
const BundleWithSDOH = _BundleWithSDOH as unknown as Bundle;

const BundleWithTobaccoUse = _BundleWithTobaccoUse as unknown as Bundle;
const fhirIndexBundleTobaccoUse = getFhirIndex(BundleWithTobaccoUse);

const BundleWithSexualOrientation =
  _BundleWithSexualOrientation as unknown as Bundle;
const fhirIndexBundleWithSexualOrientation = getFhirIndex(
  BundleWithSexualOrientation,
);

describe("Travel History", () => {
  it("should display a table ", () => {
    const { container } = render(
      evaluateTravelHistoryTable(BundleWithTravelHistory),
    );
    expect(container).toMatchSnapshot();
  });
  it("should display nothing when no travel history is available", () => {
    expect(evaluateTravelHistoryTable({} as Bundle)).toBeUndefined();
  });
});

describe("Disability Status", () => {
  it("should display a table ", () => {
    const { container } = render(returnDisabilityStatusTable(BundlePatient));
    // TODO: Remove this once #595 is merged
    // Don't want IDs to dynamically update in this test
    const cleanedContainer = container.innerHTML
      .replace(/id="[^"]*"/g, 'id="id-tooltip"')
      .replace(
        /aria-describedby="[^"]*"/g,
        'aria-describedby="aria-desc-tooltip"',
      );
    expect(cleanedContainer).toMatchSnapshot();
  });
  it("should display nothing when no travel history is available", () => {
    expect(returnDisabilityStatusTable({} as Bundle)).toBeUndefined();
  });
});

describe("Social Determinants of Health", () => {
  it("should display sdoh data ", () => {
    const { container } = render(
      evaluateSocialDeterminantsOfHealth(BundleWithSDOH),
    );
    expect(container).toMatchSnapshot();
  });

  it("should display nothing when no SDOH is available", () => {
    expect(evaluateSocialDeterminantsOfHealth({} as Bundle)).toBeUndefined();
  });
});

describe("Evaluate Patient Info: Social History", () => {
  it("should have no available data when there is no data", () => {
    const actual = evaluateSocialData(undefined as any, {
      fhirIndexByType: {},
      fhirIndexByTypeAndId: {},
    });

    expect(actual.availableData).toBeEmpty();
    expect(actual.unavailableData).not.toBeEmpty();
  });

  it("should have exposure contact when there is a exposure contact observation present", () => {
    const actual = evaluateSocialData(
      BundleWithTravelHistory,
      fhirIndexBundleWithTravelHistory,
    );

    render(actual.availableData[0].value);
    // travel purpose
    expect(screen.getByText("Wild mink (organism)"));
  });

  it("should have travel history when there is a travel history observation present", () => {
    const actual = evaluateSocialData(
      BundleWithTravelHistory,
      fhirIndexBundleWithTravelHistory,
    );

    render(actual.availableData[1].value);
    // travel purpose
    expect(screen.getByText("Active duty military (occupation)"));
  });

  describe("Evaluate Alcohol Use", () => {
    it("should return the use, intake comment", () => {
      const actual = evaluateAlcoholUse(BundlePatient);
      expect(actual).toEqual(
        "Use: Current drinker of alcohol\n" +
          "Intake (standard drinks/week): .29/d\n" +
          "Comment: 1-2 drinks 2 to 4 times a month",
      );
    });
    it("should empty string because there is no use, intake, or comment", () => {
      const actual = evaluateAlcoholUse(BundlePatientMultiple);
      expect(actual).toEqual("");
    });
  });

  it("should have patient sexual orientation when available", () => {
    const actual = evaluateSocialData(
      BundleWithSexualOrientation,
      fhirIndexBundleWithSexualOrientation,
    );

    expect(actual.availableData[0].value).toEqual("Other");
  });

  it("should format tobacco use details when available", () => {
    const actual = evaluateSocialData(
      BundleWithTobaccoUse,
      fhirIndexBundleTobaccoUse,
    );
    const tobaccoUse = actual.availableData.find(
      (data) => data.title === "Tobacco Use",
    );

    expect(tobaccoUse).toMatchSnapshot();
  });

  describe("Evaluate Occupation", () => {
    it("should return empty when no employment status or usual occupation", () => {
      const bundle: Bundle = {
        resourceType: "Bundle",
        type: "document",
        entry: [],
      };

      expect(evaluateOccupation(bundle)).toBeUndefined();
    });

    it("should return employment status when provided", () => {
      const bundle: Bundle = {
        resourceType: "Bundle",
        type: "document",
        entry: [
          {
            resource: {
              resourceType: "Observation",
              status: "final",
              code: {
                coding: [
                  {
                    code: "74165-2",
                    system: "http://loinc.org",
                  },
                ],
              },
              valueCodeableConcept: {
                text: "EmploymentStatus",
              },
            },
          },
        ],
      };

      expect(evaluateOccupation(bundle)).toEqual("Status: EmploymentStatus");
    });

    it("should return occupation when provided", () => {
      const bundle: Bundle = {
        resourceType: "Bundle",
        type: "document",
        entry: [
          {
            resource: {
              resourceType: "Observation",
              status: "final",
              meta: {
                profile: [
                  "http://hl7.org/fhir/us/odh/StructureDefinition/odh-UsualWork",
                ],
              },
              code: {
                coding: [
                  {
                    code: "21843-8",
                    system: "http://loinc.org",
                  },
                ],
              },
              valueCodeableConcept: {
                text: "Occupation",
              },
            },
          },
        ],
      };

      expect(evaluateOccupation(bundle)).toEqual("Occupation");
    });

    it("should return industry when provided", () => {
      const bundle: Bundle = {
        resourceType: "Bundle",
        type: "document",
        entry: [
          {
            resource: {
              resourceType: "Observation",
              status: "final",
              meta: {
                profile: [
                  "http://hl7.org/fhir/us/odh/StructureDefinition/odh-UsualWork",
                ],
              },
              code: {
                coding: [
                  {
                    code: "21843-8",
                    system: "http://loinc.org",
                  },
                ],
              },
              component: [
                {
                  code: {
                    coding: [{ code: "21844-6" }],
                  },
                  valueCodeableConcept: {
                    text: "i'm an industry",
                  },
                },
              ],
            },
          },
        ],
      };

      expect(evaluateOccupation(bundle)).toEqual("Industry: i'm an industry");
    });

    it("should return dates when provided", () => {
      const bundle: Bundle = {
        resourceType: "Bundle",
        type: "document",
        entry: [
          {
            resource: {
              resourceType: "Observation",
              status: "final",
              meta: {
                profile: [
                  "http://hl7.org/fhir/us/odh/StructureDefinition/odh-UsualWork",
                ],
              },
              code: {
                coding: [
                  {
                    code: "21843-8",
                    system: "http://loinc.org",
                  },
                ],
              },
              effectivePeriod: {
                start: "2020-01-04",
              },
            },
          },
        ],
      };

      expect(evaluateOccupation(bundle)).toEqual("Dates: 01/04/2020 - Present");
    });

    it("should all together now", () => {
      const bundle: Bundle = {
        resourceType: "Bundle",
        type: "document",
        entry: [
          {
            resource: {
              resourceType: "Observation",
              status: "final",
              code: {
                coding: [
                  {
                    code: "74165-2",
                    system: "http://loinc.org",
                  },
                ],
              },
              valueCodeableConcept: {
                text: "EmploymentStatus",
              },
            },
          },
          {
            resource: {
              resourceType: "Observation",
              status: "final",
              meta: {
                profile: [
                  "http://hl7.org/fhir/us/odh/StructureDefinition/odh-UsualWork",
                ],
              },
              code: {
                coding: [
                  {
                    code: "21843-8",
                    system: "http://loinc.org",
                  },
                ],
              },
              effectivePeriod: {
                start: "2020-01-04",
              },
              component: [
                {
                  code: {
                    coding: [{ code: "21844-6" }],
                  },
                  valueCodeableConcept: {
                    text: "i'm an industry",
                  },
                },
              ],
              valueCodeableConcept: {
                text: "Occupation",
              },
            },
          },
        ],
      };

      expect(evaluateOccupation(bundle)).toEqual(
        "Occupation\n\nIndustry: i'm an industry\n\nStatus: EmploymentStatus\n\nDates: 01/04/2020 - Present",
      );
    });
  });

  describe("Evaluate Occupation History", () => {
    it("should return empty when no jobs", () => {
      const bundle: Bundle = {
        resourceType: "Bundle",
        type: "document",
        entry: [],
      };

      expect(evaluateOccupationHistory(bundle)).toBeUndefined();
    });

    it("should match snapshot when all fields present", () => {
      const bundle: Bundle = {
        resourceType: "Bundle",
        type: "document",
        entry: [
          {
            resource: {
              resourceType: "Observation",
              id: "12345",
              status: "final",
              meta: {
                profile: [
                  "http://hl7.org/fhir/us/odh/StructureDefinition/odh-PastOrPresentJob",
                ],
              },
              code: {
                coding: [
                  {
                    code: "11341-5",
                    system: "http://loinc.org",
                  },
                ],
              },
              extension: [
                {
                  url: "http://hl7.org/fhir/us/odh/StructureDefinition/odh-Employer-extension",
                  valueReference: { reference: "Organization/1234" },
                },
              ],
              effectivePeriod: {
                start: "2020-01-04",
              },
              component: [
                {
                  code: {
                    coding: [
                      {
                        code: "86188-0",
                      },
                    ],
                  },
                  valueCodeableConcept: {
                    text: "~industry~",
                  },
                },
                {
                  code: {
                    coding: [
                      {
                        code: "87729-0",
                      },
                    ],
                  },
                  valueString: "~hazard~",
                },
                {
                  code: {
                    coding: [
                      {
                        code: "74159-5",
                      },
                    ],
                  },
                  valueCodeableConcept: {
                    text: "~schedule~",
                  },
                },
                {
                  code: {
                    coding: [
                      {
                        code: "87512-0",
                      },
                    ],
                  },
                  valueCodeableConcept: {
                    text: "~hours~",
                  },
                },
                {
                  code: {
                    coding: [
                      {
                        code: "74160-3",
                      },
                    ],
                  },
                  valueCodeableConcept: {
                    text: "~days~",
                  },
                },
                {
                  code: {
                    coding: [
                      {
                        code: "63761-1",
                      },
                    ],
                  },
                  valueCodeableConcept: {
                    text: "~duties~",
                  },
                },
                {
                  code: {
                    coding: [
                      {
                        code: "87707-6",
                      },
                    ],
                  },
                  valueCodeableConcept: {
                    text: "~pay grade~",
                  },
                },
                {
                  code: {
                    coding: [
                      {
                        code: "85104-8",
                      },
                    ],
                  },
                  valueCodeableConcept: {
                    text: "~employment type~",
                  },
                },
              ],
            },
          },
          {
            resource: {
              resourceType: "Organization",
              id: "1234",
              address: [
                {
                  line: ["123 test st"],
                  city: "Nowhereville",
                  state: "KS",
                },
              ],
            },
          },
        ],
      };

      expect(evaluateOccupationHistory(bundle)).toMatchSnapshot();
    });

    it("should match snapshot when no workplace info", () => {
      const bundle: Bundle = {
        resourceType: "Bundle",
        type: "document",
        entry: [
          {
            resource: {
              resourceType: "Observation",
              id: "12345",
              status: "final",
              meta: {
                profile: [
                  "http://hl7.org/fhir/us/odh/StructureDefinition/odh-PastOrPresentJob",
                ],
              },
              code: {
                coding: [
                  {
                    code: "11341-5",
                    system: "http://loinc.org",
                  },
                ],
              },
              effectivePeriod: {
                start: "2020-01-04",
              },
              component: [
                {
                  code: {
                    coding: [
                      {
                        code: "86188-0",
                      },
                    ],
                  },
                  valueCodeableConcept: {
                    text: "~industry~",
                  },
                },
                {
                  code: {
                    coding: [
                      {
                        code: "87729-0",
                      },
                    ],
                  },
                  valueString: "~hazard~",
                },
              ],
            },
          },
          {
            resource: {
              resourceType: "Organization",
              id: "1234",
              address: [
                {
                  line: ["123 test st"],
                  city: "Nowhereville",
                  state: "KS",
                },
              ],
            },
          },
        ],
      };

      expect(evaluateOccupationHistory(bundle)).toMatchSnapshot();
    });

    it("should match snapshot when partial info", () => {
      const bundle: Bundle = {
        resourceType: "Bundle",
        type: "document",
        entry: [
          {
            resource: {
              resourceType: "Observation",
              id: "12345",
              status: "final",
              meta: {
                profile: [
                  "http://hl7.org/fhir/us/odh/StructureDefinition/odh-PastOrPresentJob",
                ],
              },
              code: {
                coding: [
                  {
                    code: "11341-5",
                    system: "http://loinc.org",
                  },
                ],
              },
              effectivePeriod: {
                start: "2020-01-04",
              },
              component: [
                {
                  code: {
                    coding: [
                      {
                        code: "86188-0",
                      },
                    ],
                  },
                  valueCodeableConcept: {
                    text: "~industry~",
                  },
                },
                {
                  code: {
                    coding: [
                      {
                        code: "87707-6",
                      },
                    ],
                  },
                  valueCodeableConcept: {
                    text: "~pay grade~",
                  },
                },
                {
                  code: {
                    coding: [
                      {
                        code: "85104-8",
                      },
                    ],
                  },
                  valueCodeableConcept: {
                    text: "~employment type~",
                  },
                },
              ],
            },
          },
          {
            resource: {
              resourceType: "Organization",
              id: "1234",
              address: [
                {
                  line: ["123 test st"],
                  city: "Nowhereville",
                  state: "KS",
                },
              ],
            },
          },
        ],
      };

      expect(evaluateOccupationHistory(bundle)).toMatchSnapshot();
    });

    it("should match snapshot when multiple jobs and sort correctly", () => {
      const bundle: Bundle = {
        resourceType: "Bundle",
        type: "document",
        entry: [
          {
            resource: {
              resourceType: "Observation",
              id: "12345",
              status: "final",
              meta: {
                profile: [
                  "http://hl7.org/fhir/us/odh/StructureDefinition/odh-PastOrPresentJob",
                ],
              },
              code: {
                coding: [
                  {
                    code: "11341-5",
                    system: "http://loinc.org",
                  },
                ],
              },
              effectivePeriod: {
                start: "2018-01-04",
                end: "2022-01-04",
              },
              component: [
                {
                  code: {
                    coding: [
                      {
                        code: "86188-0",
                        system: "http://loinc.org",
                      },
                    ],
                  },
                  valueCodeableConcept: {
                    text: "~industry~",
                  },
                },
                {
                  code: {
                    coding: [
                      {
                        code: "87729-0",
                        system: "http://loinc.org",
                      },
                    ],
                  },
                  valueString: "~hazard~",
                },
              ],
            },
          },
          {
            resource: {
              resourceType: "Observation",
              id: "12346",
              status: "final",
              meta: {
                profile: [
                  "http://hl7.org/fhir/us/odh/StructureDefinition/odh-PastOrPresentJob",
                ],
              },
              code: {
                coding: [
                  {
                    code: "11341-5",
                    system: "http://loinc.org",
                  },
                ],
              },
              effectivePeriod: {
                start: "2020-01-04",
              },
              component: [
                {
                  code: {
                    coding: [
                      {
                        code: "86188-0",
                        system: "http://loinc.org",
                      },
                    ],
                  },
                  valueCodeableConcept: {
                    text: "~industry~",
                  },
                },
                {
                  code: {
                    coding: [
                      {
                        code: "87729-0",
                        system: "http://loinc.org",
                      },
                    ],
                  },
                  valueString: "~hazard~",
                },
              ],
            },
          },
          {
            resource: {
              resourceType: "Observation",
              id: "12347",
              status: "final",
              meta: {
                profile: [
                  "http://hl7.org/fhir/us/odh/StructureDefinition/odh-PastOrPresentJob",
                ],
              },
              code: {
                coding: [
                  {
                    code: "11341-5",
                    system: "http://loinc.org",
                  },
                ],
              },
              effectivePeriod: {
                start: "2015-01-04",
              },
              component: [
                {
                  code: {
                    coding: [
                      {
                        code: "86188-0",
                        system: "http://loinc.org",
                      },
                    ],
                  },
                  valueCodeableConcept: {
                    text: "~industry~",
                  },
                },
                {
                  code: {
                    coding: [
                      {
                        code: "87729-0",
                        system: "http://loinc.org",
                      },
                    ],
                  },
                  valueString: "~hazard~",
                },
              ],
            },
          },
        ],
      };

      expect(evaluateOccupationHistory(bundle)).toMatchSnapshot();
    });

    it("should match snapshot when job comes from social history Obs", () => {
      // Employment details can also come from Social History Obs
      // not just Past or Present Occupation Obs
      const bundle: Bundle = {
        resourceType: "Bundle",
        type: "document",
        entry: [
          {
            resource: {
              resourceType: "Observation",
              id: "12345",
              status: "final",
              meta: {
                profile: [
                  "http://hl7.org/fhir/StructureDefinition/Observation",
                ],
              },
              code: {
                coding: [
                  {
                    code: "364703007",
                    system: "http://snomed.info/sct",
                    display: "Employment detail",
                  },
                  {
                    code: "11295-3",
                    system: "http://loinc.org",
                    display: "Current employment - Reported",
                  },
                ],
              },
              effectiveDateTime: "2025-01-04T08:00:00Z",
              valueString: "Construction",
            },
          },
        ],
      };
      expect(evaluateOccupationHistory(bundle)).toMatchSnapshot();
    });

    it("should match snapshot when multiple jobs come from both social history and PastOrPresent Obs", () => {
      const bundle: Bundle = {
        resourceType: "Bundle",
        type: "document",
        entry: [
          {
            resource: {
              resourceType: "Observation",
              id: "12345",
              status: "final",
              meta: {
                profile: [
                  "http://hl7.org/fhir/StructureDefinition/Observation",
                ],
              },
              code: {
                coding: [
                  {
                    code: "364703007",
                    system: "http://snomed.info/sct",
                    display: "Employment detail",
                  },
                  {
                    code: "11295-3",
                    system: "http://loinc.org",
                    display: "Current employment - Reported",
                  },
                ],
              },
              effectivePeriod: {
                start: "2018-01-04",
              },
              valueString: "Construction",
            },
          },
          {
            resource: {
              resourceType: "Observation",
              id: "12345-2",
              status: "final",
              meta: {
                profile: [
                  "http://hl7.org/fhir/us/odh/StructureDefinition/odh-PastOrPresentJob",
                ],
              },
              code: {
                coding: [
                  {
                    code: "11341-5",
                    system: "http://loinc.org",
                  },
                ],
              },
              extension: [
                {
                  url: "http://hl7.org/fhir/us/odh/StructureDefinition/odh-Employer-extension",
                  valueReference: { reference: "Organization/1234" },
                },
              ],
              effectivePeriod: {
                start: "2020-01-04",
              },
              valueCodeableConcept: {
                coding: [
                  {
                    code: "3600",
                    system: "urn:oid:2.16.840.1.113883.6.240",
                    display: "Nursing, psychiatric, and home health aides",
                  },
                ],
              },
            },
          },
          {
            resource: {
              resourceType: "Organization",
              id: "1234",
              address: [
                {
                  line: ["123 test st"],
                  city: "Nowhereville",
                  state: "KS",
                },
              ],
            },
          },
        ],
      };
      expect(evaluateOccupationHistory(bundle)).toMatchSnapshot();
    });
  });

  it("should return religion if available", () => {
    const actual = evaluateSocialData(BundlePatient, fhirIndexBundlePatient);
    const ext = actual.availableData.filter(
      (d) => d.title === "Religious Affiliation",
    );
    expect(ext).toHaveLength(1);
    expect(ext[0].value).toEqual("Baptist");
  });

  it("should return marital status if available", () => {
    const actual = evaluateSocialData(BundlePatient, fhirIndexBundlePatient);
    const ext = actual.availableData.filter(
      (d) => d.title === "Marital Status",
    );
    expect(ext).toHaveLength(1);
    expect(ext[0].value).toEqual("Married");
  });
});
