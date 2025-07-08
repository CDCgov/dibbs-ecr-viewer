import "server-only";

import { randomUUID, createHash } from "node:crypto";

import { cookies, headers } from "next/headers";

import { getDb } from "@/app/data/metadataDb/database";
import { Core, NewAuditLog } from "@/app/data/metadataDb/types/core";

import { getLoggedInUser } from "./userService";

type Subject = "ecr" | "user" | "program_area";
type Action = "query" | "view" | "create" | "update" | "delete";

/**
 * Wrap a function with audit logging. After the function succesfully runs, an
 * audit log record will be created with the subject, action, actor (user uuid or token),
 * parameters passed to the function, and other request metadata.
 * @param subject Subject of the action being audited (e.g. "user")
 * @param action Action being done (e.g. "create")
 * @param fn Function to audit upon succesful completion. Must have only one argument, which is an object
 * @returns Wrapped function
 */
// need the any to infer the function type, which ignoring then confuses jsdoc
// eslint-disable-next-line @typescript-eslint/no-explicit-any, jsdoc/require-jsdoc
export const audit = <Func extends (...args: any) => any>(
  subject: Subject,
  action: Action,
  fn: Func,
) => {
  return async (
    ...args: Parameters<Func>
  ): Promise<Awaited<ReturnType<Func>>> => {
    console.log({ args, subject, action });
    // TODO PR: make this static
    if (args.length !== 1 || typeof args[0] !== "object") {
      throw new Error(
        `Audited function must have a single argument of object type, got: ${args}`,
      );
    }
    const res = await fn(args[0]);
    await createAuditRecord(subject, action, args);
    return res;
  };
};

const createAuditRecord = async (
  subject: Subject,
  action: Action,
  args: object,
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
    parameter_json: JSON.stringify(args),
    metadata_json: JSON.stringify({
      userAgent: reqHeaders.get("User-Agent"),
    }),
  };

  const checksum = createHash("sha256")
    .update(JSON.stringify(values))
    .digest("hex");
  await getDb<Core>()
    .insertInto("audit_log")
    .values({ ...values, checksum })
    .execute();
};
