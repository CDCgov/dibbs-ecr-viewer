import "server-only";
import { cache } from "react";
import { randomUUID } from "node:crypto";

import { Kysely } from "kysely";
import { notFound } from "next/navigation";

import { getDb } from "@/app/data/metadataDb/database";
import {
  Core,
  NewUser,
  ProgramArea,
  User,
  UserUpdate,
  UserProgramArea,
} from "@/app/data/metadataDb/types/core";
import { getLoggedInUserSession } from "@/app/utils/auth-utils";

import { UserFacingError } from "./errorService";

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
 * We should think about caching this in the future, so once we
 * start using this and other crud in UI we re-use the db call.
 * @returns Logged in User or undefined
 */
export const getLoggedInUser = cache(async () => {
  const { email, name } = (await getLoggedInUserSession()) || {};
  if (!email) return;

  try {
    // Update the last log in and user's name to match the IDP
    await getDb<Core>()
      .updateTable("user")
      .set({ date_of_last_login: new Date(), name })
      .where("email", "=", email)
      .execute();

    return await getUserByEmail(email);
  } catch (error: unknown) {
    console.error({ error, message: "Failed to get logged in user" });
    return undefined;
  }
});

/**
 * @param user User to check is an admin
 * @returns true is the user both exists and is an admin, false otherwise
 */
export const isAdmin = (user: User | undefined): user is User =>
  !!user && user.user_type === "admin" && user.status === "active";

/**
 * If the logged in user is not an admin, force the page calling this to 404.
 */
export const notFoundUnlessAdmin = async () => {
  const admin = await getLoggedInUser();
  if (!isAdmin(admin)) {
    notFound();
  }
};

/**
 * Check the currently logged in user is an admin and return them. Throws
 * an error if the currently logged in user isn't an admin.
 * @param actionDesc description of the action that only admins can do
 * @returns admin user
 */
export const getCheckAdmin = async (actionDesc: string): Promise<User> => {
  const loggedInUser = await getLoggedInUser();
  if (!isAdmin(loggedInUser)) {
    throw new UserFacingError(`Standard user cannot ${actionDesc}`);
  }

  return loggedInUser;
};

/**
 * Create a user with the given email and user type. The currently logged in user
 * must be an admin and not actively exist, otherwise an error will be thrown. If
 * exists, but is not active. They will be reactivated with the user type passed.
 * @param email Email of the user to add
 * @param user_type Type of user to create ("admin" or "standard")
 * @returns UUID of the created user
 */
export const createUser = async (
  email: string,
  user_type: "admin" | "standard",
): Promise<string> => {
  const creatingUser = await getCheckAdmin("create new users");

  try {
    const uuid = randomUUID();
    return await createUserQuery(email, user_type, uuid, creatingUser.uuid);
  } catch (error: unknown) {
    const message = "Failed to create new user";
    console.error({ message, error });
    throw new UserFacingError(message);
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
  const users = await listActiveUsersQuery(getDb<Core>());
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
    throw new UserFacingError(message);
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
      throw new UserFacingError("User already exists and is active");
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
  await getCheckAdmin("update users");

  try {
    await updateUserQuery(uuid, updates);
  } catch (error: unknown) {
    const message = "Failed to update user";
    console.error({ message, error });
    throw new UserFacingError(message);
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
  await getCheckAdmin("list user program areas");

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
    throw new UserFacingError(message);
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
  await getCheckAdmin("update user program areas");

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
    throw new UserFacingError(message);
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
  await getCheckAdmin("delete users");

  try {
    await updateUserQuery(uuid, { status: "deleted" });
    await deleteUserProgramAreas(getDb<Core>(), uuid);
  } catch (error: unknown) {
    const message = "Failed to delete user";
    console.error({ message, error });
    throw new UserFacingError(message);
  }
};

export type NamedUserPogramArea = UserProgramArea & { name: string };
export type ListedUser = User & { program_areas: NamedUserPogramArea[] };

/**
 * List all active users. The logged in user must be an admin.
 * @returns list of all active users
 */
export const listUsers = async (): Promise<ListedUser[]> => {
  await getCheckAdmin("list users");

  try {
    return await getDb<Core>()
      .transaction()
      .execute(async (db) => {
        const users = await listActiveUsersQuery(db);
        const userProgramAreas = await db
          .selectFrom("user_program_area")
          .innerJoin(
            "program_area",
            "user_program_area.program_area_uuid",
            "program_area.uuid",
          )
          .select([
            "user_program_area.user_uuid",
            "user_program_area.program_area_uuid",
            "program_area.name",
          ])
          .execute();

        return users.map((user) => ({
          ...user,
          program_areas: userProgramAreas.filter(
            ({ user_uuid }) => user_uuid === user.uuid,
          ),
        }));
      });
  } catch (error: unknown) {
    const message = "Failed to list users";
    console.error({ message, error });
    throw new UserFacingError(message);
  }
};

const listActiveUsersQuery = async (db: Kysely<Core>) => {
  return await db
    .selectFrom("user")
    .selectAll()
    .where("status", "=", "active")
    .orderBy("email")
    .execute();
};
