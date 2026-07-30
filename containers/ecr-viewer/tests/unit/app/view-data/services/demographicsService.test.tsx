import { Bundle } from "fhir/r4";

import * as _BundleWithPatient from "@/../../../test-data/fhir/BundlePatient.json";
import * as _BundleWithDeceasedPatient from "@/../../../test-data/fhir/BundlePatientDeceased.json";
import * as _BundlePatientMultiple from "@/../../../test-data/fhir/BundlePatientMultiple.json";
import { formatAge } from "@/app/services/formatService";
import { evaluateOne, evaluateValue } from "@/app/utils/evaluate";
import mappings from "@/app/utils/evaluate/fhir-paths";

import {
  getPatient,
  evaluatePatientRace,
  evaluatePatientEthnicity,
  evaluatePatientAddress,
  evaluatePatientName,
  evaluateDemographicsData,
  evaluatePatientLanguage,
  evaluatePatientVitalStatus,
  censorGender,
  calculatePatientAge,
  createPatientAgeDataProp,
} from "@/app/view-data/services/demographicsService";
import { getFhirIndex } from "@/app/view-data/services/fhirResourcesIndexService";
import { formatDateTime } from "@/app/services/formatDateService";
import fhirPathMappings from "@/app/utils/evaluate/fhir-paths";

const BundleWithPatient = _BundleWithPatient as Bundle;
const fhirIndexBundleWithPatient = getFhirIndex(BundleWithPatient);

const BundlePatientMultiple = _BundlePatientMultiple as unknown as Bundle;
const fhirIndexBundleWithPatientMultiple = getFhirIndex(BundlePatientMultiple);

const BundleWithDeceasedPatient = _BundleWithDeceasedPatient as Bundle;
const fhirIndexBundleWithDeceasedPatient = getFhirIndex(
  BundleWithDeceasedPatient,
);

