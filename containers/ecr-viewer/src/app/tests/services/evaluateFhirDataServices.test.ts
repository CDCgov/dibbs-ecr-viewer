import { Bundle } from "fhir/r4";

import BundleEcrMetadata from "../../../../../../test-data/fhir/BundleEcrMetadata.json";
import * as _BundleWithPatient from "../../../../../../test-data/fhir/BundlePatient.json";
import * as _BundleWithDeceasedPatient from "../../../../../../test-data/fhir/BundlePatientDeceased.json";
import BundlePatientMultiple from "../../../../../../test-data/fhir/BundlePatientMultiple.json";
import * as _BundlePatientWithCovid from "../../../../../../test-data/fhir/BundlePatientWithCovid.json";
import BundlePractitionerRole from "../../../../../../test-data/fhir/BundlePractitionerRole.json";
import {
  evaluateEncounterId,
  evaluateFacilityId,
  evaluatePatientRace,
  evaluatePatientEthnicity,
  evaluatePractitionerRoleReference,
  evaluatePatientAddress,
  evaluatePatientName,
  evaluateDemographicsData,
  evaluateEncounterCareTeamTable,
  evaluateAlcoholUse,
  evaluatePatientLanguage,
  evaluatePatientVitalStatus,
  censorGender,
  calculatePatientAge,
  createPatientAgeDataProp,
  evaluateOccupation,
  evaluateOccupationHistory,
  evaluateHospitalEncounterData,
} from "@/app/services/evaluateFhirDataService";
import { formatAge } from "@/app/services/formatService";
import { evaluateValue } from "@/app/utils/evaluate";
import mappings from "@/app/utils/evaluate/fhir-paths";

const BundleWithPatient = _BundleWithPatient as Bundle;
const BundleWithDeceasedPatient = _BundleWithDeceasedPatient as Bundle;
const BundlePatientWithCovid = _BundlePatientWithCovid as Bundle;

