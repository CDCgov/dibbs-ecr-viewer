import "server-only";
import { cache } from "react";

import { getDb } from "@/app/data/metadataDb/database";
import { Core, User } from "@/app/data/metadataDb/types/core";
import { getLoggedInUserSession } from "@/app/utils/auth-utils";

/**
 * Get a db User object by email
 * @param email The user's email
 * @returns a User or undefined
 */
export const getUserByEmail = async (
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
  const { email } = (await getLoggedInUserSession()) || {};
  if (!email) return;

  try {
    return await getUserByEmail(email);
  } catch (error: unknown) {
    console.error({ error, message: "Failed to get logged in user" });
    return undefined;
  }
});
