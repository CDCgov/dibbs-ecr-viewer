import { Kysely } from "kysely";

import { Core } from "./core_types";
import { dialect } from "./dialects/postgres";
import { Extended } from "./extended_types";

/**
 * construct a postgres db instance
 * @param schema core or extended
 * @returns postgres db instance
 */
export const pgConstructor = (schema: "core" | "extended") => {
  if (schema === "core") {
    return new Kysely<Core>(dialect);
  } else if (schema === "extended") {
    return new Kysely<Extended>(dialect);
  } else {
    throw new Error("Invalid schema type.");
  }
};
