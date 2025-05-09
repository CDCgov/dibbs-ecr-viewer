/**
 * @jest-environment node
 */

import { createProgramArea } from "@/app/services/programAreaService";
import {
  createInitialAdminUser,
  createUser,
  deleteUser,
  listUserProgramAreas,
  listUsers,
  updateUser,
  updateUserProgramAreas,
} from "@/app/services/userService";

import { buildCore, dropExisting } from "./helpers/ddl";

beforeAll(async () => {
  await buildCore();
});

afterAll(async () => {
  await dropExisting();
});

const adminEmail = "admin@admin.com";
const adminName = "Adam Admin";
const userEmail = "standard@user.com";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

jest.mock("../src/app/utils/auth-utils", () => ({
  getLoggedInUserSession: jest
    .fn()
    .mockResolvedValue({ name: "Adam Admin", email: "admin@admin.com" }),
}));

describe("user service", () => {
  let adminId;
  let userId;
  it("should create initial admin user", async () => {
    let warning: string[] = [];
    jest.spyOn(console, "warn").mockImplementation((...args) => {
      warning = args;
    });
    adminId = await createInitialAdminUser(adminEmail);
    expect(adminId).toMatch(UUID_REGEX);

    // see admin listed
    const users = await listUsers();
    expect(users).toBeArrayOfSize(1);
    expect(users).toStrictEqual([
      {
        uuid: adminId,
        email: adminEmail,
        name: adminName,
        date_of_last_login: expect.any(Date),
        user_type: "admin",
        status: "active",
        author_uuid: adminId,
        date_created: expect.any(Date),
        program_areas: [],
      },
    ]);

    // adding again with same email should do nothing
    const notId = await createInitialAdminUser(adminEmail);
    expect(notId).toBeUndefined();
    expect(warning[0]).toContain("Active admin user already exists");
    warning = [];

    // adding with different email should do nothing
    const alsoNotId = await createInitialAdminUser("other@admin.com");
    expect(alsoNotId).toBeUndefined();
    expect(warning[0]).toContain("Active admin user already exists");

    // admin deletes themself
    await deleteUser(adminId!);

    // Current user isn't an admin any more!
    await expect(listUsers()).rejects.toThrow();

    //admin re-adds themself, gets same id
    const newId = await createInitialAdminUser(adminEmail);
    expect(newId).toBe(adminId);

    // see admin listed
    const afterUsers = await listUsers();
    expect(afterUsers).toBeArrayOfSize(1);
    expect(afterUsers).toStrictEqual([
      {
        uuid: adminId,
        email: adminEmail,
        name: adminName,
        date_of_last_login: expect.any(Date),
        user_type: "admin",
        status: "active",
        author_uuid: adminId,
        date_created: expect.any(Date),
        program_areas: [],
      },
    ]);
  });

  it("should create a standard user", async () => {
    // admin created in prior test
    userId = await createUser(userEmail, "standard");
    expect(userId).toMatch(UUID_REGEX);

    // see standard user listed
    const users = await listUsers();
    expect(users).toBeArrayOfSize(2);
    expect(users).toStrictEqual([
      {
        uuid: expect.any(String),
        email: adminEmail,
        name: adminName,
        date_of_last_login: expect.any(Date),
        user_type: "admin",
        status: "active",
        author_uuid: adminId!,
        date_created: expect.any(Date),
        program_areas: [],
      },
      {
        uuid: userId,
        email: userEmail,
        name: null,
        date_of_last_login: null,
        user_type: "standard",
        status: "active",
        author_uuid: adminId!,
        date_created: expect.any(Date),
        program_areas: [],
      },
    ]);
  });

  it("should update a user", async () => {
    // standard user created in prior test
    await updateUser(userId!, { name: "Olga Nunes" });

    // see standard user listed with name
    const users = await listUsers();
    expect(users).toBeArrayOfSize(2);
    expect(users).toStrictEqual([
      {
        uuid: adminId!,
        email: adminEmail,
        name: adminName,
        date_of_last_login: expect.any(Date),
        user_type: "admin",
        status: "active",
        author_uuid: adminId!,
        date_created: expect.any(Date),
        program_areas: [],
      },
      {
        uuid: userId!,
        email: userEmail,
        name: "Olga Nunes",
        date_of_last_login: null,
        user_type: "standard",
        status: "active",
        author_uuid: adminId!,
        date_created: expect.any(Date),
        program_areas: [],
      },
    ]);
  });

  it("should update a user's program areas", async () => {
    // standard user created in prior test
    await updateUser(userId!, { name: "Olga Nunes" });
    const progId = await createProgramArea("Disease", []);

    await updateUserProgramAreas(userId!, [progId]);

    const progAreas = await listUserProgramAreas(userId!);

    expect(progAreas).toStrictEqual([
      {
        uuid: progId,
        author_uuid: adminId!,
        name: "Disease",
        date_created: expect.any(Date),
      },
    ]);
  });

  it("should delete a user", async () => {
    // standard user created in prior test
    await deleteUser(userId!);

    // see only admin user listed
    const users = await listUsers();
    expect(users).toBeArrayOfSize(1);
    expect(users).toStrictEqual([
      {
        uuid: adminId!,
        email: adminEmail,
        name: adminName,
        date_of_last_login: expect.any(Date),
        user_type: "admin",
        status: "active",
        author_uuid: adminId!,
        date_created: expect.any(Date),
        program_areas: [],
      },
    ]);

    // should also delete program area assignments
    const progAreas = await listUserProgramAreas(userId!);
    expect(progAreas).toStrictEqual([]);
  });
});
