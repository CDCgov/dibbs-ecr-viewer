import { Bundle } from "fhir/r4";

import BundleWithEcrMetadata from "../../../../../../test-data/fhir/BundleEcrMetadata.json";
import BundleErsdWarningNoDetail from "../../../../../../test-data/fhir/BundleErsdWarningNoDetail.json";
import BundleLab from "../../../../../../test-data/fhir/BundleLab.json";
import BundleMultipleAuthors from "../../../../../../test-data/fhir/BundleMultipleAuthor.json";
import BundlePatient from "../../../../../../test-data/fhir/BundlePatient.json";
import sample_ecr from "../../../../../../test-data/fhir/sample_ecr.json";
import {
  ERSDWarning,
  evaluateEcrMetadata,
} from "@/app/services/ecrMetadataService";
import { noData } from "@/app/utils/data-utils";

describe("Evaluate Ecr Metadata", () => {
  it("should have no available data where there is no data", () => {
    const actual = evaluateEcrMetadata(undefined as any);

    expect(actual.eicrDetails.availableData).toBeEmpty();
    expect(actual.eicrDetails.unavailableData).not.toBeEmpty();

    expect(actual.rrDetails.availableData).toBeUndefined();
  });
  it("should have eicrDetails", () => {
    const actual = evaluateEcrMetadata(
      BundleWithEcrMetadata as unknown as Bundle,
    );

    expect(actual.eicrDetails.availableData).toEqual([
      {
        title: "eICR ID",
        toolTip:
          "Unique document ID for the eICR that originates from the medical record. Different from the Document ID that NBS creates for all incoming records.",
        value: "2ebcb371-ec1e-fe8f-88d8-FAKEa8dae548",
      },
      {
        title: "Date/Time eCR Created",
        value: "02/04/2000 9:01\u00A0AM\u00A0EST",
      },
      { title: "eICR Release Version", value: "2016-12-12" },
      { title: "EHR Manufacturer Model Name", value: "Epic - Version 10.1" },
      {
        title: "EHR Software Name",
        value: "Epic - Version 10.1",
      },
    ]);
    expect(actual.eicrDetails.unavailableData).toBeEmpty();
  });
  it("should have eicr Custodian Details", () => {
    const actual = evaluateEcrMetadata(
      BundleWithEcrMetadata as unknown as Bundle,
    );

    expect(actual.ecrCustodianDetails.availableData).toEqual([
      {
        title: "Custodian ID",
        value: "11223344556677",
      },
      {
        title: "Custodian Name",
        value: "Mos Eisley Med Center",
      },
      {
        title: "Custodian Address",
        value: "2222 Sandy Sand Lane\nMos Eisley, TN\n00044, USA",
      },
      {
        title: "Custodian Contact",
        value: "Work: 555-555-5555",
      },
    ]);
    expect(actual.ecrCustodianDetails.unavailableData).toBeEmpty();
  });
  it("should have rrDetails, and correctly handle human-readable condition name", () => {
    const actual = evaluateEcrMetadata(
      BundleWithEcrMetadata as unknown as Bundle,
    );

    expect(actual.rrDetails).toEqual({
      "Disease caused by severe acute respiratory syndrome coronavirus 2 (disorder)":
        {
          "COVID-19 (as a diagnosis or active problem)": new Set([
            "Mos Espa Department of Health",
          ]),
          "Detection of SARS-CoV-2 nucleic acid in a clinical or post-mortem specimen by any method":
            new Set(["Mos Espa Department of Health"]),
        },
      "Hepatitis C": {
        "Detection of Hepatitis C virus antibody in a clinical specimen by any method":
          new Set(["Anchorhead Department of Public Health"]),
      },
    });
  });
  it("should have an eRSD Warning", () => {
    const actual = evaluateEcrMetadata(
      BundleWithEcrMetadata as unknown as Bundle,
    );

    expect(actual.eRSDWarning).toEqual({
      warning:
        "The eICR was processed with the warning of: outdated eRSD (RCTC) version.",
      versionUsed: "Outdated eRSD (RCTC) Version Detail: 3/29/2022",
      versionExpected:
        'The expected eRSD (RCTC) version should be one of the following: ["2024-06-28","1.2.4.0","3.x.x","2024-04-05"] ',
      suggestedSolution:
        "The trigger code version your organization is using is out-of-date. Please have your EHR administration install the current version for complete eCR functioning.",
    });
  });
  it("if processed with no warning/error, should be undefined", () => {
    const actual = evaluateEcrMetadata(sample_ecr as unknown as Bundle);

    expect(actual.eRSDWarning).toEqual(undefined);
  });
  it("if processed with eRSDwarning but no details, should show partial info", () => {
    const actual = evaluateEcrMetadata(
      BundleErsdWarningNoDetail as unknown as Bundle,
    );

    expect(actual.eRSDWarning).toEqual({
      warning:
        "eICR was processed with the warning of: content or format issues.",
      versionUsed: noData,
      versionExpected: noData,
      suggestedSolution: noData,
    });
  });
  it("if no eICR Processing Status, should return empty object", () => {
    const actual = evaluateEcrMetadata(BundlePatient as unknown as Bundle);

    expect(actual.eRSDWarning).toEqual({});
  });
  it("if there's a non-success processing status but no reason obs, should return empty object", () => {
    const BundleErsdWarningNoReason: Bundle = {
      resourceType: "Bundle",
      type: "batch",
      entry: [
        {
          fullUrl: "urn:uuid:2ebcb371-ec1e-fe8f-88d8-FAKEa8dae548",
          resource: {
            resourceType: "Composition",
            id: "2ebcb371-ec1e-fe8f-88d8-FAKEa8dae548",
            status: "final",
            title: "Dummy title",
            type: {},
            date: "2000-02-04T09:01:22-05:00",
            section: [
              {
                extension: [
                  {
                    url: "http://hl7.org/fhir/us/ecr/StructureDefinition/rr-eicr-processing-status-extension",
                    extension: [
                      {
                        url: "eICRProcessingStatus",
                        valueReference: {
                          reference:
                            "Observation/1f41508f-a752-fb3a-9091-7473d7d3b40a",
                          display: "eICR was processed - with a warning",
                        },
                      },
                    ],
                  },
                ],
              },
            ],
            author: [
              {
                reference:
                  "PractitionerRole/b18c20c1-123b-fd12-71cf-9dd0abae8ced",
              },
              {
                reference: "Device/a57ef88d-1c60-d952-e7ca-5e9e16c7ef05",
              },
            ],
          },
          request: {
            method: "PUT",
            url: "Composition/2ebcb371-ec1e-fe8f-88d8-FAKEa8dae548",
          },
        },
        {
          fullUrl: "urn:uuid:1f41508f-a752-fb3a-9091-7473d7d3b40a",
          resource: {
            resourceType: "Observation",
            id: "1f41508f-a752-fb3a-9091-7473d7d3b40a",
            meta: {
              profile: [
                "http://hl7.org/fhir/us/ecr/StructureDefinition/rr-eicr-processing-status-observation",
              ],
            },
            identifier: [
              {
                system: "urn:ietf:rfc:3986",
                value: "urn:uuid:39d966b9-8a3a-4024-93d8-138e97d5898a",
              },
            ],
            status: "final",
            code: {
              coding: [
                {
                  code: "RRVS20",
                  system: "urn:oid:2.16.840.1.114222.4.5.274",
                  display: "eICR was processed - with a warning",
                },
              ],
            },
          },
        },
      ],
    };
    const actual = evaluateEcrMetadata(
      BundleErsdWarningNoReason as unknown as Bundle,
    );
    console.log(actual.eRSDWarning);
    expect((actual.eRSDWarning as ERSDWarning).warning).toEqual(
      "eICR processed with a warning or error (unknown)",
    );
    expect((actual.eRSDWarning as ERSDWarning).versionUsed).toEqual(noData);
  });
  it("should have one author", () => {
    const actual = evaluateEcrMetadata(
      BundleWithEcrMetadata as unknown as Bundle,
    );
    expect(actual.eicrAuthorDetails).toHaveLength(1);
    expect(actual.eicrAuthorDetails[0].availableData).toEqual([
      {
        title: "Author Name",
        value: "Lab Interface",
      },
      {
        title: "Author Facility Name",
        value: "Mos Eisley Med Center",
      },
      {
        title: "Author Facility Address",
        value: ["2222 Sandy Sand Lane\nMos Eisley, TN\n00044, USA"],
      },
      {
        title: "Author Facility Contact",
        value: "Work: 555-555-5555",
      },
    ]);
    expect(actual.eicrAuthorDetails[0].unavailableData).toEqual([
      {
        title: "Author Address",
        value: undefined,
      },
      {
        title: "Author Contact",
        value: "",
      },
    ]);
  });
  it("should have two authors", () => {
    const actual = evaluateEcrMetadata(
      BundleMultipleAuthors as unknown as Bundle,
    );
    expect(actual.eicrAuthorDetails).toHaveLength(2);
    expect(actual.eicrAuthorDetails[0].availableData).toEqual([
      {
        title: "Author Name",
        value: "Lab Interface",
      },
      {
        title: "Author Facility Name",
        value: "Merisee Grand Medical Facility",
      },
      {
        title: "Author Facility Address",
        value: ["1 River Way\nFerrix City, AZ\n00123, USA"],
      },
      {
        title: "Author Facility Contact",
        value: "Work: 555-777-0000",
      },
    ]);
    expect(actual.eicrAuthorDetails[0].unavailableData).toEqual([
      {
        title: "Author Address",
        value: undefined,
      },
      {
        title: "Author Contact",
        value: "",
      },
    ]);
    expect(actual.eicrAuthorDetails[1].availableData).toEqual([
      {
        title: "Author Name",
        value: "Ahsoka Tano",
      },
      {
        title: "Author Address",
        value: ["1 River Way\nFerrix City, AZ\n00123, USA"],
      },
      {
        title: "Author Contact",
        value: "Work: 555-777-0000",
      },
      {
        title: "Author Facility Name",
        value: "Merisee Grand Medical Facility",
      },
      {
        title: "Author Facility Address",
        value: ["1 River Way\nFerrix City, AZ\n00123, USA"],
      },
      {
        title: "Author Facility Contact",
        value: "Work: 555-777-0000",
      },
    ]);
    expect(actual.eicrAuthorDetails[1].unavailableData).toBeEmpty();
  });
  it("should have zero authors", () => {
    const actual = evaluateEcrMetadata(BundleLab as unknown as Bundle);
    expect(actual.eicrAuthorDetails).toHaveLength(1);
    expect(actual.eicrAuthorDetails[0].availableData).toBeEmpty();
    expect(actual.eicrAuthorDetails[0].unavailableData).toEqual([
      {
        title: "Author Name",
        value: null,
      },
      {
        title: "Author Address",
        value: null,
      },
      {
        title: "Author Contact",
        value: null,
      },
      {
        title: "Author Facility Name",
        value: null,
      },
      {
        title: "Author Facility Address",
        value: null,
      },
      {
        title: "Author Facility Contact",
        value: null,
      },
    ]);
  });
});
