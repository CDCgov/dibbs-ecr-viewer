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
 *
 * @param email
 * @param user_type
 */
export const createUser = async (
  email: string,
  user_type: "admin" | "standard",
): Promise<string> => {
  const creatingUser = await getLoggedInUser();
  if (!isAdmin(creatingUser)) {
    throw new Error("Standard user cannot create new users");
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
 *
 * @param email
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
 *
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
 *
 * @param email
 * @param updates
 */
export const updateUserByEmail = async (
  email: string,
  updates: UserUpdate,
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
