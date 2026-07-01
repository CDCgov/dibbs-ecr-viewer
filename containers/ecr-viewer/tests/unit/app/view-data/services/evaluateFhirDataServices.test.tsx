import { render, screen } from "@testing-library/react";
import {
  Bundle,
  BundleEntry,
  Encounter,
  Practitioner,
  Location,
  Organization,
  Address,
  Composition,
} from "fhir/r4";

import * as _BundleAdmissionMedications from "@/../../../test-data/fhir/BundleAdmissionMedications.json";
import BundleEcrMetadata from "@/../../../test-data/fhir/BundleEcrMetadata.json";
import * as _BundleWithPatient from "@/../../../test-data/fhir/BundlePatient.json";
import * as _BundlePatientMultiple from "@/../../../test-data/fhir/BundlePatientMultiple.json";
import * as _BundlePatientWithCovid from "@/../../../test-data/fhir/BundlePatientWithCovid.json";
import BundlePractitionerRole from "@/../../../test-data/fhir/BundlePractitionerRole.json";
import * as _BundleWithPregnancyStatus from "@/../../../test-data/fhir/BundlePregnancyStatus.json";
import PregnancyInfo from "@/app/view-data/components/PregnancyInfo";
import {
  evaluatePractitionerRoleReference,
  evaluateEncounterCareTeamTable,
  evaluateHospitalEncounterData,
  evaluateProviderData,
  evaluatePregnancyData,
  getLocationName,
  evaluateEncounterDiagnosis,
  evaluateFacilityData,
} from "@/app/view-data/services/evaluateFhirDataService";
import { getFhirIndex } from "@/app/view-data/services/fhirResourcesIndexService";

const BundleWithPatient = _BundleWithPatient as Bundle;
const fhirIndexBundleWithPatient = getFhirIndex(BundleWithPatient);

const BundlePatientMultiple = _BundlePatientMultiple as unknown as Bundle;

const BundleWithAdmissionMedications = _BundleAdmissionMedications as Bundle;
const BundlePatientWithCovid = _BundlePatientWithCovid as Bundle;

const BundleWithPregnancyStatus =
  _BundleWithPregnancyStatus as unknown as Bundle;
const fhirIndexBundleWithPregnancyStatus = getFhirIndex(
  BundleWithPregnancyStatus,
);

describe("evaluateFhirDataService tests", () => {
  describe("Evaluate Patient Info: Pregnancy Info", () => {
    it("should have no available data when there is no data", () => {
      const actual = evaluatePregnancyData(undefined as any, {
        fhirIndexByType: {},
        fhirIndexByTypeAndId: {},
      });

      expect(actual.availableData).toBeEmpty();
      expect(actual.unavailableData).not.toBeEmpty();
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
      const actual = evaluatePregnancyData(pregnancyBundle, {
        fhirIndexByType: {},
        fhirIndexByTypeAndId: {},
      });
      render(actual.availableData[0].value);
      expect(screen.getAllByText("Pregnancy Status").length).toEqual(1);
    });

    it("should display all pregnancy data ", () => {
      const actual = evaluatePregnancyData(
        BundleWithPregnancyStatus,
        fhirIndexBundleWithPregnancyStatus,
      );

      actual.availableData.forEach((data) => {
        const { container } = render(data.value);
        expect(container).toMatchSnapshot();
      });
    });

    it("should display nothing when no pregnancy data is available", () => {
      const actual = evaluatePregnancyData({} as unknown as Bundle, {
        fhirIndexByType: {},
        fhirIndexByTypeAndId: {},
      });
      expect(actual.availableData).toBeEmpty();
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
      const actual = evaluatePregnancyData(pregnancyBundle, {
        fhirIndexByType: {},
        fhirIndexByTypeAndId: {},
      });
      render(<PregnancyInfo pregnancyData={actual.availableData} />);
      expect(screen.getAllByText("Postpartum Status").length).toEqual(1);
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
      const actual = evaluatePregnancyData(pregnancyBundle, {
        fhirIndexByType: {},
        fhirIndexByTypeAndId: {},
      });
      render(<PregnancyInfo pregnancyData={actual.availableData} />);
      expect(screen.getByText("Last Menstrual Period")).toBeVisible();
      expect(screen.getByText("01/01/2020")).toBeVisible();
    });
  });

  describe("Evaluate Encounter Info: Encounter Details", () => {
    describe("Evaluate Encounter Care Team", () => {
      it("should return the correct Encounter care team", () => {
        const actual = evaluateEncounterCareTeamTable(
          BundleEcrMetadata as unknown as Bundle,
        );

        expect(actual).toMatchSnapshot();
      });
    });

    describe("Evaluate Encounter Diagnoses", () => {
      it("should return the correct diagnoses given an Encounter", () => {
        const encounter = {
          resourceType: "Encounter",
          id: "3a1cb409-6f94-0231-86d6-FAKE1ecc5fda",
        };
        const actual = evaluateEncounterDiagnosis(
          BundleEcrMetadata as unknown as Bundle,
          encounter as unknown as Encounter,
        );
        expect(actual).toMatchSnapshot();
      });
    });
  });

  describe("Evaluate Encounter Info: Hospital Encounter Details", () => {
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

  describe("Evaluate Encounter Info: Facility Details", () => {
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

    it("should return the correct Facility data", () => {
      const address: Address = {
        use: "work",
        line: ["37 Test Cir", "Suite Test"],
        city: "Test City",
        state: "TT",
        country: "US",
        postalCode: "0000",
      };
      const location: Location = {
        resourceType: "Location",
        name: "Location Name",
        id: "location-id",
        identifier: [
          {
            system: "urn:oid:1.2.840.114350.1.13.478.2.7.2.686980",
            value: "test-id-value",
          },
        ],
        address,
        type: [
          {
            coding: [
              {
                code: "257622000",
                system: "http://snomed.info/sct",
                display: "Healthcare facility",
              },
            ],
          },
        ],
      };
      const organization: Organization = {
        resourceType: "Organization",
        id: "organization-id",
        address: [address],
        telecom: [
          {
            system: "phone",
            value: "+1-615-322-5000",
            use: "work",
          },
        ],
      };
      const encounter: Encounter = {
        resourceType: "Encounter",
        id: "encounter-id",
        class: {},
        status: "arrived",
        location: [
          {
            location: {
              reference: "Location/location-id",
              display: "Location Name",
            },
          },
        ],
        serviceProvider: {
          reference: "Organization/organization-id",
        },
      };
      const composition: Composition = {
        resourceType: "Composition",
        author: [],
        date: "",
        status: "final",
        title: "",
        type: {},
        encounter: {
          reference: "Encounter/encounter-id",
        },
      };
      const bundle: Bundle = {
        resourceType: "Bundle",
        type: "document",
        entry: [
          { resource: composition },
          { resource: encounter },
          { resource: location },
          { resource: organization },
        ],
      };

      const actual = evaluateFacilityData(bundle);
      expect(actual).toMatchSnapshot();
    });
  });

  describe("Evaluate Encounter Info: Provider Details", () => {
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
  });
});