describe("evaluateFhirDataServices tests", () => {
  describe("Evaluate Identifier", () => {
    it("should return the Identifier value", () => {
      const actual = evaluateValue(BundleWithPatient, mappings.patientIds);

      expect(actual).toEqual("1234567890");
    });
  });

  describe("Evaluate Patient Race", () => {
    it("should return race category and extension if available", () => {
      const actual = evaluatePatientRace(BundleWithPatient);
      expect(actual).toEqual("Black or African American\nAfrican");
    });
  });

  describe("Evaluate Patient Ethnicity", () => {
    it("should return ethnicity category and extension if available", () => {
      const actual = evaluatePatientEthnicity(BundleWithPatient);
      expect(actual).toEqual("Hispanic or Latino\nWhite");
    });
  });

  it("should return tribal affiliation if available", () => {
    const actual = evaluateDemographicsData(BundleWithPatient);
    const ext = actual.availableData.filter(
      (d) => d.title === "Tribal Affiliation",
    );
    expect(ext).toHaveLength(1);
    expect(ext[0].value).toEqual(
      "Fort Mojave Indian Tribe of Arizona, California",
    );
  });

  it("should return parent/guardian if available", () => {
    const actual = evaluateDemographicsData(BundleWithPatient);
    const ext = actual.availableData.filter(
      (d) => d.title === "Parent/Guardian",
    );
    expect(ext).toHaveLength(1);
    expect(ext[0].value).toEqual(
      `Grandparent
Luthen Rael
Home:
1357 Galactic Drive
Sometown, OR
94949, US

Work:
123 Galactic Drive
Sometown, OR
94949, US
Home: 123-456-6909`,
    );
  });

  describe("Evaluate Facility Id", () => {
    it("should return the facility id", () => {
      const actual = evaluateFacilityId(BundleEcrMetadata as unknown as Bundle);

      expect(actual).toEqual("112233445566778899");
    });
  });

  describe("Evaluate Encounter ID", () => {
    it("should return the correct Encounter ID", () => {
      const actual = evaluateEncounterId(
        BundleEcrMetadata as unknown as Bundle,
      );

      expect(actual).toEqual("123456789");
    });
  });

  describe("Evaluate Encounter Care Team", () => {
    it("should return the correct Encounter care team", () => {
      const actual = evaluateEncounterCareTeamTable(
        BundleEcrMetadata as unknown as Bundle,
      );

      expect(actual).toMatchSnapshot();
    });
  });

  describe("Evaluate PractitionerRoleReference", () => {
    it("should return the organization and practitioner when practitioner role is found ", () => {
      const actual = evaluatePractitionerRoleReference(
        BundlePractitionerRole as unknown as Bundle,
        "PractitionerRole/b18c20c1-123b-fd12-71cf-9dd0abae8ced",
      );

      expect(actual.organization).toEqual({
        id: "d319a926-0eb3-5847-3b21-db8b778b4f07",
        name: "Mos Eisley Medical Center",
        resourceType: "Organization",
      });

      expect(actual.practitioner).toEqual({
        id: "550b9626-bc9e-7d6b-c5d8-e41c2000ab85",
        name: [
          {
            family: "Interface",
          },
        ],
        resourceType: "Practitioner",
      });
    });
    it("should return undefined organization and practitioner when practitioner role is not found", () => {
      const actual = evaluatePractitionerRoleReference(
        BundlePractitionerRole as unknown as Bundle,
        "unknown",
      );

      expect(actual.organization).toBeUndefined();

      expect(actual.practitioner).toBeUndefined();
    });
  });

  describe("Evaluate Patient Address", () => {
    it("should return the 1 address", () => {
      const actual = evaluatePatientAddress(BundleWithPatient);
      expect(actual).toEqual("1 Main St\nCloud City, CA\n00000, US");
    });
    it("should return all 3 of the addresses", () => {
      const actual = evaluatePatientAddress(
        BundlePatientMultiple as unknown as Bundle,
      );
      expect(actual).toEqual(
        "Home:\n" +
          "1 Mos Espa\n" +
          "Tatooine, CA\n" +
          "93523-2800, US\n" +
          "\n" +
          "Vacation:\n" +
          "10 Canyon Valley\n" +
          "Ben's Mesa, TN\n" +
          "00047, America\n" +
          "\n" +
          "Work:\n" +
          "1 Main St\n" +
          "Death Star, AZ\n" +
          "00001, USA",
      );
    });
  });

  describe("Evaluate Patient Name", () => {
    it("should return the 1 name", () => {
      const actual = evaluatePatientName(BundleWithPatient, false);
      expect(actual).toEqual("Han Solo");
    });
    it("should return all 2 of the names", () => {
      const actual = evaluatePatientName(
        BundlePatientMultiple as unknown as Bundle,
        false,
      );
      expect(actual).toEqual(
        "Official: Anakin Skywalker\n" + "Nickname: Darth Vader",
      );
    });
    it("should only return the official name for the banner", () => {
      const actual = evaluatePatientName(
        BundlePatientMultiple as unknown as Bundle,
        true,
      );
      expect(actual).toEqual("Anakin Skywalker");
    });
    it("should only return the official name for the banner", () => {
      const actual = evaluatePatientName(BundleWithPatient, true);
      expect(actual).toEqual("Han Solo");
    });
  });

  describe("Evaluate Alcohol Use", () => {
    it("should return the use, intake comment", () => {
      const actual = evaluateAlcoholUse(BundleWithPatient);
      expect(actual).toEqual(
        "Use: Current drinker of alcohol (finding)\n" +
          "Intake (standard drinks/week): .29/d\n" +
          "Comment: 1-2 drinks 2 to 4 times a month",
      );
    });
    it("should empty string because there is no use, intake, or comment", () => {
      const actual = evaluateAlcoholUse(
        BundlePatientMultiple as unknown as Bundle,
      );
      expect(actual).toEqual("");
    });
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

  describe("Evaluate Hospital Encounter Data", () => {
    const admissionDiagnosis = {
      id: "3b7a0c34-1be8-2d5a-6acd-c7b633e496c5",
      title: "HOSPITAL ADMISSION DIAGNOSIS",
      text: {
        status: "generated",
        div: "Covid19",
      },
      code: {
        coding: [
          {
            code: "46241-6",
            system: "http://loinc.org",
            display: "Hospital Admission Diagnosis",
          },
        ],
      },
      mode: "snapshot",
      entry: [
        {
          display:
            "Problem - Disease caused by severe acute respiratory syndrome coronavirus 2 (disorder)",
          reference: "Condition/d42c4a1f-f700-61bf-62a0-c034257d6a79",
        },
      ],
    };

    const dischargeDiagnosis = {
      id: "e9c9e752-dfae-c13d-a4c0-64cef027435f",
      title: "Discharge Diagnosis",
      text: {
        status: "generated",
        div: "Diverticula of intestine",
      },
      code: {
        coding: [
          {
            code: "11535-2",
            system: "http://loinc.org",
            display: "Hospital Discharge Diagnosis",
          },
        ],
      },
      mode: "snapshot",
      entry: [
        {
          display:
            "Problem - Disease caused by severe acute respiratory syndrome coronavirus 2 (disorder)",
          reference: "Condition/d42c4a1f-f700-61bf-62a0-c034257d6a79",
        },
      ],
    };

    const addSectionsToBundle = (
      newSections: object[],
      bundle: Bundle,
    ): Bundle => {
      return {
        ...bundle,
        entry: [
          {
            ...bundle.entry![0],
            // @ts-ignore
            resource: {
              ...bundle.entry![0].resource,
              section: [
                ...(bundle.entry![0].resource?.section || []),
                ...newSections,
              ],
            },
          },
          ...bundle.entry!.slice(1),
        ],
      };
    };

    it("should return unavailable data when no Admission Diagnosis or Discharge diagnosis are found", () => {
      const bundle: Bundle = {
        resourceType: "Bundle",
        type: "document",
        entry: [],
      };

      expect(evaluateHospitalEncounterData(bundle)).toEqual({
        availableData: [],
        unavailableData: [
          {
            table: true,
            title: "Hospital Admission Diagnosis",
            value: undefined,
          },
          {
            table: true,
            title: "Hospital Discharge Diagnosis",
            value: undefined,
          },
        ],
      });
    });

    it("should return Hospital Encounter Data when present and match snapshot", () => {
      // Create a bundle with Admission and Discharge Dx
      const bundleWithHospitalEncounterData = addSectionsToBundle(
        [admissionDiagnosis, dischargeDiagnosis],
        BundlePatientWithCovid,
      );

      const actual = evaluateHospitalEncounterData(
        bundleWithHospitalEncounterData,
      );

      expect(actual).toMatchSnapshot();
      expect(actual.availableData[0].title).toEqual(
        "Hospital Admission Diagnosis",
      );
      expect(actual.availableData[1].title).toEqual(
        "Hospital Discharge Diagnosis",
      );
      expect(actual.unavailableData.length).toEqual(0);
    });

    it("A bundle with only Admission Diagnosis returns that data and matches snapshot", () => {
      const bundleWithAdmissionDxDataOnly = addSectionsToBundle(
        [admissionDiagnosis],
        BundlePatientWithCovid,
      );

      const actual = evaluateHospitalEncounterData(
        bundleWithAdmissionDxDataOnly,
      );

      expect(actual).toMatchSnapshot();
      expect(actual.availableData[0].title).toEqual(
        "Hospital Admission Diagnosis",
      );
      expect(actual.unavailableData[0].title).toEqual(
        "Hospital Discharge Diagnosis",
      );
    });

    it("A bundle with only Discharge Diagnosis returns that data and matches snapshot", () => {
      const bundleWithDischargeDxOnly = addSectionsToBundle(
        [dischargeDiagnosis],
        BundlePatientWithCovid,
      );

      const actual = evaluateHospitalEncounterData(bundleWithDischargeDxOnly);

      expect(actual).toMatchSnapshot();
      expect(actual.availableData[0].title).toEqual(
        "Hospital Discharge Diagnosis",
      );
      expect(actual.unavailableData[0].title).toEqual(
        "Hospital Admission Diagnosis",
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
        ],
      };

      expect(evaluateOccupationHistory(bundle)).toMatchSnapshot();
    });
  });

  describe("Evaluate Patient Vital Status", () => {
    function getPatientBundle(deceased: boolean) {
      return {
        resourceType: "Bundle",
        entry: [
          {
            resource: {
              resourceType: "Patient",
              deceasedBoolean: deceased,
            },
          },
        ],
      };
    }

    it("should return an empty string when no `deceasedBoolean` value is present", () => {
      const actual = evaluatePatientVitalStatus(BundleWithPatient);
      expect(actual).toEqual("");
    });

    it("should return `Alive` when `deceasedBoolean` is `false`", () => {
      const actual = evaluatePatientVitalStatus(
        getPatientBundle(false) as unknown as Bundle,
      );
      expect(actual).toEqual("Alive");
    });

    it("should return `Deceased` when `deceasedBoolean` is `true`", () => {
      const actual = evaluatePatientVitalStatus(
        getPatientBundle(true) as unknown as Bundle,
      );
      expect(actual).toEqual("Deceased");
    });
  });

  describe("Evaluate Patient language", () => {
    it("Should display language, proficiency, and mode", () => {
      const actual = evaluatePatientLanguage(BundleWithPatient);

      expect(actual).toEqual("English\nGood\nExpressed spoken");
    });

    it("Should only display preferred languages", () => {
      const patient = {
        resourceType: "Bundle",
        entry: [
          {
            resource: {
              resourceType: "Patient",
              communication: [
                {
                  language: {
                    coding: [
                      {
                        system: "urn:ietf:bcp:47",
                        code: "es",
                        display: "Spanish",
                      },
                    ],
                  },
                },
                {
                  preferred: true,
                  language: {
                    coding: [
                      {
                        system: "urn:ietf:bcp:47",
                        code: "en",
                        display: "English",
                      },
                    ],
                  },
                },
                {
                  preferred: true,
                  language: {
                    coding: [
                      {
                        system: "urn:ietf:bcp:47",
                        code: "hi",
                        display: "Hindi",
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      };

      const actual = evaluatePatientLanguage(patient as unknown as Bundle);

      expect(actual).toEqual("English\n\nHindi");
    });
    it("Should display language when there are no preferred languages", () => {
      const patient = {
        resourceType: "Bundle",
        entry: [
          {
            resource: {
              resourceType: "Patient",
              communication: [
                {
                  language: {
                    coding: [
                      {
                        system: "urn:ietf:bcp:47",
                        code: "es",
                        display: "Spanish",
                      },
                    ],
                  },
                },
                {
                  language: {
                    coding: [
                      {
                        system: "urn:ietf:bcp:47",
                        code: "en",
                        display: "English",
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      };

      const actual = evaluatePatientLanguage(patient as unknown as Bundle);

      expect(actual).toEqual("Spanish\n\nEnglish");
    });
  });

  describe("Censor Gender", () => {
    it("should return the string if 'Male' or 'Female'", () => {
      const expected = "Male";
      const actual = censorGender(expected);
      expect(actual).toEqual(expected);
    });

    it("should return an empty string if 'Other'", () => {
      const expected = "Other";
      const actual = censorGender(expected);
      expect(actual).toEqual("");
    });
  });

  describe("Calculate Patient Age", () => {
    it("when no date is given, should return patient age when DOB is available", () => {
      // Fixed "today" for testing purposes
      jest.useFakeTimers().setSystemTime(new Date("2024-03-12"));

      const patientAge = calculatePatientAge(BundleWithPatient);

      expect(patientAge).toEqual({ years: 146, months: 9, days: 16 });

      // Return to real time
      jest.useRealTimers();
    });

    it("should return nothing when DOB is unavailable", () => {
      const patientAge = calculatePatientAge(undefined as any);

      expect(patientAge).toEqual(undefined);
    });

    it("when date is given, should return age at given date", () => {
      const givenDate = "2020-01-01";

      const patientAge = calculatePatientAge(BundleWithPatient, givenDate);

      expect(patientAge).toEqual({ years: 142, months: 7, days: 7 });
    });

    it("should return a value that can display only in days", () => {
      const patientAge = calculatePatientAge(BundleWithPatient, "1877-05-30");

      const formattedPatientAge = formatAge(patientAge);

      expect(formattedPatientAge).toEqual("5 days");
    });
  });

  describe("Create Patient Age Data Prop", () => {
    it("should return Age at Death if there is a date of death", () => {
      const patientAgeProp = createPatientAgeDataProp(
        BundleWithDeceasedPatient,
      );
      expect(patientAgeProp).toEqual({
        title: "Age at Death",
        value: "4 years",
        toolTip: undefined,
      });
      expect;
    });

    it("should return the patient age at the encounter start date", () => {
      const patientBundleWithEncounter: Bundle = {
        resourceType: "Bundle",
        type: "batch",
        entry: [
          ...BundleWithPatient.entry!,
          {
            resource: {
              class: {
                code: "testValue",
              },
              status: "unknown",
              resourceType: "Encounter",
              id: "123456789",
              period: {
                start: "1924-03-01",
                end: "1924-03-12",
              },
            },
          },
        ],
      };

      const patientAgeProp = createPatientAgeDataProp(
        patientBundleWithEncounter,
      );

      expect(patientAgeProp).toEqual({
        title: "Age at Encounter",
        value: "46 years",
      });
    });

    it("should use the encounter end date if the start date does not exist and the end date is in the past.", () => {
      const patientBundleWithEncounter: Bundle = {
        resourceType: "Bundle",
        type: "batch",
        entry: [
          ...BundleWithPatient.entry!,
          {
            resource: {
              class: {
                code: "testValue",
              },
              status: "unknown",
              resourceType: "Encounter",
              id: "123456789",
              period: {
                end: "1920-03-12",
              },
            },
          },
        ],
      };

      const patientAgeProp = createPatientAgeDataProp(
        patientBundleWithEncounter,
      );

      expect(patientAgeProp).toEqual({
        title: "Age at Encounter",
        value: "42 years",
        toolTip:
          "Age at end date of encounter. Start date of encounter is not available.",
      });
    });

    it("should use the eCR created date if the start date does not exist and the end date is in the future.", () => {
      const patientBundleWithEncounter: Bundle = {
        resourceType: "Bundle",
        type: "batch",
        entry: [
          ...BundleWithPatient.entry!,
          {
            resource: {
              resourceType: "Composition",
              author: [{}],
              date: "1924-03-12",
              status: "final",
              title: "test",
              type: {},
            },
          },
          {
            resource: {
              class: {
                code: "testValue",
              },
              status: "unknown",
              resourceType: "Encounter",
              id: "123456789",
              period: {
                end: "2999-03-12",
              },
            },
          },
        ],
      };

      const patientAgeProp = createPatientAgeDataProp(
        patientBundleWithEncounter,
      );

      expect(patientAgeProp).toEqual({
        title: "Age at Encounter",
        value: "46 years",
        toolTip:
          "Using the date eCR was created as a proxy for date of encounter. No encounter start date and encounter end date is in the future.",
      });
    });

    it("should use the eCR created date if there is no encounter date.", () => {
      const patientBundleWithCreatedDate: Bundle = {
        resourceType: "Bundle",
        type: "batch",
        entry: [
          ...BundleWithPatient.entry!,
          {
            resource: {
              resourceType: "Composition",
              author: [{}],
              date: "1924-03-12",
              status: "final",
              title: "test",
              type: {},
            },
          },
        ],
      };
      const patientAgeProp = createPatientAgeDataProp(
        patientBundleWithCreatedDate,
      );

      expect(patientAgeProp).toEqual({
        title: "Age at Encounter",
        value: "46 years",
        toolTip:
          "Using the date eCR was created as a proxy for date of encounter. No encounter date available.",
      });
    });
  });
});
