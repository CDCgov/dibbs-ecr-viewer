import { render, screen } from "@testing-library/react";
import { Bundle, BundleEntry, Encounter, Practitioner } from "fhir/r4";

import * as _BundleAdmissionMedications from "@/../../../test-data/fhir/BundleAdmissionMedications.json";
import BundleEcrMetadata from "@/../../../test-data/fhir/BundleEcrMetadata.json";
import * as _BundleWithPatient from "@/../../../test-data/fhir/BundlePatient.json";
import * as _BundleWithDeceasedPatient from "@/../../../test-data/fhir/BundlePatientDeceased.json";
import BundlePatientMultiple from "@/../../../test-data/fhir/BundlePatientMultiple.json";
import * as _BundlePatientWithCovid from "@/../../../test-data/fhir/BundlePatientWithCovid.json";
import BundlePractitionerRole from "@/../../../test-data/fhir/BundlePractitionerRole.json";
import BundleWithSexualOrientation from "@/../../../test-data/fhir/BundleSexualOrientation.json";
import BundleWithTravelHistory from "@/../../../test-data/fhir/BundleTravelHistory.json";
import { formatAge } from "@/app/services/formatService";
import { evaluateValue } from "@/app/utils/evaluate";
import mappings from "@/app/utils/evaluate/fhir-paths";
import PregnancyInfo from "@/app/view-data/components/PregnancyInfo";
import {
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
  evaluateProviderData,
  evaluatePregnancyData,
  evaluateSocialData,
  getLocationName,
} from "@/app/view-data/services/evaluateFhirDataService";

const BundleWithPatient = _BundleWithPatient as Bundle;
const BundleWithAdmissionMedications = _BundleAdmissionMedications as Bundle;
const BundleWithDeceasedPatient = _BundleWithDeceasedPatient as Bundle;
const BundlePatientWithCovid = _BundlePatientWithCovid as Bundle;

