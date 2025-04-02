/**
 * @jest-environment node
 */

// import { migrate } from "@/app/data/db/utils/migrate";
import { getDb } from "@/app/api/services/database";
import { Kysely } from "kysely";
import { migrate } from "@/app/data/db/utils/migrate";

const db = getDb();

describe("Migrations: ", () => {
  afterAll(async () => {
    await db.destroy();
  });

  describe("database before migrations", () => {
    it("has a blank schema", async () => {
        const result = await (db as any)
            .selectFrom("ecr_viewer.ecr_data")
            .selectAll()
            .executeTakeFirst();

        expect(result).toBeUndefined();
    });
  });

  describe("database after migrations", () => {
    describe("has the core schema", () => {
        beforeAll(async () => {
            process.env.METADATA_DATABASE_SCHEMA = "core";
            await migrate("up");
        });

        it("and the common schema", async () => {
            const commonCheck = await (db as Kysely<any>)
                .selectFrom("ecr_viewer.ecr_rr_conditions")
                .select("uuid")
                .executeTakeFirst();

            expect(commonCheck).not.toBeUndefined();
        });

        it("and builds properly", async () => {
            const coreCheck = await (db as Kysely<any>)
                .selectFrom("ecr_viewer.ecr_data")
                .select("patient_name_first")
                .executeTakeFirst();

            expect(coreCheck).not.toBeUndefined();
            // Check for migrations log here?
        });
    });
    describe("has the extended schema", () => {
        beforeAll(async () => {
            process.env.METADATA_DATABASE_SCHEMA = "extended";
            await migrate("up");
        });

        it("and the common schema", async () => {
            const commonCheck = await (db as Kysely<any>)
                .selectFrom("ecr_viewer.ecr_rr_conditions")
                .select("uuid")
                .executeTakeFirst();

            expect(commonCheck).not.toBeUndefined();
        });

        it("and builds properly", async () => {
            const extendedCheck = await (db as Kysely<any>)
                .selectFrom("ecr_viewer.ecr_data")
                .select("first_name")
                .executeTakeFirst();

            expect(extendedCheck).not.toBeUndefined();
        });
    });
  });
});
