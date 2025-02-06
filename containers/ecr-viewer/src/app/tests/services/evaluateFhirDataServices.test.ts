import { loadYamlConfig } from "@/app/api/utils";
import {
  evaluateEncounterId,
  evaluateFacilityId,
  evaluatePatientRace,
  evaluatePatientEthnicity,
  evaluatePractitionerRoleReference,
  evaluateReference,
  evaluateValue,
  evaluateEmergencyContact,
  evaluatePatientAddress,
  evaluatePatientName,
  evaluateDemographicsData,
  evaluateEncounterCareTeamTable,
  evaluateAlcoholUse,
  evaluatePatientLanguage,
} from "@/app/services/evaluateFhirDataService";
import { Bundle, Patient } from "fhir/r4";
import BundleMiscNotes from "@/app/tests/assets/BundleMiscNotes.json";
import BundlePatient from "@/app/tests/assets/BundlePatient.json";
import BundleEcrMetadata from "@/app/tests/assets/BundleEcrMetadata.json";
import BundlePractitionerRole from "@/app/tests/assets/BundlePractitionerRole.json";
import BundlePatientMultiple from "@/app/tests/assets/BundlePatientMultiple.json";

const mappings = loadYamlConfig();

describe("evaluateFhirDataServices tests", () => {
  describe("Evaluate Reference", () => {
    it("should return undefined if resource not found", () => {
      const actual = evaluateReference(
        BundleMiscNotes as unknown as Bundle,
        mappings,
        "Observation/1234",
      );

      expect(actual).toBeUndefined();
    });
    it("should return the resource if the resource is available", () => {
      const actual = evaluateReference(
        BundlePatient as unknown as Bundle,
        mappings,
        "Patient/99999999-4p89-4b96-b6ab-c46406839cea",
      );

      expect(actual.id).toEqual("99999999-4p89-4b96-b6ab-c46406839cea");
      expect(actual.resourceType).toEqual("Patient");
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
    });
  });

  describe("Evaluate Identifier", () => {
    it("should return the Identifier value", () => {
      const actual = evaluateValue(
        BundlePatient as unknown as Bundle,
        mappings.patientIds,
      );

      expect(actual).toEqual("1234567890");
    });
  });

  describe("Evaluate Patient Race", () => {
    it("should return race category and extension if available", () => {
      const actual = evaluatePatientRace(
        BundlePatient as unknown as Bundle,
        mappings,
      );
      expect(actual).toEqual("Black or African American\nAfrican");
    });
  });

  describe("Evaluate Patient Ethnicity", () => {
    it("should return ethnicity category and extension if available", () => {
      const actual = evaluatePatientEthnicity(
        BundlePatient as unknown as Bundle,
        mappings,
      );
      expect(actual).toEqual("Hispanic or Latino\nWhite");
    });
  });

  it("should return tribal affiliation if available", () => {
    const actual = evaluateDemographicsData(
      BundlePatient as unknown as Bundle,
      mappings,
    );
    const ext = actual.availableData.filter(
      (d) => d.title === "Tribal Affiliation",
    );
    expect(ext).toHaveLength(1);
    expect(ext[0].value).toEqual(
      "Fort Mojave Indian Tribe of Arizona, California",
    );
  });

  describe("Evaluate Facility Id", () => {
    it("should return the facility id", () => {
      const actual = evaluateFacilityId(
        BundleEcrMetadata as unknown as Bundle,
        mappings,
      );

      expect(actual).toEqual("112233445566778899");
    });
  });

  describe("Evaluate Encounter ID", () => {
    it("should return the correct Encounter ID", () => {
      const actual = evaluateEncounterId(
        BundleEcrMetadata as unknown as Bundle,
        mappings,
      );

      expect(actual).toEqual("123456789");
    });
  });

  describe("Evaluate Encounter Care Team", () => {
    it("should return the correct Encounter care team", () => {
      const actual = evaluateEncounterCareTeamTable(
        BundleEcrMetadata as unknown as Bundle,
        mappings,
      );

      expect(actual).toMatchSnapshot();
    });
  });

  describe("Evaluate PractitionerRoleReference", () => {
    it("should return the organization and practitioner when practitioner role is found ", () => {
      const actual = evaluatePractitionerRoleReference(
        BundlePractitionerRole as unknown as Bundle,
        mappings,
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
        mappings,
        "unknown",
      );

      expect(actual.organization).toBeUndefined();

      expect(actual.practitioner).toBeUndefined();
    });
  });

  describe("Evaluate Emergency Contact", () => {
    it("should return an emergency contact", () => {
      const BundlePatientAndContact = JSON.parse(
        JSON.stringify(BundlePatient),
      ) as unknown as Bundle;
      const patientIndex = BundlePatientAndContact.entry!.findIndex(
        (entry) => entry.resource?.resourceType === "Patient",
      );

      (
        BundlePatientAndContact.entry![patientIndex].resource as Patient
      ).contact = [
        {
          relationship: [
            {
              coding: [
                {
                  display: "sister",
                },
              ],
            },
          ],
          telecom: [
            {
              system: "phone",
              value: "+1-555-995-9999",
              use: "home",
            },
          ],
          name: {
            given: ["Anastasia", "Bubbletea"],
            family: "Pizza",
          },
          address: {
            use: "home",
            line: ["999 Single Court"],
            city: "BEVERLY HILLS",
            state: "CA",
            country: "USA",
            postalCode: "90210",
            district: "LOS ANGELE",
          },
        },
      ];
      const actual = evaluateEmergencyContact(
        BundlePatientAndContact,
        mappings,
      );
      expect(actual).toEqual(
        `Sister\nAnastasia Bubbletea Pizza\n999 Single Court\nBeverly Hills, CA\n90210, USA\nHome: 555-995-9999`,
      );
    });
    it("should return multiple emergency contacts", () => {
      const BundlePatientAndContact = JSON.parse(
        JSON.stringify(BundlePatient),
      ) as unknown as Bundle;
      const patientIndex = BundlePatientAndContact.entry!.findIndex(
        (entry) => entry.resource?.resourceType === "Patient",
      );

      (
        BundlePatientAndContact.entry![patientIndex].resource as Patient
      ).contact = [
        {
          relationship: [
            {
              coding: [
                {
                  display: "sister",
                },
              ],
            },
          ],
          telecom: [
            {
              system: "phone",
              value: "+1-555-995-9999",
              use: "home",
            },
          ],
          name: {
            given: ["Anastasia", "Bubbletea"],
            family: "Pizza",
          },
          address: {
            use: "home",
            line: ["999 Single Court"],
            city: "BEVERLY HILLS",
            state: "CA",
            country: "USA",
            postalCode: "90210",
            district: "LOS ANGELE",
          },
        },
        {
          relationship: [
            {
              coding: [
                {
                  display: "brother",
                },
              ],
            },
          ],
          name: {
            given: ["Alberto", "Bonanza", "Bartholomew"],
            family: "Eggbert",
          },
          telecom: [
            {
              system: "phone",
              value: "+1-555-995-1000",
              use: "home",
            },
            {
              system: "fax",
              value: "+1-555-995-1001",
              use: "home",
            },
          ],
        },
      ];
      const actual = evaluateEmergencyContact(
        BundlePatientAndContact,
        mappings,
      );
      expect(actual).toEqual(
        `Sister\nAnastasia Bubbletea Pizza\n999 Single Court\nBeverly Hills, CA\n90210, USA\nHome: 555-995-9999\n\nBrother\nAlberto Bonanza Bartholomew Eggbert\nHome: 555-995-1000\nHome Fax: 555-995-1001`,
      );
    });
    it("should not return empty space when address is not available in", () => {
      const BundlePatientAndContact = JSON.parse(
        JSON.stringify(BundlePatient),
      ) as unknown as Bundle;
      const patientIndex = BundlePatientAndContact.entry!.findIndex(
        (entry) => entry.resource?.resourceType === "Patient",
      );

      (
        BundlePatientAndContact.entry![patientIndex].resource as Patient
      ).contact = [
        {
          relationship: [
            {
              coding: [
                {
                  display: "sister",
                },
              ],
            },
          ],
          name: {
            given: ["Anastasia", "Bubbletea"],
            family: "Pizza",
          },
          telecom: [
            {
              system: "phone",
              value: "+1-555-995-9999",
              use: "home",
            },
          ],
        },
      ];
      const actual = evaluateEmergencyContact(
        BundlePatientAndContact,
        mappings,
      );
      expect(actual).toEqual(
        `Sister\nAnastasia Bubbletea Pizza\nHome: 555-995-9999`,
      );
    });
    it("should return undefined if a patient has no contact", () => {
      const actual = evaluateEmergencyContact(
        BundlePatient as unknown as Bundle,
        mappings,
      );
      expect(actual).toBeUndefined();
    });
  });

  describe("Evaluate Patient Address", () => {
    it("should return the 1 address", () => {
      const actual = evaluatePatientAddress(
        BundlePatient as unknown as Bundle,
        mappings,
      );
      expect(actual).toEqual("1 Main St\nCloud City, CA\n00000, US");
    });
    it("should return all 3 of the addresses", () => {
      const actual = evaluatePatientAddress(
        BundlePatientMultiple as unknown as Bundle,
        mappings,
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
      const actual = evaluatePatientName(
        BundlePatient as unknown as Bundle,
        mappings,
        false,
      );
      expect(actual).toEqual("Han Solo");
    });
    it("should return all 2 of the names", () => {
      const actual = evaluatePatientName(
        BundlePatientMultiple as unknown as Bundle,
        mappings,
        false,
      );
      expect(actual).toEqual(
        "Official: Anakin Skywalker\n" + "Nickname: Darth Vader",
      );
    });
    it("should only return the official name for the banner", () => {
      const actual = evaluatePatientName(
        BundlePatientMultiple as unknown as Bundle,
        mappings,
        true,
      );
      expect(actual).toEqual("Anakin Skywalker");
    });
    it("should only return the official name for the banner", () => {
      const actual = evaluatePatientName(
        BundlePatient as unknown as Bundle,
        mappings,
        true,
      );
      expect(actual).toEqual("Han Solo");
    });
  });

  describe("Evaluate Alcohol Use", () => {
    it("should return the use, intake comment", () => {
      const actual = evaluateAlcoholUse(
        BundlePatient as unknown as Bundle,
        mappings,
      );
      expect(actual).toEqual(
        "Use: Current drinker of alcohol (finding)\n" +
          "Intake (standard drinks/week): .29/d\n" +
          "Comment: 1-2 drinks 2 to 4 times a month",
      );
    });
    it("should empty string because there is no use, intake, or comment", () => {
      const actual = evaluateAlcoholUse(
        BundlePatientMultiple as unknown as Bundle,
        mappings,
      );
      expect(actual).toEqual("");
    });
  });

  describe("Evaluate Patient language", () => {
    it("Should display language, proficiency, and mode", () => {
      const actual = evaluatePatientLanguage(
        BundlePatient as unknown as Bundle,
        mappings,
      );

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

      const actual = evaluatePatientLanguage(
        patient as unknown as Bundle,
        mappings,
      );

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

      const actual = evaluatePatientLanguage(
        patient as unknown as Bundle,
        mappings,
      );

      expect(actual).toEqual("Spanish\n\nEnglish");
    });
  });
});
