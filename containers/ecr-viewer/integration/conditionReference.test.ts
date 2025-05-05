/**
 * @jest-environment node
 */
import { updateConditions } from "@/app/api/migrate-db/updateConditions";
import { getDb } from "@/app/data/metadataDb/database";
import { Core } from "@/app/data/metadataDb/types/core";

import { buildCore, clearCore, dropExisting } from "./helpers/ddl";

// NOTE: These tests are currently using test-based helpers for round tripping data, but this should
// be replaced with the CRUD services once written

beforeAll(async () => {
  await buildCore();
});

afterAll(async () => {
  await dropExisting();
});

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.resetAllMocks();
});

const condition1 = {
  code: "123",
  concept_name: "condition (disease)",
  condition_name: "condition",
  condition_category: "category",
};

const adminId = "1235";
const adminUser = {
  uuid: adminId,
  email: "admin@test.gov",
  name: "Adam Admin",
  date_of_last_login: new Date("2024-01-01"),
  user_type: "admin",
  status: "active",
  author_uuid: adminId,
};

const progId = "234-12";
const programArea = {
  uuid: progId,
  name: "Disease",
  author_uuid: adminId,
};

describe("condition_reference table", () => {
  it("should retrieve all inserted conditiosn", async () => {
    const db = getDb<Core>();

    await db.insertInto("condition_reference").values(condition1).execute();

    jest.spyOn(console, "error").mockImplementation();

    // Violates pkey
    await expect(
      db
        .insertInto("condition_reference")
        .values({ ...condition1, concept_name: "condition disease" })
        .execute(),
    ).rejects.toThrow();

    // Violates pkey
    await expect(
      db
        .insertInto("condition_reference")
        .values({ ...condition1, concept_name: "condition disease" })
        .execute(),
    ).rejects.toThrow();

    // Violates fkey
    await expect(
      db
        .updateTable("condition_reference")
        .set({ program_area_uuid: progId })
        .where("code", "=", "123")
        .execute(),
    ).rejects.toThrow();

    // seed with admin for the fk
    await db.insertInto("user").values(adminUser).execute();
    await db.insertInto("program_area").values(programArea).execute();

    await db
      .updateTable("condition_reference")
      .set({ program_area_uuid: progId })
      .where("code", "=", "123")
      .execute(),
      // Insert minimal data
      await db
        .insertInto("condition_reference")
        .values({ code: "456", condition_name: "anthrax" })
        .execute();

    const conditions = await db
      .selectFrom("condition_reference")
      .selectAll()
      .execute();

    expect(conditions).toStrictEqual([
      {
        ...condition1,
        program_area_uuid: progId,
      },
      {
        code: "456",
        concept_name: null,
        condition_name: "anthrax",
        condition_category: null,
        program_area_uuid: null,
      },
    ]);

    await clearCore();
  });

  it("should do upsert flow", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      status: 200,
      json: jest.fn().mockResolvedValue({ conditions: [condition1] }),
    });

    // seed with admin for the fk
    const db = getDb<Core>();
    await db.insertInto("user").values(adminUser).execute();
    await db.insertInto("program_area").values(programArea).execute();

    await updateConditions();

    // add program area
    await db
      .updateTable("condition_reference")
      .set({ program_area_uuid: progId })
      .where("code", "=", "123")
      .execute();

    const conditions1 = await db
      .selectFrom("condition_reference")
      .selectAll()
      .execute();

    expect(conditions1).toStrictEqual([
      {
        ...condition1,
        program_area_uuid: progId,
      },
    ]);

    (fetch as jest.Mock).mockResolvedValue({
      status: 200,
      json: jest.fn().mockResolvedValue({
        conditions: [{ ...condition1, concept_name: "something new" }],
      }),
    });

    await updateConditions();

    const conditions2 = await db
      .selectFrom("condition_reference")
      .selectAll()
      .execute();

    expect(conditions2).toStrictEqual([
      {
        ...condition1,
        concept_name: "something new",
        program_area_uuid: progId,
      },
    ]);

    await clearCore();
  });
});
