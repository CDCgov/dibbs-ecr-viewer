import "server-only";

import { randomUUID, createHash } from "node:crypto";

import { Transaction } from "kysely";
import { cookies, headers } from "next/headers";

import { getDb } from "@/app/data/metadataDb/database";
import { Core, NewAuditLog, User } from "@/app/data/metadataDb/types/core";

import { getLoggedInUser } from "./loggedInUserService";

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
 * Wrap a function with audit logging. After the function succesfully runs, an
 * audit log record will be created with the subject, action, actor (user uuid or token),
 * parameters passed to the function, and other request metadata.
 * @param subject Subject of the action being audited (e.g. "user")
 * @param action Action being done (e.g. "create")
 * @param fn Function to audit upon succesful completion. Must be called with only one argument, which is an object with all of the parameters. It can return either the UUID of the subject or void. The wrapper will inject the second argument of a Kysely transaction, which should be used as the database in any queries the function executes
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
    // get user outside of the transaction to avoid some sqlserver strangeness
    const user = await getLoggedInUser();
    return await getDb<Core>()
      .transaction()
      .execute(async (trx) => {
        const uuid = await fn(params, trx);
        // if we get a uuid result, use that, but don't override a param uuid with undefined
        const logParams =
          typeof uuid === "string" ? { ...params, uuid } : params;
        await createAuditRecord<Params>(trx, user, subject, action, logParams);
        return uuid;
      });
  };
};

const createAuditRecord = async <Params extends Record<string, unknown>>(
  trx: Transaction<Core>,
  user: User | undefined,
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
  if (action === "signin" && (params?.user as Record<string, string>)?.email) {
    user = await trx
      .selectFrom("user")
      .selectAll()
      .where("email", "=", (params.user as Record<string, string>).email)
      .executeTakeFirst();
  }

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
