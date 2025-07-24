/**
 * @jest-environment node
 */

import { createEcrCondition, createEcrRule } from "../helpers/core";
import { buildExtended, dropExisting, clearEcrExtended } from "../helpers/ddl";
import { createExtendedEcr } from "../helpers/extended";
import { seedUserProgramData } from "../helpers/seed";
import { NewExtendedECR } from "@/app/data/metadataDb/types/extended";
import {
  EcrDisplay,
  getTotalEcrCount,
  listEcrData,
} from "@/app/services/listEcrDataService";
import { getLoggedInUserSession } from "@/app/utils/auth-utils";

const filterDates = {
  startDate: new Date("12-01-2024"),
  endDate: new Date("12-03-2024"),
};

const extendedTemplate: NewExtendedECR = {
  eicr_id: "12345",
  set_id: "123",
  fhir_reference_link: "http://example.com",
  last_name: "Kenobi",
  first_name: "Obi-Wan",
  birth_date: "2024-12-31",
  gender: "Based",
  birth_sex: "Based",
  gender_identity: "Based",
  race: "Star Guy",
  ethnicity: "Star Guy",
  latitude: "0.0",
  longitude: "0.0",
  homelessness_status: "Homeless",
  disabilities: "None",
  tribal_affiliation: "None",
  tribal_enrollment_status: "None",
  current_job_title: "Jedi Master",
  current_job_industry: "Jedi Order",
  usual_occupation: "Jedi Master",
  usual_industry: "Jedi Order",
  preferred_language: "Galactic Basic",
  pregnancy_status: "Not Pregnant",
  rr_id: "12345",
  processing_status: "Processed",
  eicr_version_number: "2",
  authoring_date: new Date("2024-12-02T05:00:00.000Z"),
  authoring_provider: "Dr. Droid",
  provider_id: "12345",
  facility_id: "12345",
  facility_name: "Jedi Temple",
  encounter_type: "Checkup",
  encounter_start_date: new Date("2024-12-02T05:00:00.000Z"),
  encounter_end_date: new Date("2024-12-02T05:00:00.000Z"),
  reason_for_visit: "Checkup",
  active_problems: "Dead",
  date_created: new Date("2024-12-02T12:00:00Z"),
};

// prior version of ecr
const relatedEcr = {
  eicr_id: `36545`,
  eicr_version_number: "1",
  date_created: new Date("2024-12-01T11:00:00Z"),
};

jest.mock("@/app/utils/auth-utils");

