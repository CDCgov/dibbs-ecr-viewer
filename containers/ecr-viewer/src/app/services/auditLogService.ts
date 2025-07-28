import "server-only";

import { randomUUID, createHash } from "node:crypto";

import { Transaction } from "kysely";
import { cookies, headers } from "next/headers";

import { dbIsValid } from "@/app/api/migrate-db/migrate";
import { getDb } from "@/app/data/metadataDb/database";
import { Core, NewAuditLog } from "@/app/data/metadataDb/types/core";
import { dbDialect } from "@/app/data/metadataDb/utils/db-config";

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

const auditTransaction = async <Params extends Record<string, unknown>, Ret>(
  subject: Subject,
  action: Action,
  params: Params,
  executeFn: (trx: Transaction<Core>) => Promise<Ret>,
): Promise<Ret> => {
  return await getDb<Core>()
    .transaction()
    .execute(async (trx) => {
      const result = await executeFn(trx);
      // If we get a UUID result, use that, but don't override a param UUID with undefined.
      const logParams =
        typeof result === "string" ? { ...params, uuid: result } : params;

      try {
        await createAuditRecord<Params>(trx, subject, action, logParams);
      } catch (error: unknown) {
        // Avoid getting stuck in a loop where we can't migrate/show migration issues
        // because of audit logging.
        if (await dbIsValid()) {
          throw error;
        } else {
          console.warn({
            message: "Audit logging failed as db is not in a valid state",
            error,
          });
        }
      }
      return result;
    });
};

/**
 * Wrap a function with audit logging. After the function successfully runs, an
 * audit log record will be created with the subject, action, actor (user uuid or token),
 * parameters passed to the function, and other request metadata.
 *
 * This is for functions that do not query the database, e.g. `getFhirData()`.
 * @param subject Subject of the action being audited (e.g. "ecr")
 * @param action Action being done (e.g. "view")
 * @param fn Function to audit upon successful completion. Must be called with only one argument, which is an object with all of the parameters. If it returns a string, it is assumed to be the `uuid` of the subject and will be added to the params as such. The wrapper will inject the second argument of a Kysely transaction, which should be used as the database in any queries the function executes
 * @returns Wrapped function
 */
export const auditWithoutTrx = <Params extends Record<string, unknown>, Ret>(
  subject: Subject,
  action: Action,
  fn: (params: Params) => Promise<Ret>,
) => {
  return async (params: Params): Promise<Ret> => {
    if (!dbDialect()) {
      return await fn(params);
    }

    return await auditTransaction(subject, action, params, async (_) => {
      return await fn(params);
    });
  };
};

/**
 * Wrap a function with audit logging. After the function successfully runs, an
 * audit log record will be created with the subject, action, actor (user uuid or token),
 * parameters passed to the function, and other request metadata.
 *
 * This is for functions that query a database, e.g. `createUser()`.
 * @param subject Subject of the action being audited (e.g. "user")
 * @param action Action being done (e.g. "create")
 * @param fn Function to audit upon successful completion. Must be called with only one argument, which is an object with all of the parameters. If it returns a string, it is assumed to be the `uuid` of the subject and will be added to the params as such. The wrapper will inject the second argument of a Kysely transaction, which should be used as the database in any queries the function executes
 * @returns Wrapped function
 */
export const auditWithTrx = <Params extends Record<string, unknown>, Ret>(
  subject: Subject,
  action: Action,
  fn: (params: Params, trx: Transaction<Core>) => Promise<Ret>,
) => {
  return async (params: Params): Promise<Ret> => {
    if (!dbDialect()) {
      throw new Error("Database required for transaction-based operations");
    }

    return await auditTransaction(subject, action, params, async (trx) => {
      return await fn(params, trx);
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
