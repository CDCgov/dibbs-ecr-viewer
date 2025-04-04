/**
 * @jest-environment node
 */

// import { migrate } from "@/app/data/db/utils/migrate";
import { dbNamespace, getDb } from "@/app/api/services/database";
import { Kysely } from "kysely";
import { migrate } from "@/app/data/db/utils/migrate";

const db = getDb();
const schema = dbNamespace();

describe("Migrations: ", () => {
  afterAll(async () => {
    await db.destroy();
  });

  describe("database before migrations", () => {
    it("has a blank schema", async () => {
      let result;
      const schemaExists = await (db as Kysely<any>)
        .selectFrom("information_schema.schemata")
        .select("schema_name")
        .where("schema_name", "=", "test_ev_schema")
        .executeTakeFirst();

      if (schemaExists) {
        result = await (db as Kysely<any>)
          .selectFrom(schema + ".ecr_data")
          .selectAll()
          .executeTakeFirst();
      } else {
        result = undefined;
      }
      console.log(result);

      expect(result).toBeUndefined();
    });
  });

  describe("database after migrations", () => {
    beforeAll(async () => {
      process.env.METADATA_DATABASE_SCHEMA = "core";
      await migrate("up");
    });

    it("and the common schema", async () => {
      const commonCheck = await (db as Kysely<any>)
        .selectFrom(schema + ".ecr_rr_conditions")
        .select("uuid")
        .executeTakeFirst();

      expect(commonCheck).not.toBeUndefined();
    });

    it("and builds properly", async () => {
      const coreCheck = await (db as Kysely<any>)
        .selectFrom(schema + ".ecr_data")
        .select("patient_name_first")
        .executeTakeFirst();

      const extendedCheck = await (db as Kysely<any>)
        .selectFrom(schema + ".ecr_data")
        .select("first_name")
        .executeTakeFirst();

      if (process.env.METADATA_DATABASE_SCHEMA === "extended") {
        expect(extendedCheck).not.toBeUndefined();
      } else {
        expect(coreCheck).not.toBeUndefined();
      }
    });
  });
});
