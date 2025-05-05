/**
 * @jest-environment node
 */
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

describe("user table", () => {
  it("Should retrieve all inserted users", async () => {
    const db = getDb<Core>();
    const standardId = "4566";
    await db.insertInto("user").values(adminUser).execute();
    await db
      .insertInto("user")
      .values({
        uuid: standardId,
        email: "standard@test.gov",
        user_type: "standard",
        author_uuid: adminId,
      })
      .execute();

    jest.spyOn(console, "error").mockImplementation();
    // Violates pkey
    await expect(
      db
        .insertInto("user")
        .values({ ...adminUser, email: "hi@test.com" })
        .execute(),
    ).rejects.toThrow();

    // Violates email unique-ness
    await expect(
      db
        .insertInto("user")
        .values({ ...adminUser, uuid: "9832" })
        .execute(),
    ).rejects.toThrow();

    // Violates author fk
    await expect(
      db
        .insertInto("user")
        .values({ ...adminUser, author_uuid: "not-a-uuid" })
        .execute(),
    ).rejects.toThrow();

    const users = await db.selectFrom("user").selectAll().execute();

    expect(users).toStrictEqual([
      {
        uuid: adminId,
        email: "admin@test.gov",
        name: "Adam Admin",
        date_of_last_login: new Date("2024-01-01"),
        user_type: "admin",
        status: "active",
        author_uuid: adminId,
        date_created: expect.any(Date),
      },
      {
        uuid: standardId,
        email: "standard@test.gov",
        name: null,
        date_of_last_login: null,
        user_type: "standard",
        status: "active",
        author_uuid: adminId,
        date_created: expect.any(Date),
      },
    ]);

    await clearCore();
  });
});

describe("program_area table", () => {
  it("Should retrieve all inserted program_areas", async () => {
    const db = getDb<Core>();
    const prog1 = {
      uuid: "234-12",
      name: "Disease",
      author_uuid: adminId,
    };
    const prog2 = {
      uuid: "234-24",
      name: "Different Disease",
      author_uuid: adminId,
    };

    jest.spyOn(console, "error").mockImplementation();

    // Author FK doesn't exist yet
    await expect(
      db.insertInto("program_area").values(prog1).execute(),
    ).rejects.toThrow();

    // seed with admin for the fk
    await db.insertInto("user").values(adminUser).execute();

    await db.insertInto("program_area").values(prog1).execute();
    await db.insertInto("program_area").values(prog2).execute();

    // violates primary key
    await expect(
      db
        .insertInto("program_area")
        .values({ ...prog1, name: "something else" })
        .execute(),
    ).rejects.toThrow();

    // violates name uniqueness
    await expect(
      db
        .insertInto("program_area")
        .values({ ...prog1, uuid: "0912" })
        .execute(),
    ).rejects.toThrow();

    const programAreas = await db
      .selectFrom("program_area")
      .selectAll()
      .execute();

    expect(programAreas).toStrictEqual([
      {
        ...prog1,
        date_created: expect.any(Date),
      },
      {
        ...prog2,
        date_created: expect.any(Date),
      },
    ]);

    await clearCore();
  });
});

describe("user_program_area table", () => {
  it("Should retrieve all inserted user_program_areas", async () => {
    const db = getDb<Core>();
    const progId = "234-12";
    const prog = {
      uuid: "234-12",
      name: "Disease",
      author_uuid: adminId,
    };

    const userProg = {
      user_uuid: adminId,
      program_area_uuid: progId,
    };

    // Neither FK doesn't exist yet
    await expect(
      db.insertInto("user_program_area").values(userProg).execute(),
    ).rejects.toThrow();

    // seed with admin for the fk
    await db.insertInto("user").values(adminUser).execute();

    // program_area FK doesn't exist yet
    await expect(
      db.insertInto("user_program_area").values(userProg).execute(),
    ).rejects.toThrow();

    await db.insertInto("program_area").values(prog).execute();

    await db.insertInto("user_program_area").values(userProg).execute();

    // already exists
    await expect(
      db.insertInto("user_program_area").values(userProg).execute(),
    ).rejects.toThrow();

    const userProgramArea = await db
      .selectFrom("user_program_area")
      .selectAll()
      .executeTakeFirst();

    expect(userProgramArea).toStrictEqual(userProg);

    await clearCore();
  });
});
