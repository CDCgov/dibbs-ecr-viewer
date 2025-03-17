// Kysely ORM Connection Client

import { Kysely } from "kysely";
import { Core } from "./core_types";
import { Extended } from "./extended_types";
import { sqlConstructor } from "./buildSql";
import { pgConstructor } from "./buildPg";

// Dialect to communicate with the database, interface to define its structure.

let db: Kysely<Core> | Kysely<Extended>;

const db_type = process.env.METADATA_DATABASE_TYPE;
const db_schema = process.env.METADATA_DATABASE_SCHEMA;

switch (db_type) {
  case "sqlserver":
    if (db_schema === "extended") {
      db = sqlConstructor("extended");
    } else {
      db = sqlConstructor("core");
    }
  case "postgres":
    if (db_schema === "extended") {
      db = pgConstructor("extended");
    } else {
      db = pgConstructor("core");
    }
}

export { db };
