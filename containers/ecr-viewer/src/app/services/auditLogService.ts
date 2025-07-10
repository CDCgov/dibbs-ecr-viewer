import "server-only";

import { randomUUID, createHash } from "node:crypto";

import { Transaction } from "kysely";
import { cookies, headers } from "next/headers";

import { getDb } from "@/app/data/metadataDb/database";
import { Core, NewAuditLog } from "@/app/data/metadataDb/types/core";

import { getLoggedInUser } from "./userService";

type Subject = "ecr" | "user" | "program_area";
type Action = "query" | "view" | "create" | "update" | "delete";

type AuditableFn<Param extends Record<string, unknown>, Ret> = (
  params: Param,
  trx: Transaction<Core>,
) => Promise<Ret>;

/**
 * Wrap a function with audit logging. After the function succesfully runs, an
 * audit log record will be created with the subject, action, actor (user uuid or token),
 * parameters passed to the function, and other request metadata.
 * @param subject Subject of the action being audited (e.g. "user")
 * @param action Action being done (e.g. "create")
 * @param fn Function to audit upon succesful completion. Must be called with only one argument, which is an object. The wrapper will inject the second argument of a Kysely transaction, which should be used as the database in any queries the function executes
 * @returns Wrapped function
 */
export const audit = <Param extends Record<string, unknown>, Ret>(
  subject: Subject,
  action: Action,
  fn: AuditableFn<Param, Ret>,
) => {
  return async (params: Param): Promise<Ret> => {
    return await getDb<Core>()
      .transaction()
      .execute(async (trx) => {
        const res = await fn(params, trx);
        await createAuditRecord(trx, subject, action, params);
        return res;
      });
  };
};

const createAuditRecord = async (
  trx: Transaction<Core>,
  subject: Subject,
  action: Action,
  params: object,
) => {
  const uuid = randomUUID();
  const user = await getLoggedInUser();
  const reqHeaders = headers();
  const reqCookies = cookies();
  const apiToken =
    reqHeaders.get("Authorization") || reqCookies.get("auth-token")?.value;

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