describe("evaluateFhirDataServices tests", () => {
  describe("Evaluate Identifier", () => {
    it("should return the Identifier value", () => {
      const actual = evaluateValue(BundleWithPatient, mappings.patientIds);

      expect(actual).toEqual("1234567890");
    });
  });

  describe("Evaluate Patient Name", () => {
    it("should return name", () => {
      const actual = evaluatePatientName(
        BundleWithPatient as unknown as Bundle,
        false,
      );
      expect(actual).toEqual("Han Solo");
    });
  });

  describe("Extract Patient Address", () => {
    it("should return empty string if no address is available", () => {
      const actual = evaluatePatientAddress(undefined as any);

      expect(actual).toBeEmpty();
    });

    it("should get patient address", () => {
      const actual = evaluatePatientAddress(
        BundleWithPatient as unknown as Bundle,
      );

      expect(actual).toEqual("1 Main St\nCloud City, CA 00000\nUS");
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
Sometown, OR 94949
US

Work:
123 Galactic Drive
Sometown, OR 94949
US
Home: 123-456-6909`,
    );
  });

  describe("Evaluate Encounter Care Team", () => {
    it("should return the correct Encounter care team", () => {
      const actual = evaluateEncounterCareTeamTable(
        BundleEcrMetadata as unknown as Bundle,
      );

      expect(actual).toMatchSnapshot();
    });
  });

  describe("evaluateProviderData", () => {
    it("should return the responsible party", () => {
      const actual = evaluateProviderData(BundlePatientWithCovid);
      expect(actual.availableData[0].value).toStrictEqual(
        "Dr. Royce Hemlock MD, GCS",
      );
    });
    it("should return unavailable if no responsible party", () => {
      const practitionerUrl = "urn:uuid:bfac23db-1743-b679-f23e-0fe21c335c9b";
      const practitioner = BundlePatientWithCovid?.entry?.find(
        (e) => e.fullUrl === practitionerUrl,
      ) as BundleEntry<Practitioner>;
      const bundle: Bundle = {
        ...BundlePatientWithCovid,
        entry: [
          ...(BundlePatientWithCovid?.entry?.filter(
            (e) => e.fullUrl !== practitionerUrl,
          ) || []),
          {
            ...practitioner,
            resource: {
              ...practitioner.resource!,
              extension: undefined,
            },
          },
        ],
      };
      const actual = evaluateProviderData(bundle);
      expect(actual.availableData).toBeEmpty();
      expect(actual.unavailableData).toBeArrayOfSize(6);
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
      expect(actual).toEqual("1 Main St\nCloud City, CA 00000\nUS");
    });
    it("should return all 3 of the addresses", () => {
      const actual = evaluatePatientAddress(
        BundlePatientMultiple as unknown as Bundle,
      );
      expect(actual).toEqual(
        "Home:\n" +
          "1 Mos Espa\n" +
          "Tatooine, CA 93523-2800\n" +
          "US\n" +
          "\n" +
          "Vacation:\n" +
          "10 Canyon Valley\n" +
          "Ben's Mesa, TN 00047\n" +
          "America\n" +
          "\n" +
          "Work:\n" +
          "1 Main St\n" +
          "Death Star, AZ 00001\n" +
          "USA",
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
        div: "Covid19",
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
                //@ts-expect-error
                ...(bundle.entry![0].resource?.section || []),
                ...newSections,
              ],
            },
          },
          ...bundle.entry!.slice(1),
        ],
      };
    };

    it("should return unavailable data when no Admission Diagnosis, Admission Medication, or Discharge diagnosis are found", () => {
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
            title: "Admission Medications",
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

    it("should return Hospital Encounter Data for Admission and Discharge Diagnosis when present and match snapshot", () => {
      // Create a bundle with Admission and Discharge Dx
      const bundleWithHospitalEncounterData = addSectionsToBundle(
        [admissionDiagnosis, dischargeDiagnosis],
        BundlePatientWithCovid,
      );

      const actual = evaluateHospitalEncounterData(
        bundleWithHospitalEncounterData,
      );

      expect(actual).toMatchSnapshot();

      expect(actual.availableData.length).toEqual(2);

      // This unavailable data is for the Admission Medication, tested elsewhere
      expect(actual.unavailableData.length).toEqual(1);

      render(
        <>
          {actual.availableData[0].value}
          {actual.availableData[1].value}
        </>,
      );

      const tables = screen.getAllByRole("table");
      expect(tables.length).toEqual(2);

      const problems = screen.getAllByText(
        "Disease caused by severe acute respiratory syndrome coronavirus 2 (disorder)",
      );
      expect(problems.length).toEqual(2);

      const times = screen.getAllByText("02/05/2025");
      expect(times.length).toEqual(2);

      expect(
        screen.queryByText("Hospital Admission Diagnosis"),
      ).toBeInTheDocument();
      expect(
        screen.queryByText("Hospital Discharge Diagnosis"),
      ).toBeInTheDocument();
    });

    it("A bundle with only Admission Diagnosis returns that data and matches snapshot", () => {
      const bundleWithAdmissionDxDataOnly = addSectionsToBundle(
        [admissionDiagnosis],
        BundlePatientWithCovid,
      );

      const actual = evaluateHospitalEncounterData(
        bundleWithAdmissionDxDataOnly,
      );

      expect(actual.availableData.length).toEqual(1);
      expect(actual.unavailableData.length).toEqual(2);

      render(actual.availableData[0].value);
      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Disease caused by severe acute respiratory syndrome coronavirus 2 (disorder)",
        ),
      ).toBeInTheDocument();
      expect(screen.getByText("02/05/2025")).toBeInTheDocument();
      expect(
        screen.queryByText("Hospital Admission Diagnosis"),
      ).toBeInTheDocument();
      expect(
        screen.queryByText("Hospital Discharge Diagnosis"),
      ).not.toBeInTheDocument();
    });

    it("A bundle with only Discharge Diagnosis returns that data and matches snapshot", () => {
      const bundleWithDischargeDxOnly = addSectionsToBundle(
        [dischargeDiagnosis],
        BundlePatientWithCovid,
      );

      const actual = evaluateHospitalEncounterData(bundleWithDischargeDxOnly);

      expect(actual).toMatchSnapshot();

      expect(actual.availableData.length).toEqual(1);
      expect(actual.unavailableData.length).toEqual(2);

      render(actual.availableData[0].value);
      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Disease caused by severe acute respiratory syndrome coronavirus 2 (disorder)",
        ),
      ).toBeInTheDocument();
      expect(screen.getByText("02/05/2025")).toBeInTheDocument();
      expect(
        screen.queryByText("Hospital Discharge Diagnosis"),
      ).toBeInTheDocument();
      expect(
        screen.queryByText("Hospital Admission Diagnosis"),
      ).not.toBeInTheDocument();
    });

    it("should return Admission Medication data when present and match snapshot", () => {
      const actual = evaluateHospitalEncounterData(
        BundleWithAdmissionMedications,
      );

      expect(actual).toMatchSnapshot();

      expect(actual.availableData.length).toEqual(1);

      // This unavailable data is for the Admission and Discharge Diagnoses
      expect(actual.unavailableData.length).toEqual(2);

      render(<>{actual.availableData[0].value}</>);

      const tables = screen.getAllByRole("table");
      expect(tables.length).toEqual(1);

      expect(
        screen.getByText("Acetaminophen 500 MG Oral Tablet"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Ibuprofen 200 MG Oral Tablet"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Atenolol 25 MG Oral Tablet"),
      ).toBeInTheDocument();

      const nauseaReaction = screen.getAllByText("Nausea");
      expect(nauseaReaction.length).toEqual(2);

      const multipleReactions = screen.getAllByText(
        /Nausea\s+Super sick\s+Headache/,
      );
      expect(multipleReactions).toHaveLength(1);

      const authors = screen.getAllByText("Nurse Nightingale RN");
      expect(authors.length).toEqual(2);

      const times = screen.getAllByText("03/18/2012");
      expect(times.length).toEqual(3);

      expect(screen.queryByText("Admission Medications")).toBeInTheDocument();
      expect(
        screen.queryByText("Hospital Discharge Diagnosis"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText("Hospital Admission Diagnosis"),
      ).not.toBeInTheDocument();
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
              resourceType: "Composition",
              author: [],
              date: "1924-03-01",
              status: "preliminary",
              title: "Test eICR",
              type: {},
              encounter: {
                reference: "Encounter/123456789",
              },
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
              resourceType: "Composition",
              author: [],
              date: "1924-03-01",
              status: "preliminary",
              title: "Test eICR",
              type: {},
              encounter: {
                reference: "Encounter/123456789",
              },
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
        type: "document",
        timestamp: "1924-03-12T09:00:00-05:00",
        id: "99999999-4p89-4b96-b6ab-c46406839cea",
        entry: [
          ...BundleWithPatient.entry!,
          {
            resource: {
              resourceType: "Composition",
              author: [],
              date: "1924-03-01",
              status: "preliminary",
              title: "Test eICR",
              type: {},
              encounter: {
                reference: "Encounter/123456789",
              },
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
        type: "document",
        timestamp: "1924-03-12T09:00:00-05:00",
        id: "99999999-4p89-4b96-b6ab-c46406839cea",
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

  describe("Evaluate pregnancy data", () => {
    it("should have no available data when there is no data", () => {
      const actual = evaluatePregnancyData(undefined as any);

      expect(actual.availableData).toBeEmpty();
      expect(actual.unavailableData).not.toBeEmpty();
    });

    it("should have last menstrual period data when it exists", () => {
      const pregnancyBundle: Bundle = {
        resourceType: "Bundle",
        type: "batch",
        entry: [
          {
            resource: {
              resourceType: "Observation",
              id: "test_obs",
              status: "final",
              code: {
                coding: [
                  {
                    code: "8665-2",
                    system: "http://loinc.org",
                    display: "Last menstrual period start date",
                  },
                ],
              },
              effectiveDateTime: "2020-01-05T10:15:00",
              valueDateTime: "2020-01-01",
            },
          },
        ],
      };
      const actual = evaluatePregnancyData(pregnancyBundle);
      render(<PregnancyInfo pregnancyData={actual.availableData} />);
      expect(screen.getByText("Last Menstrual Period")).toBeVisible();
      expect(screen.getByText("01/01/2020")).toBeVisible();
    });

    it("should have pregnancy status data when it exists", () => {
      const pregnancyBundle: Bundle = {
        resourceType: "Bundle",
        type: "batch",
        entry: [
          {
            resource: {
              resourceType: "Observation",
              meta: {
                profile: [
                  "http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-pregnancy-status-observation",
                ],
                source: "ecr",
              },
              status: "final",
              code: {
                coding: [
                  {
                    code: "82810-3",
                    system: "http://loinc.org",
                  },
                ],
              },
              valueCodeableConcept: {
                coding: [
                  {
                    code: "77386006",
                    system: "http://snomed.info/sct",
                  },
                ],
              },
              effectivePeriod: {
                start: "2017-08-26",
              },
            },
          },
        ],
      };
      const actual = evaluatePregnancyData(pregnancyBundle);
      render(actual.availableData[0].value);
      expect(screen.getAllByText("Pregnancy Status").length).toEqual(1);
    });

    it("should have postpartum status data when it exists", () => {
      const pregnancyBundle: Bundle = {
        resourceType: "Bundle",
        type: "batch",
        entry: [
          {
            resource: {
              resourceType: "Observation",
              status: "final",
              code: {
                coding: [
                  {
                    code: "249197004",
                    system: "http://snomed.info/sct",
                  },
                ],
              },
              effectiveDateTime: "2020-01-05T10:15:00",
            },
          },
        ],
      };
      const actual = evaluatePregnancyData(pregnancyBundle);
      render(<PregnancyInfo pregnancyData={actual.availableData} />);
      expect(screen.getAllByText("Postpartum Status").length).toEqual(1);
    });
  });

  describe("Evaluate Social Data", () => {
    it("should have no available data when there is no data", () => {
      const actual = evaluateSocialData(undefined as any);

      expect(actual.availableData).toBeEmpty();
      expect(actual.unavailableData).not.toBeEmpty();
    });

    it("should have exposure contact when there is a exposure contact observation present", () => {
      const actual = evaluateSocialData(
        BundleWithTravelHistory as unknown as Bundle,
      );

      render(actual.availableData[0].value);
      // travel purpose
      expect(screen.getByText("Wild mink (organism)"));
    });

    it("should have travel history when there is a travel history observation present", () => {
      const actual = evaluateSocialData(
        BundleWithTravelHistory as unknown as Bundle,
      );

      render(actual.availableData[1].value);
      // travel purpose
      expect(screen.getByText("Active duty military (occupation)"));
    });

    it("should have patient sexual orientation when available", () => {
      const actual = evaluateSocialData(
        BundleWithSexualOrientation as unknown as Bundle,
      );

      expect(actual.availableData[0].value).toEqual("Other");
    });

    it("should return religion if available", () => {
      const actual = evaluateSocialData(BundleWithPatient as unknown as Bundle);
      const ext = actual.availableData.filter(
        (d) => d.title === "Religious Affiliation",
      );
      expect(ext).toHaveLength(1);
      expect(ext[0].value).toEqual("Baptist");
    });

    it("should return marital status if available", () => {
      const actual = evaluateSocialData(BundleWithPatient as unknown as Bundle);
      const ext = actual.availableData.filter(
        (d) => d.title === "Marital Status",
      );
      expect(ext).toHaveLength(1);
      expect(ext[0].value).toEqual("Married");
    });
  });

  describe("getLocationName", () => {
    it("should return the reference's display if available", () => {
      const expected = "Location Name";
      const encounter: Encounter = {
        resourceType: "Encounter",
        class: {},
        status: "arrived",
        location: [
          {
            location: {
              display: expected,
            },
          },
        ],
      };
      const bundle: Bundle = {
        resourceType: "Bundle",
        type: "document",
        entry: [encounter],
      };

      const actual = getLocationName(bundle, encounter);

      expect(actual).toBe(expected);
    });

    it("should return the locations name if there is not a reference display", () => {
      const expected = "Location Name";
      const encounter: Encounter = {
        resourceType: "Encounter",
        id: "3a1cb409-6f94-0231-86d6-FAKE1ecc5fda",
        identifier: [
          {
            system: "urn:oid:0.0.000.000000.0.00.000.0.0.0.000000.000",
            value: "123456789",
          },
        ],
        class: {},
        status: "arrived",
        period: {
          start: "2000-02-03",
          end: "2000-02-04",
        },
        location: [
          {
            id: "f39281a4-c8bf-a15b-e2ed-FAKEf4cd1adc",
            location: {
              reference: "Location/7048630f-26bb-f67c-d446-FAKEa3573257",
            },
          },
        ],
      };

      const bundle: Bundle = {
        resourceType: "Bundle",
        type: "document",
        entry: [
          {
            resource: {
              resourceType: "Location",
              id: "7048630f-26bb-f67c-d446-FAKEa3573257",
              identifier: [
                {
                  system: "7048630f-26bb-f67c-d446-FAKEa3573257",
                  value: "112233445566778899",
                },
              ],
              name: expected,
              address: {
                use: "work",
                line: ["1111 Mos Eisley Dr"],
                city: "Mos Eisley",
                state: "IA",
                postalCode: "00044",
                district: "Mos Eisley",
              },
              telecom: [
                {
                  system: "phone",
                  value: "+1-555-555-5555",
                  use: "work",
                },
              ],
              type: [
                {
                  coding: [
                    {
                      code: "257622000",
                      display: "Healthcare Facility",
                      system: "http://snomed.info/sct",
                    },
                  ],
                },
              ],
            },
          },
          encounter,
        ],
      };

      const actual = getLocationName(bundle, encounter);

      expect(actual).toBe(expected);
    });
  });
});
