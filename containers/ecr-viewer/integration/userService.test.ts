/**
 * @jest-environment node
 */

import {
  createInitialAdminUser,
  createUser,
  deleteUser,
  listUsers,
  updateUserByEmail,
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
  it("should create initial admin user", async () => {
    const id = await createInitialAdminUser(adminEmail);
    expect(id).toMatch(UUID_REGEX);

    // see admin listed
    const users = await listUsers();
    expect(users).toBeArrayOfSize(1);
    expect(users).toStrictEqual([
      {
        uuid: id,
        email: adminEmail,
        name: adminName,
        date_of_last_login: null,
        user_type: "admin",
        status: "active",
        author_uuid: id,
        date_created: expect.any(Date),
      },
    ]);

    // adding again with same email should do nothing
    const notId = await createInitialAdminUser(adminEmail);
    expect(notId).toBeUndefined();

    // adding with different email should do nothing
    const alsoNotId = await createInitialAdminUser("other@admin.com");
    expect(alsoNotId).toBeUndefined();

    // admin deletes themself
    await deleteUser(adminEmail);

    const noUsers = await listUsers();
    expect(noUsers).toBeArrayOfSize(0);

    //admin re-adds themself, gets same id
    const newId = await createInitialAdminUser(adminEmail);
    expect(newId).toBe(id);

    // see admin listed
    const afterUsers = await listUsers();
    expect(afterUsers).toBeArrayOfSize(1);
    expect(afterUsers).toStrictEqual([
      {
        uuid: id,
        email: adminEmail,
        name: adminName,
        date_of_last_login: null,
        user_type: "admin",
        status: "active",
        author_uuid: id,
        date_created: expect.any(Date),
      },
    ]);
  });

  it("should create a standard user", async () => {
    // admin created in prior test
    const id = await createUser(userEmail, "standard");
    expect(id).toMatch(UUID_REGEX);

    // see standard user listed
    const users = await listUsers();
    expect(users).toBeArrayOfSize(2);
    expect(users).toStrictEqual([
      {
        uuid: expect.any(String),
        email: adminEmail,
        name: adminName,
        date_of_last_login: null,
        user_type: "admin",
        status: "active",
        author_uuid: expect.any(String),
        date_created: expect.any(Date),
      },
      {
        uuid: id,
        email: userEmail,
        name: null,
        date_of_last_login: null,
        user_type: "standard",
        status: "active",
        author_uuid: expect.any(String),
        date_created: expect.any(Date),
      },
    ]);
  });

  it("should update a user", async () => {
    // standard user created in prior test
    await updateUserByEmail(userEmail, { name: "Olga Nunes" });

    // see standard user listed with name
    const users = await listUsers();
    expect(users).toBeArrayOfSize(2);
    expect(users).toStrictEqual([
      {
        uuid: expect.any(String),
        email: adminEmail,
        name: adminName,
        date_of_last_login: null,
        user_type: "admin",
        status: "active",
        author_uuid: expect.any(String),
        date_created: expect.any(Date),
      },
      {
        uuid: expect.any(String),
        email: userEmail,
        name: "Olga Nunes",
        date_of_last_login: null,
        user_type: "standard",
        status: "active",
        author_uuid: expect.any(String),
        date_created: expect.any(Date),
      },
    ]);
  });
});
