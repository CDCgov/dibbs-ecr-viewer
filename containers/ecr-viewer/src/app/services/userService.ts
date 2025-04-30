import "server-only";
import { cache } from "react";
import { randomUUID } from "node:crypto";

import { getDb } from "@/app/data/metadataDb/database";
import {
  Core,
  NewUser,
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

  // Update the user's name to match the IDP
  !!name && (await updateUserQuery(email, { name }));

  return await getUserByEmail(email);
});

const isAdmin = (user: User | undefined): user is User =>
  !!user && user.user_type === "admin" && user.status === "active";

/**
 * Check the currently logged in user is an admin and return them. Throws
 * an error if the currently logged in user isn't an admin.
 * @param actionDesc description of the action that only admins can do
 * @returns admin user
 */
export const getCheckAdmin = async (actionDesc: string): Promise<User> => {
  const loggedInUser = await getLoggedInUser();
  if (!isAdmin(loggedInUser)) {
    throw new Error(`Standard user cannot ${actionDesc}`);
  }

  return loggedInUser;
};

/**
 * Create a user with the given email and user type. The currently logged in user
 * must be an admin and not actively exist, otherwise an error will be throw. If
 * exists, but is not active. They will be reactivated with the user type passed.
 * @param email Email of the user to add
 * @param user_type Type of user to create ("admiin" or "standard")
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
      await updateUserQuery(email, { status: "active", user_type });
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
 * Update a user with the the given email.
 * @param email (current) email of the user to update
 * @param updates objecct with fields to update in their record. UUID fields should not be updated.
 */
export const updateUserByEmail = async (
  email: string,
  updates: Omit<UserUpdate, "uuid" | "author_uuid">,
): Promise<void> => {
  await getCheckAdmin("update users");

  try {
    await updateUserQuery(email, updates);
  } catch (error: unknown) {
    const message = "Failed to update user";
    console.error({ message, error });
    throw new Error(message);
  }
};

const updateUserQuery = async (
  email: string,
  updates: Omit<UserUpdate, "uuid" | "author_uuid">,
) => {
  await getDb<Core>()
    .updateTable("user")
    .set(updates)
    .where("email", "=", email)
    .execute();
};

/**
 * Delete user with the given email. The deleting user must be an admin. A
 * user can indeed delete themselves.
 * @param email Email of the user to delete
 */
export const deleteUser = async (email: string): Promise<void> => {
  await getCheckAdmin("delete users");

  try {
    await getDb<Core>()
      .updateTable("user")
      .set({ status: "deleted" })
      .where("email", "=", email)
      .execute();
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
  await getCheckAdmin("list users");

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
