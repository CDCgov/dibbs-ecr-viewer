import { Kysely } from "kysely";

import { Core } from "./core_types";
import { dialect } from "./dialects/sql";
import { Extended } from "./extended_types";

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