describe("Evaluate Patient Info: Demographics", () => {
  const patient = getPatient(fhirIndexBundleWithPatient);
  const patientMultiple = getPatient(fhirIndexBundleWithPatientMultiple);
  const patientDeceased = getPatient(fhirIndexBundleWithDeceasedPatient);

  describe("getPatient", () => {
    it("should return the correct Patient resource", () => {
      const resource1 = {
        fullUrl: "urn:uuid:1",
        resource: {
          resourceType: "Patient",
          id: "1",
        },
      };
      const fhirIndexPatient = {
        fhirIndexByType: {
          Patient: [resource1.resource],
        },
        fhirIndexByTypeAndId: {
          Patient: {
            "1": resource1.resource,
          },
        },
      };
      const actual = getPatient(fhirIndexPatient);
      expect(actual).toEqual(resource1.resource);
    });

    it("should return undefined of no Patient resource exists", () => {
      const fhirIndexEmpty = {
        fhirIndexByType: {},
        fhirIndexByTypeAndId: {},
      };
      const actual = getPatient(fhirIndexEmpty);
      expect(actual).toEqual(undefined);
    });
  });

  describe("Evaluate Patient Name", () => {
    it("should return the 1 name", () => {
      const actual = evaluatePatientName(patient, false);
      expect(actual).toEqual("Han Solo");
    });
    it("should return all 2 of the names", () => {
      const actual = evaluatePatientName(patientMultiple, false);
      expect(actual).toEqual(
        "Official: Anakin Skywalker\n" + "Nickname: Darth Vader",
      );
    });
    it("should only return the official name for the banner", () => {
      const actual = evaluatePatientName(patientMultiple, true);
      expect(actual).toEqual("Anakin Skywalker");
    });
    it("should only return the official name for the banner", () => {
      const actual = evaluatePatientName(patient, true);
      expect(actual).toEqual("Han Solo");
    });
  });

  describe("Calculate Patient Age", () => {
    it("when no date is given, should return patient age when DOB is available", () => {
      // Fixed "today" for testing purposes
      jest.useFakeTimers().setSystemTime(new Date("2024-03-12"));

      const patientAge = calculatePatientAge(patient);

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

      const patientAge = calculatePatientAge(patient, givenDate);

      expect(patientAge).toEqual({ years: 142, months: 7, days: 7 });
    });

    it("should return a value that can display only in days", () => {
      const patientAge = calculatePatientAge(patient, "1877-05-30");

      const formattedPatientAge = formatAge(patientAge);

      expect(formattedPatientAge).toEqual("5 days");
    });
  });

  describe("Evaluate Patient Vital Status", () => {
    function getPatientBundle(deceased: boolean) {
      return {
        resourceType: "Bundle",
        entry: [
          {
            resource: {
              id: "1",
              resourceType: "Patient",
              deceasedBoolean: deceased,
            },
          },
        ],
      } as unknown as Bundle;
    }

    it("should return an empty string when no `deceasedBoolean` value is present", () => {
      const actual = evaluatePatientVitalStatus(patient);
      expect(actual).toEqual("");
    });

    it("should return `Alive` when `deceasedBoolean` is `false`", () => {
      const bundleDeceasedFalse = getPatientBundle(false);
      const fhirIndexDeceasedFalse = getFhirIndex(bundleDeceasedFalse);
      const patientDeceasedFalse = getPatient(fhirIndexDeceasedFalse);
      const actual = evaluatePatientVitalStatus(patientDeceasedFalse);
      expect(actual).toEqual("Alive");
    });

    it("should return `Deceased` when `deceasedBoolean` is `true`", () => {
      const bundleDeceasedTrue = getPatientBundle(true);
      const fhirIndexDeceasedTrue = getFhirIndex(bundleDeceasedTrue);
      const patientDeceasedTrue = getPatient(fhirIndexDeceasedTrue);
      const actual = evaluatePatientVitalStatus(patientDeceasedTrue);
      expect(actual).toEqual("Deceased");
    });

    it("should return `Deceased` when `deceasedDateTime` is present", () => {
      const bundleWithDOD = {
        resourceType: "Bundle",
        entry: [
          {
            resource: {
              id: "1",
              resourceType: "Patient",
              deceasedDateTime: "2026-01-27T08:00:00",
            },
          },
        ],
      } as unknown as Bundle;
      const fhirIndex = getFhirIndex(bundleWithDOD);
      const patientWithDOD = getPatient(fhirIndex);
      const actual = evaluatePatientVitalStatus(patientWithDOD);
      expect(actual).toEqual("Deceased");

      // Date of death
      const actualDateOfDeath = formatDateTime(
        evaluateOne(patientWithDOD, fhirPathMappings.patientDOD)
      );
      expect(actualDateOfDeath).toInclude("01/27/2026 8:00");
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

  describe("Create Patient Age Data Prop", () => {
    it("should return Age at Death if there is a date of death", () => {
      const patientAgeProp = createPatientAgeDataProp(
        BundleWithDeceasedPatient,
        patientDeceased,
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
      const fhirIndexPatientBundleWithEncounter = getFhirIndex(
        patientBundleWithEncounter,
      );
      const patientResource = getPatient(fhirIndexPatientBundleWithEncounter);

      const patientAgeProp = createPatientAgeDataProp(
        patientBundleWithEncounter,
        patientResource,
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
      const fhirIndexPatientBundleWithEncounter = getFhirIndex(
        patientBundleWithEncounter,
      );
      const patientResource = getPatient(fhirIndexPatientBundleWithEncounter);

      const patientAgeProp = createPatientAgeDataProp(
        patientBundleWithEncounter,
        patientResource,
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
      const fhirIndexPatientBundleWithEncounter = getFhirIndex(
        patientBundleWithEncounter,
      );
      const patientResource = getPatient(fhirIndexPatientBundleWithEncounter);

      const patientAgeProp = createPatientAgeDataProp(
        patientBundleWithEncounter,
        patientResource,
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
      const fhirIndexPatientBundleWithCreatedDate = getFhirIndex(
        patientBundleWithCreatedDate,
      );
      const patientResource = getPatient(fhirIndexPatientBundleWithCreatedDate);

      const patientAgeProp = createPatientAgeDataProp(
        patientBundleWithCreatedDate,
        patientResource,
      );

      expect(patientAgeProp).toEqual({
        title: "Age at Encounter",
        value: "46 years",
        toolTip:
          "Using the date eCR was created as a proxy for date of encounter. No encounter date available.",
      });
    });
  });

  it("should return race category and extension if available", () => {
    const actual = evaluatePatientRace(patient);
    expect(actual).toEqual("Black or African American\nAfrican");
  });

  it("should return ethnicity category and extension if available", () => {
    const actual = evaluatePatientEthnicity(patient);
    expect(actual).toEqual("Hispanic or Latino\nWhite");
  });

  it("should return Tribal Affiliation if available", () => {
    const actual = evaluateDemographicsData(
      BundleWithPatient,
      fhirIndexBundleWithPatient,
    );
    const ext = actual.availableData.filter(
      (d) => d.title === "Tribal Affiliation",
    );
    expect(ext).toHaveLength(1);
    expect(ext[0].value).toEqual(
      "Fort Mojave Indian Tribe of Arizona, California",
    );
  });

  describe("Evaluate Patient Language", () => {
    it("Should display language, proficiency, and mode", () => {
      const actual = evaluatePatientLanguage(patient);

      expect(actual).toEqual("English\nGood\nExpressed spoken");
    });

    it("Should only display preferred languages", () => {
      const bundlePatientLanguage = {
        resourceType: "Bundle",
        entry: [
          {
            resource: {
              id: "1",
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
      } as unknown as Bundle;
      const fhirIndexBundlePatientLanguage = getFhirIndex(
        bundlePatientLanguage,
      );
      const patientLanguage = getPatient(fhirIndexBundlePatientLanguage);

      const actual = evaluatePatientLanguage(patientLanguage);

      expect(actual).toEqual("English\n\nHindi");
    });
    it("Should display language when there are no preferred languages", () => {
      const bundlePatientNoLanguage = {
        resourceType: "Bundle",
        entry: [
          {
            resource: {
              id: "1",
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
      } as unknown as Bundle;
      const fhirIndexBundlePatientNoLanguage = getFhirIndex(
        bundlePatientNoLanguage,
      );
      const patientNoLanguage = getPatient(fhirIndexBundlePatientNoLanguage);

      const actual = evaluatePatientLanguage(patientNoLanguage);

      expect(actual).toEqual("Spanish\n\nEnglish");
    });
  });

  describe("Evaluate Patient Address", () => {
    it("should return empty string if no address is available", () => {
      const actual = evaluatePatientAddress(undefined as any);

      expect(actual).toBeEmpty();
    });
    it("should return the 1 address", () => {
      const actual = evaluatePatientAddress(patient);
      expect(actual).toEqual("1 Main St\nCloud City, CA 00000\nUS");
    });
    it("should return all 3 of the addresses", () => {
      const actual = evaluatePatientAddress(patientMultiple);
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

  it("should return Parent/Guardian if available", () => {
    const actual = evaluateDemographicsData(
      BundleWithPatient,
      fhirIndexBundleWithPatient,
    );
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

  it("should return the Patient Identifier value", () => {
    const actual = evaluateValue(patient, mappings.patientIds);

    expect(actual).toEqual("1234567890");
  });

  it("should return all correct demographic info not covered by other tests", () => {
    const actual = evaluateDemographicsData(
      BundleWithPatient,
      fhirIndexBundleWithPatient,
    );
    const expectedContact = [
      {
        title: "Contact",
        value: "Home: 555-555-5555\nfakefakenotreal@example.com",
      },
    ];

    expect(actual.availableData.filter((d) => d.title === "Contact")).toEqual(
      expectedContact,
    );
  });

  it("should show Vital Status as Deceased and Date of Death when deceasedDateTime is present", () => {
    const deceasedBundle = {
      resourceType: "Bundle",
      entry: [
        {
          resource: {
            id: "deceased-dod-test",
            resourceType: "Patient",
            deceasedDateTime: "2026-01-27",
          },
        },
      ],
    } as unknown as Bundle;
    const deceasedFhirIndex = getFhirIndex(deceasedBundle);
    const actual = evaluateDemographicsData(deceasedBundle, deceasedFhirIndex);

    const vitalStatus = actual.availableData.find(
      (d) => d.title === "Vital Status",
    );
    const dod = actual.availableData.find((d) => d.title === "Date of Death");

    expect(vitalStatus?.value).toEqual("Deceased");
    expect(dod?.value).toEqual("01/27/2026");
  });
});
