import "server-only";
import { cache } from "react";
import { randomUUID } from "node:crypto";

import { Kysely } from "kysely";

import { getDb } from "@/app/data/metadataDb/database";
import {
  Core,
  NewUser,
  ProgramArea,
  User,
  UserUpdate,
} from "@/app/data/metadataDb/types/core";
import { getLoggedInUserSession } from "@/app/utils/auth-utils";

const getUserByEmail = async (
  email: string | null | undefined,
): Promise<User | undefined> => {
  if (!email) return;

  return await getDb<Core>()
    .selectFrom("user")
    .selectAll()
    .where("email", "=", email)
    .executeTakeFirst();
};

/**
 * Get the db User object for the currently logged in user.
 *
 * Cached so once we start using this and other crud in UI
 * we re-use the db call.
 */
export const getLoggedInUser = cache(async () => {
  const { email, name } = (await getLoggedInUserSession()) || {};
  if (!email) return;

  // Update the last log in and user's name to match the IDP
  await getDb<Core>()
    .updateTable("user")
    .set({ date_of_last_login: new Date(), name })
    .where("email", "=", email)
    .execute();

  return await getUserByEmail(email);
});

/**
 * @param user User to check is an admin
 * @returns true is the user both exists and is an admin, false otherwise
 */
export const isAdmin = (user: User | undefined): user is User =>
  !!user && user.user_type === "admin" && user.status === "active";

/**
 * Create a user with the given email and user type. The currently logged in user
 * must be an admin and not actively exist, otherwise an error will be thrown. If
 * exists, but is not active. They will be reactivated with the user type passed.
 * @param email Email of the user to add
 * @param user_type Type of user to create ("admiin" or "standard")
 * @returns UUID of the created user
 */
export const createUser = async (
  email: string,
  user_type: "admin" | "standard",
): Promise<string> => {
  const creatingUser = await getLoggedInUser();
  if (!isAdmin(creatingUser)) {
    throw new Error("Standard user cannot create new users");
  }

  try {
    const uuid = randomUUID();
    return await createUserQuery(email, user_type, uuid, creatingUser.uuid);
  } catch (error: unknown) {
    const message = "Failed to create new user";
    console.error({ message, error });
    throw new Error(message);
  }
};

/**
 * Create an initial admin user with the given email. If any active
 * admin already exists, this will do nothing.
 * @param email Email of the user to add
 * @returns UUID of the created user
 */
export const createInitialAdminUser = async (
  email: string,
): Promise<string | undefined> => {
  const users = await listActiveUsersQuery();
  if (users.some(({ user_type }) => user_type === "admin")) {
    console.warn("Active admin user already exists. Skipping user creation.");
    return;
  }

  try {
    const uuid = randomUUID();
    return await createUserQuery(email, "admin", uuid, uuid);
  } catch (error: unknown) {
    const message = "Failed to create initial admin user";
    console.error({ message, error });
    throw new Error(message);
  }
};

const createUserQuery = async (
  email: string,
  user_type: "admin" | "standard",
  uuid: string,
  author_uuid: string,
) => {
  const user = await getUserByEmail(email);
  if (!!user) {
    if (user.status === "active") {
      throw new Error("User already exists and is active");
    } else {
      await updateUserQuery(user.uuid, { status: "active", user_type });
      return user.uuid;
    }
  }

  const newUser: NewUser = {
    uuid,
    email,
    user_type,
    author_uuid,
  };

  await getDb<Core>().insertInto("user").values(newUser).execute();
  return uuid;
};

/**
 * Update a user with the the given id.
 * @param uuid id of the user to update
 * @param updates objecct with fields to update in their record. UUID fields should not be updated.
 */
export const updateUser = async (
  uuid: string,
  updates: Omit<UserUpdate, "uuid" | "author_uuid">,
): Promise<void> => {
  const updatingUser = await getLoggedInUser();
  if (!isAdmin(updatingUser)) {
    throw new Error("Standard user cannot update users");
  }

  try {
    await updateUserQuery(uuid, updates);
  } catch (error: unknown) {
    const message = "Failed to update user";
    console.error({ message, error });
    throw new Error(message);
  }
};

const updateUserQuery = async (
  uuid: string,
  updates: Omit<UserUpdate, "uuid" | "author_uuid">,
) => {
  await getDb<Core>()
    .updateTable("user")
    .set(updates)
    .where("uuid", "=", uuid)
    .execute();
};

/**
 * List the program areas a user is assigned to.
 * @param uuid id of the user to update
 * @returns list of program areas
 */
export const listUserProgramAreas = async (
  uuid: string,
): Promise<ProgramArea[]> => {
  const listingUser = await getLoggedInUser();
  if (!isAdmin(listingUser)) {
    throw new Error("Standard user cannot list user program areas");
  }

  try {
    return await getDb<Core>()
      .selectFrom(["user_program_area", "program_area"])
      .selectAll(["program_area"])
      .where("user_uuid", "=", uuid)
      .where(({ eb, ref }) =>
        eb("user_program_area.program_area_uuid", "=", ref("uuid")),
      )
      .execute();
  } catch (error: unknown) {
    const message = "Failed to list user program areas";
    console.error({ message, error });
    throw new Error(message);
  }
};

/**
 * Update a user with the the given id's program areas to the given set.
 * @param uuid id of the user to update
 * @param programAreaUuids UUIDs of program areas the user is assigned to.
 */
export const updateUserProgramAreas = async (
  uuid: string,
  programAreaUuids: string[],
): Promise<void> => {
  const updatingUser = await getLoggedInUser();
  if (!isAdmin(updatingUser)) {
    throw new Error("Standard user cannot update users");
  }

  try {
    await getDb<Core>()
      .transaction()
      .execute(async (db) => {
        await deleteUserProgramAreas(db, uuid);
        for (const program_area_uuid of programAreaUuids) {
          await db
            .insertInto("user_program_area")
            .values({ user_uuid: uuid, program_area_uuid })
            .execute();
        }
      });
  } catch (error: unknown) {
    const message = "Failed to update user";
    console.error({ message, error });
    throw new Error(message);
  }
};

const deleteUserProgramAreas = async (db: Kysely<Core>, uuid: string) => {
  await db
    .deleteFrom("user_program_area")
    .where("user_uuid", "=", uuid)
    .execute();
};

/**
 * Delete user with the given id. The deleting user must be an admin. A
 * user can indeed delete themselves.
 * @param uuid Email of the user to delete
 */
export const deleteUser = async (uuid: string): Promise<void> => {
  const deletingUser = await getLoggedInUser();
  if (!isAdmin(deletingUser)) {
    throw new Error("Standard user cannot delete users");
  }

  try {
    await updateUserQuery(uuid, { status: "deleted" });
    await deleteUserProgramAreas(getDb<Core>(), uuid);
  } catch (error: unknown) {
    const message = "Failed to delete user";
    console.error({ message, error });
    throw new Error(message);
  }
};

/**
 * List all active users. The logged in user must be an admin.
 * @returns list of all active users
 */
export const listUsers = async (): Promise<User[]> => {
  const listingUser = await getLoggedInUser();
  if (!isAdmin(listingUser)) {
    throw new Error("Standard user cannot list users");
  }

  try {
    return await listActiveUsersQuery();
  } catch (error: unknown) {
    const message = "Failed to list users";
    console.error({ message, error });
    throw new Error(message);
  }
};

const listActiveUsersQuery = async () => {
  return await getDb<Core>()
    .selectFrom("user")
    .selectAll()
    .where("status", "=", "active")
    .orderBy("email")
    .execute();
};
