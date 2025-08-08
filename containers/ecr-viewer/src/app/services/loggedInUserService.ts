import "server-only";
import { cache } from "react";

import { sql, Transaction } from "kysely";

import { getDb } from "@/app/data/metadataDb/database";
import { Core, User } from "@/app/data/metadataDb/types/core";
import { getLoggedInUserSession } from "@/app/utils/auth-utils";

/**
 * Get a db User object by email
 * @param email The user's email
 * @param trx Optionally, the transaction to run the query in
 * @returns a User or undefined
 */
export const getUserByEmail = async (
  email: string | null | undefined,
  trx?: Transaction<Core>,
): Promise<User | undefined> => {
  if (!email) return;

  return await (trx ?? getDb<Core>())
    .selectFrom("user")
    .selectAll()
    .where(sql`LOWER(email)`, "=", email?.toLowerCase())
    .executeTakeFirst();
};

/**
 * Get the db User object for the currently logged in user.
 *
 * We should think about caching this in the future, so once we
 * start using this and other crud in UI we re-use the db call.
 * @param trx Optionally, the transaction to run the query in
 * @returns Logged in User or undefined
 */
export const getLoggedInUser = cache(async (trx?: Transaction<Core>) => {
  const { email } = (await getLoggedInUserSession()) || {};
  if (!email) return;

  try {
    return await getUserByEmail(email, trx);
  } catch (error: unknown) {
    console.error({ error, message: "Failed to get logged in user" });
    return undefined;
  }
});
