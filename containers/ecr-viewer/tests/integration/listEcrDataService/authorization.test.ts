/**
 * @jest-environment node
 */
import {
  createCoreEcr,
  createEcrCondition,
  createEcrRule,
} from "../helpers/core";
import { buildCore, dropExisting } from "../helpers/ddl";
import { seedUserProgramData } from "../helpers/seed";
import {
  getTotalEcrCount,
  listEcrData,
} from "@/app/services/listEcrDataService";
import { createProgramArea } from "@/app/services/programAreaService";
import {
  createUser,
  isLoggedInUserEcrAuthed,
} from "@/app/services/userService";
import { getLoggedInUserSession } from "@/app/utils/auth-utils";

jest.mock("@/app/utils/auth-utils");

const filterDates = {
  startDate: new Date("2024-12-01T00:00:00Z"),
  endDate: new Date("2024-12-03T00:00:00Z"),
};
const listParams = {
  startIndex: 0,
  itemsPerPage: 25,
  sortColumn: "date_created",
  sortDirection: "DESC",
  filterDates,
};
const versions = [
  { id: "area-a-v1", version: "1", code: "123" },
  { id: "area-b-v2", version: "2", code: "456" },
  { id: "area-a-v3", version: "3", code: "123" },
  // A matching set and version number must not authorize a different eCR.
  { id: "area-b-v3", version: "3", code: "456" },
  { id: "area-b-v4", version: "4", code: "456" },
  { id: "area-b-independent", version: "1", code: "456" },
];
describe("library metadata authorization across eCR versions", () => {
  const originalEnv = { ...process.env };

  beforeAll(async () => {
    jest.mocked(getLoggedInUserSession).mockResolvedValue({
      email: "admin@admin.com",
    });
    await buildCore();
    await seedUserProgramData();
    const areaB = await createProgramArea({
      name: "Synthetic area B",
      conditions: ["456"],
    });
    await createUser({
      email: "area-b@example.com",
      userType: "standard",
      programs: [areaB],
    });
    await createUser({
      email: "no-areas@example.com",
      userType: "standard",
      programs: [],
    });

    for (const { id, version, code } of versions) {
      await createCoreEcr({
        eicr_id: id,
        set_id: id.endsWith("independent") ? id : "synthetic-shared-set",
        eicr_version_number: version,
        fhir_reference_link: "",
        first_name: "Synthetic",
        last_name: "Patient",
        birth_date: "2000-01-01",
        encounter_start_date: new Date("2024-12-02T12:00:00Z"),
        date_created: new Date("2024-12-02T12:00:00Z"),
      });
      await createEcrCondition({
        uuid: id,
        eicr_id: id,
        condition: `${id}-condition`,
        condition_code: code,
      });
      await createEcrRule({
        uuid: id,
        ecr_rr_conditions_id: id,
        rule_summary: `${id}-rule`,
      });
    }
    // Multiple matching conditions must not duplicate authorized versions.
    await createEcrCondition({
      uuid: "duplicate-authorized-condition",
      eicr_id: "area-a-v1",
      condition: "area-a-v1-condition",
      condition_code: "123",
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await dropExisting();
    process.env = { ...originalEnv };
  });

  describe.each(["standard@standard.com", "programadmin@programadmin.com"])(
    "program-area restricted user %s",
    (email) => {
      beforeEach(() => {
        jest.mocked(getLoggedInUserSession).mockResolvedValue({ email });
      });

      it("returns only authorized versions, conditions and rule summaries", async () => {
        const result = await listEcrData(listParams);

        expect(result).toHaveLength(1);
        expect(result[0].ecrId).toBe("area-a-v3");
        expect(result[0].related_ecrs.map((ecr) => ecr.eicr_id)).toEqual([
          "area-a-v1",
        ]);
        expect(result[0].reportable_conditions.sort()).toEqual([
          "area-a-v1-condition",
          "area-a-v3-condition",
        ]);
        expect(result[0].rule_summaries).toEqual([
          {
            condition: "area-a-v3-condition",
            rule_summaries: ["area-a-v3-rule"],
          },
          {
            condition: "area-a-v1-condition",
            rule_summaries: ["area-a-v1-rule"],
          },
        ]);
        expect(await getTotalEcrCount(filterDates)).toBe(1);
      });

      it("exposes only library identifiers that satisfy eCR authorization", async () => {
        const result = await listEcrData(listParams);
        const ids = result.flatMap((ecr) => [
          ecr.ecrId,
          ...ecr.related_ecrs.map((related) => related.eicr_id),
        ]);
        expect(ids).toEqual(["area-a-v3", "area-a-v1"]);

        for (const id of ids) {
          expect(await isLoggedInUserEcrAuthed(id)).toBe(true);
        }
      });
    },
  );

  it("preserves administrator access to all versions", async () => {
    jest.mocked(getLoggedInUserSession).mockResolvedValue({
      email: "admin@admin.com",
    });
    const result = await listEcrData(listParams);
    const ids = result.flatMap((ecr) => [
      ecr.ecrId,
      ...ecr.related_ecrs.map((related) => related.eicr_id),
    ]);
    expect(ids.sort()).toEqual(versions.map(({ id }) => id).sort());
  });

  it("applies the same boundary for a user in the other program area", async () => {
    jest.mocked(getLoggedInUserSession).mockResolvedValue({
      email: "area-b@example.com",
    });
    const result = await listEcrData(listParams);
    const ids = result.flatMap((ecr) => [
      ecr.ecrId,
      ...ecr.related_ecrs.map((related) => related.eicr_id),
    ]);
    expect(ids.sort()).toEqual(
      versions
        .filter(({ code }) => code === "456")
        .map(({ id }) => id)
        .sort(),
    );
  });

  it.each(["no-areas@example.com", "unregistered@example.com", ""])(
    "denies library access for an IDP session without permissions: %s",
    async (email) => {
      jest.mocked(getLoggedInUserSession).mockResolvedValue({ email });
      expect(await listEcrData(listParams)).toEqual([]);
    },
  );
});
