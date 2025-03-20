import { Kysely } from "kysely";

import { dialect } from "./dialects/sqlserver";
import { Core } from "./types/core";
import { Extended } from "./types/extended";

/**
 * construct a sql server db instance
 * @param schema core or extended
 * @returns sql server db instance
 */
export const sqlConstructor = (schema: "core" | "extended") => {
  if (schema === "core") {
    return new Kysely<Core>(dialect);
  } else if (schema === "extended") {
    return new Kysely<Extended>(dialect);
  } else {
    throw new Error("Invalid schema type.");
  }
};