beforeEach(() => {
  (getLoggedInUserSession as jest.Mock).mockResolvedValue({
    name: "Adam Admin",
    email: "admin@admin.com",
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

beforeAll(async () => {
  (getLoggedInUserSession as jest.Mock).mockResolvedValue({
    name: "Adam Admin",
    email: "admin@admin.com",
  });
  await buildExtended();
  await seedUserProgramData();
});

afterAll(async () => {
  await dropExisting();
});

describe("listEcrData - extended", () => {
  it("should return empty array when no data is found", async () => {
    const startIndex = 0;
    const itemsPerPage = 25;
    const sortColumn = "date_created";
    const sortDirection = "DESC";

    const actual = await listEcrData({
      startIndex,
      itemsPerPage,
      sortColumn,
      sortDirection,
      filterDates,
    });

    expect(actual).toBeEmpty();

    const actualCount = await getTotalEcrCount(filterDates);
    expect(actualCount).toEqual(actual.length);
  });

  it("should return all data when found - admin", async () => {
    await createExtendedEcr(extendedTemplate);
    await createExtendedEcr({ ...extendedTemplate, ...relatedEcr });
    await createEcrCondition({
      uuid: "12345",
      eicr_id: "12345",
      condition: "Condition1",
    });
    await createEcrRule({
      uuid: "12345",
      ecr_rr_conditions_id: "12345",
      rule_summary: "Rule1",
    });

    // Act
    const actual = await listEcrData({
      startIndex: 0,
      itemsPerPage: 10,
      sortColumn: "report_date",
      sortDirection: "DESC",
      filterDates,
    });
    // Assert
    expect(actual).toStrictEqual([
      {
        date_created: "12/02/2024 7:00\u00A0AM\u00A0EST",
        ecrId: "12345",
        patient_date_of_birth: "12/31/2024",
        patient_first_name: "Obi-Wan",
        patient_last_name: "Kenobi",
        patient_report_date: "12/02/2024 12:00\u00A0AM\u00A0EST",
        reportable_conditions: ["Condition1"],
        rule_summaries: ["Rule1"],
        eicr_set_id: "123",
        eicr_version_number: "2",
        related_ecrs: [
          {
            ...relatedEcr,
            set_id: "123",
          },
        ],
      },
    ]);

    const actualCount = await getTotalEcrCount(filterDates);
    expect(actualCount).toEqual(actual.length);

    await clearEcrExtended();
  });

  it("should not return unauthorized data when found for standard user", async () => {
    (getLoggedInUserSession as jest.Mock).mockResolvedValue({
      email: "standard@standard.com",
    });
    await createExtendedEcr(extendedTemplate);
    await createExtendedEcr({ ...extendedTemplate, ...relatedEcr });
    await createEcrCondition({
      uuid: "12345",
      eicr_id: "12345",
      condition: "Condition1",
      // no condition code
    });
    await createEcrCondition({
      uuid: "23456",
      eicr_id: "12345",
      condition: "Condition1",
      condition_code: "456", // not in user's program area
    });
    await createEcrRule({
      uuid: "12345",
      ecr_rr_conditions_id: "12345",
      rule_summary: "Rule1",
    });
    const startIndex = 0;
    const itemsPerPage = 25;
    const sortColumn = "date_created";
    const sortDirection = "DESC";
    const actual: EcrDisplay[] = await listEcrData({
      startIndex,
      itemsPerPage,
      sortColumn,
      sortDirection,
      filterDates,
    });
    expect(actual).toStrictEqual([]);

    const actualCount = await getTotalEcrCount(filterDates);
    expect(actualCount).toEqual(actual.length);

    await clearEcrExtended();
  });

  it("should return authorized data when found for standard user", async () => {
    (getLoggedInUserSession as jest.Mock).mockResolvedValue({
      email: "standard@standard.com",
    });
    await createExtendedEcr(extendedTemplate);
    await createExtendedEcr({ ...extendedTemplate, ...relatedEcr });
    await createEcrCondition({
      uuid: "12345",
      eicr_id: "12345",
      condition: "Condition1",
      condition_code: "123",
    });
    await createEcrRule({
      uuid: "12345",
      ecr_rr_conditions_id: "12345",
      rule_summary: "Rule1",
    });

    const startIndex = 0;
    const itemsPerPage = 25;
    const sortColumn = "date_created";
    const sortDirection = "DESC";
    const actual: EcrDisplay[] = await listEcrData({
      startIndex,
      itemsPerPage,
      sortColumn,
      sortDirection,
      filterDates,
    });
    expect(actual).toStrictEqual([
      {
        date_created: "12/02/2024 7:00\u00A0AM\u00A0EST",
        ecrId: "12345",
        patient_date_of_birth: "12/31/2024",
        patient_first_name: "Obi-Wan",
        patient_last_name: "Kenobi",
        patient_report_date: "12/02/2024 12:00\u00A0AM\u00A0EST",
        reportable_conditions: ["Condition1"],
        rule_summaries: ["Rule1"],
        eicr_set_id: "123",
        eicr_version_number: "2",
        related_ecrs: [
          {
            ...relatedEcr,
            set_id: "123",
          },
        ],
      },
    ]);

    const actualCount = await getTotalEcrCount(filterDates);
    expect(actualCount).toEqual(actual.length);

    await clearEcrExtended();
  });

  it("should return no data when no user", async () => {
    (getLoggedInUserSession as jest.Mock).mockResolvedValue(undefined);
    await createExtendedEcr(extendedTemplate);
    await createExtendedEcr({ ...extendedTemplate, ...relatedEcr });
    await createEcrCondition({
      uuid: "12345",
      eicr_id: "12345",
      condition: "Condition1",
      condition_code: "123",
    });
    await createEcrRule({
      uuid: "12345",
      ecr_rr_conditions_id: "12345",
      rule_summary: "Rule1",
    });

    const startIndex = 0;
    const itemsPerPage = 25;
    const sortColumn = "date_created";
    const sortDirection = "DESC";
    const actual: EcrDisplay[] = await listEcrData({
      startIndex,
      itemsPerPage,
      sortColumn,
      sortDirection,
      filterDates,
    });
    expect(actual).toStrictEqual([]);

    const actualCount = await getTotalEcrCount(filterDates);
    expect(actualCount).toEqual(actual.length);

    await clearEcrExtended();
  });
});

describe("get total extended ecr count", () => {
  beforeAll(async () => {
    await createExtendedEcr(extendedTemplate);
    await createExtendedEcr({ ...extendedTemplate, ...relatedEcr });
  });

  afterAll(async () => await clearEcrExtended());

  it("should call db to get all ecrs", async () => {
    const actual = await getTotalEcrCount(filterDates);
    expect(actual).toEqual(1);
  });
  it("should use search term in count query", async () => {
    const actual = await getTotalEcrCount(filterDates, "blah", undefined);
    expect(actual).toEqual(0);
  });
  it("should escape the search term in count query", async () => {
    const actual = await getTotalEcrCount(filterDates, "O'Riley", undefined);
    expect(actual).toEqual(0);
  });
  it("should use filter conditions in count query", async () => {
    const actual = await getTotalEcrCount(filterDates, "", [
      "Anthrax (disorder)",
    ]);
    expect(actual).toEqual(0);
  });
});
