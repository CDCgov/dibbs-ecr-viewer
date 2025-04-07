import { dbNamespace, getDb } from "@/app/api/services/database";
import { getSql } from "@/app/api/services/dialects/common";
import { getDbUtils } from "@/app/data/db/utils";
import { sql } from "kysely";

const db = getDb();
const schema = dbNamespace();
let utils = getDbUtils();

interface MigrationRow {
  name: string;
  timestamp?: string;
}

describe("Common Schema: ", () => {
  afterAll(async () => {
    await db.destroy();
  });

  it("has a schema", async () => {
    expect(await utils.schemaExistsByName(db, schema)).toBe(true);
  });

  describe("ecr_data table", () => {
    it("exists", async () => {
      expect(await utils.tableExistsByName(db, schema, "ecr_data")).toBe(true);
    });

    describe("eicr_id column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(db, schema, "ecr_data", "eicr_id"),
        ).toBe(true);
      });
      it("is a primary key", async () => {
        const column = await utils.getColumn(db, schema, "ecr_data", "eicr_id");
        expect(column?.isPrimaryKey()).toBe(true);
      });
      it("is a varchar(200)", async () => {
        const column = await utils.getColumn(db, schema, "ecr_data", "eicr_id");
        expect(column?.type).toBe("varchar(200)");
      });
    });

    describe("set_id column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(db, schema, "ecr_data", "set_id"),
        ).toBe(true);
      });
      it("is a varchar(255)", async () => {
        const column = await utils.getColumn(db, schema, "ecr_data", "set_id");
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("eicr_version_number column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_data",
            "eicr_version_number",
          ),
        ).toBe(true);
      });
      it("is a varchar(50)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "eicr_version_number",
        );
        expect(column?.type).toBe("varchar(50)");
      });
    });

    describe("data_source column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(db, schema, "ecr_data", "data_source"),
        ).toBe(true);
      });
      it("is a varchar(20)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "data_source",
        );
        expect(column?.type).toBe("varchar(20)");
      });
    });

    describe("fhir_reference_link column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_data",
            "fhir_reference_link",
          ),
        ).toBe(true);
      });
      it("is a varchar(500)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "fhir_reference_link",
        );
        expect(column?.type).toBe("varchar(500)");
      });
    });
    describe("patient_name_first column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_data",
            "patient_name_first",
          ),
        ).toBe(true);
      });
      it("is a varchar(100)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "patient_name_first",
        );
        expect(column?.type).toBe("varchar(100)");
      });
    });
    describe("patient_name_last column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_dat",
            "patient_name_last",
          ),
        ).toBe(true);
      });
      it("is a varchar(100)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "patient_name_last",
        );
        expect(column?.type).toBe("varchar(100)");
      });
    });
    describe("date_created column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_data",
            "date_created",
          ),
        ).toBe(true);
      });
      it("is a timestamp", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "date_created",
        );
        expect(column?.type).toBe(getSql("datetimeTzType"));
      });
      it("is not nullable", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "date_created",
        );
        expect(column?.isNullable()).toBe(false);
      });
      it("defaults to now", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "date_created",
        );
        expect(column?.defaultValue).toBe(getSql("now"));
      });
    });
    describe("report_date column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(db, schema, "ecr_data", "report_date"),
        ).toBe(true);
      });
      it("is a date", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "report_date",
        );
        expect(column?.type).toBe("DATE");
      });
    });
  });

  describe("ecr_rr_conditions table", () => {
    it("exists", async () => {
      expect(
        await utils.tableExistsByName(db, schema, "ecr_rr_conditions"),
      ).toBe(true);
    });

    describe("uuid column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_rr_conditions",
            "uuid",
          ),
        ).toBe(true);
      });
      it("is a primary key", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_rr_conditions",
          "uuid",
        );
        expect(column?.isPrimaryKey()).toBe(true);
      });
      it("is a varchar(200)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_rr_conditions",
          "uuid",
        );
        expect(column?.type).toBe("varchar(200)");
      });
    });

    describe("eicr_id column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_rr_conditions",
            "eicr_id",
          ),
        ).toBe(true);
      });
      it("is not nullable", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_rr_conditions",
          "eicr_id",
        );
        expect(column?.isNullable()).toBe(false);
      });
      it("is a foreign key", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_rr_conditions",
          "eicr_id",
        );
        expect(column?.isForeignKey()).toBe(true);
      });
      it("references ecr_data.eicr_id", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_rr_conditions",
          "eicr_id",
        );
        expect(column?.foreignKey).toBe("ecr_data.eicr_id");
      });
      it("is a varchar(200)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_rr_conditions",
          "eicr_id",
        );
        expect(column?.type).toBe("varchar(200)");
      });
    });

    describe("condition column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_rr_conditions",
            "condition",
          ),
        ).toBe(true);
      });
      it("is a maxVarchar", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_rr_conditions",
          "condition",
        );
        expect(column?.type).toBe(getSql("maxVarchar"));
      });
    });
  });
  describe("ecr_rr_rule_summaries table", () => {
    it("exists", async () => {
      expect(
        await utils.tableExistsByName(db, schema, "ecr_rr_rule_summaries"),
      ).toBe(true);
    });

    describe("uuid column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_rr_rule_summaries",
            "uuid",
          ),
        ).toBe(true);
      });
      it("is a primary key", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_rr_rule_summaries",
          "uuid",
        );
        expect(column?.isPrimaryKey()).toBe(true);
      });
      it("is a varchar(200)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_rr_rule_summaries",
          "uuid",
        );
        expect(column?.type).toBe("varchar(200)");
      });
    });

    describe("ecr_rr_conditions_id column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_rr_rule_summaries",
            "ecr_rr_conditions_id",
          ),
        ).toBe(true);
      });
      it("is not nullable", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_rr_rule_summaries",
          "ecr_rr_conditions_id",
        );
        expect(column?.isNullable()).toBe(false);
      });
      it("is a foreign key", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_rr_rule_summaries",
          "ecr_rr_conditions_id",
        );
        expect(column?.isForeignKey()).toBe(true);
      });
      it("references ecr_rr_conditions.uuid", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_rr_rule_summaries",
          "ecr_rr_conditions_id",
        );
        expect(column?.foreignKey).toBe("ecr_rr_conditions.uuid");
      });
      it("is a varchar(200)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_rr_rule_summaries",
          "ecr_rr_conditions_id",
        );
        expect(column?.type).toBe("varchar(200)");
      });
    });

    describe("rule_summary column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_rr_rule_summaries",
            "rule_summary",
          ),
        ).toBe(true);
      });
      it("is a maxVarchar", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_rr_rule_summaries",
          "rule_summary",
        );
        expect(column?.type).toBe(getSql("maxVarchar"));
      });
    });
  });
  describe("Migration Status: ", () => {
    it("has two migrations applied", async () => {
      const migrations =
        await sql<MigrationRow>`SELECT * FROM kysely_migrations`.execute(db);
      expect(migrations.rows.length).toBe(2);
    });

    it("has the correct migrations applied", async () => {
      const migrations =
        await sql<MigrationRow>`SELECT * FROM kysely_migrations`.execute(db);
      const migrationNames = migrations.rows.map((m) => m.name);
      expect(migrationNames).toContain("19700101000000_initial");
      expect(migrationNames).toContain("19700101000001_initial");
    });
  });
});
