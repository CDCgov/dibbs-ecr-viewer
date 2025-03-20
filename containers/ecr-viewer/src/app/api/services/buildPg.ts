import { Kysely } from "kysely";

import { dialect } from "./dialects/postgres";
import { Core } from "./types/core";
import { Extended } from "./types/extended";

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
