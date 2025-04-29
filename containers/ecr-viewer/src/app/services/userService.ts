import "server-only";
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

const getLoggedInUser = async () => {
  const { email } = (await getLoggedInUserSession()) || {};
  return await getUserByEmail(email);
};

const isAdmin = (user: User | undefined): user is User =>
  !!user && user.user_type === "admin" && user.status === "active";

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
  const creatingUser = await getLoggedInUser();
  if (!isAdmin(creatingUser)) {
    throw new Error("Standard user cannot create new users");
  }

  const user = await getUserByEmail(email);
  if (!!user) {
    if (user.status === "active") {
      throw new Error("User already exists and is active");
    } else {
      await updateUserByEmail(email, { status: "active", user_type });
      return user.uuid;
    }
  }

  const uuid = randomUUID();
  const newUser: NewUser = {
    uuid,
    email,
    user_type,
    author_uuid: creatingUser.uuid,
  };

  try {
    await getDb<Core>().insertInto("user").values(newUser).execute();
  } catch (error: unknown) {
    const message = "Failed to create new user";
    console.error({ message, error });
    throw new Error(message);
  }

  return uuid;
};

/**
 * Delete user with the given email. The deleting user must be an admin. A
 * user can indeed delete themselves.
 * @param email Email of the user to delete
 */
export const deleteUser = async (email: string): Promise<void> => {
  const deletingUser = await getLoggedInUser();
  if (!isAdmin(deletingUser)) {
    throw new Error("Standard user cannot delete users");
  }

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
  const listingUser = await getLoggedInUser();
  if (!isAdmin(listingUser)) {
    throw new Error("Standard user cannot list users");
  }

  try {
    return await getDb<Core>()
      .selectFrom("user")
      .selectAll()
      .where("status", "=", "active")
      .execute();
  } catch (error: unknown) {
    const message = "Failed to list users";
    console.error({ message, error });
    throw new Error(message);
  }
};

/**
 * Update a user with the the given email.
 * @param email (current) email of the user to update
 * @param updates mutable fields to update in their record. UUID fields should not be updated.
 */
export const updateUserByEmail = async (
  email: string,
  updates: Omit<UserUpdate, "uuid" | "author_uuid">,
): Promise<void> => {
  const updatingUser = await getLoggedInUser();
  if (!isAdmin(updatingUser)) {
    throw new Error("Standard user cannot update users");
  }

  try {
    await getDb<Core>()
      .updateTable("user")
      .set(updates)
      .where("email", "=", email)
      .execute();
  } catch (error: unknown) {
    const message = "Failed to update user";
    console.error({ message, error });
    throw new Error(message);
  }
};
