import "server-only";

import { randomUUID, createHash } from "node:crypto";

import { Transaction } from "kysely";
import { cookies, headers } from "next/headers";

import { dbIsValid } from "@/app/api/migrate-db/migrate";
import { getDb } from "@/app/data/metadataDb/database";
import { Core, NewAuditLog } from "@/app/data/metadataDb/types/core";

import { getLoggedInUser, getUserByEmail } from "./loggedInUserService";

type Subject = "ecr" | "user" | "program_area";
type Action =
  | "query"
  | "view"
  | "create"
  | "update"
  | "delete"
  | "signin"
  | "signout";

type AuditableFn<
  Params extends Record<string, unknown>,
  Ret extends string | boolean | void,
> = (params: Params, trx: Transaction<Core>) => Promise<Ret>;

/**
 * Wrap a function with audit logging. After the function successfully runs, an
 * audit log record will be created with the subject, action, actor (user uuid or token),
 * parameters passed to the function, and other request metadata.
 * @param subject Subject of the action being audited (e.g. "user")
 * @param action Action being done (e.g. "create")
 * @param fn Function to audit upon successful completion. Must be called with only one argument, which is an object with all of the parameters. If it returns a string, it is assumed to be the `uuid` of the subject and will be added to the params as such. The wrapper will inject the second argument of a Kysely transaction, which should be used as the database in any queries the function executes
 * @returns Wrapped function
 */
export const audit = <
  Params extends Record<string, unknown>,
  Ret extends string | boolean | void,
>(
  subject: Subject,
  action: Action,
  fn: AuditableFn<Params, Ret>,
) => {
  return async (params: Params): Promise<Ret> => {
    return await getDb<Core>()
      .transaction()
      .execute(async (trx) => {
        const uuid = await fn(params, trx);
        // if we get a uuid result, use that, but don't override a param uuid with undefined
        const logParams =
          typeof uuid === "string" ? { ...params, uuid } : params;

        try {
          await createAuditRecord<Params>(trx, subject, action, logParams);
        } catch (error: unknown) {
          // avoid getting stuck in a loop where we can't migrate/show migration issues
          // because of audit logging
          if (await dbIsValid()) {
            throw error;
          } else {
            // There is a db, but it isn't valid
            console.warn({
              message: "Audit logging failed as db is not in a valid state",
              error,
            });
          }
        }
        return uuid;
      });
  };
};

/**
 * Create an audit record on a transaction. This is a lower level function and should rarely
 * directly be used. See `audit` for a wrapper to use in most cases
 * @param trx kysely transaction
 * @param subject Subject of the action being audited (e.g. "user")
 * @param action Action being done (e.g. "create")
 * @param params Parameters being logged
 */
export const createAuditRecord = async <Params extends Record<string, unknown>>(
  trx: Transaction<Core>,
  subject: Subject,
  action: Action,
  params: Params,
) => {
  const uuid = randomUUID();
  const reqHeaders = headers();
  const reqCookies = cookies();
  const apiToken =
    reqHeaders.get("Authorization") || reqCookies.get("auth-token")?.value;

  // Override user on signin log, otherwise we get an auth token as the actor as they
  // aren't yet actually fully logged in
  const user =
    action === "signin" && (params?.user as Record<string, string>)?.email
      ? await getUserByEmail((params.user as Record<string, string>).email, trx)
      : await getLoggedInUser(trx);

  const values: Omit<NewAuditLog, "checksum"> = {
    uuid,
    subject,
    action,
    actor: user?.uuid || apiToken || "unknown",
    parameter_json: JSON.stringify(params),
    metadata_json: JSON.stringify({
      userAgent: reqHeaders.get("User-Agent"),
    }),
  };

  const checksum = createHash("sha256")
    .update(JSON.stringify(values))
    .digest("hex");

  await trx
    .insertInto("audit_log")
    .values({ ...values, checksum })
    .execute();
};
