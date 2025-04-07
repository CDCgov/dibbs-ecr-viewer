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

describe("Extended Schema: ", () => {
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
      it("is a varchar(255)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "fhir_reference_link",
        );
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("last_name column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(db, schema, "ecr_data", "last_name"),
        ).toBe(true);
      });
      it("is a varchar(255)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "last_name",
        );
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("first_name column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(db, schema, "ecr_data", "first_name"),
        ).toBe(true);
      });
      it("is a varchar(255)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "first_name",
        );
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("birth_date column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(db, schema, "ecr_data", "birth_date"),
        ).toBe(true);
      });
      it("is a date", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "birth_date",
        );
        expect(column?.type).toBe("DATE");
      });
    });

    describe("gender column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(db, schema, "ecr_data", "gender"),
        ).toBe(true);
      });
      it("is a varchar(50)", async () => {
        const column = await utils.getColumn(db, schema, "ecr_data", "gender");
        expect(column?.type).toBe("varchar(50)");
      });
    });

    describe("birth_sex column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(db, schema, "ecr_data", "birth_sex"),
        ).toBe(true);
      });
      it("is a varchar(50)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "birth_sex",
        );
        expect(column?.type).toBe("varchar(50)");
      });
    });

    describe("gender_identity column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_data",
            "gender_identity",
          ),
        ).toBe(true);
      });
      it("is a varchar(50)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "gender_identity",
        );
        expect(column?.type).toBe("varchar(50)");
      });
    });

    describe("race column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(db, schema, "ecr_data", "race"),
        ).toBe(true);
      });
      it("is a varchar(255)", async () => {
        const column = await utils.getColumn(db, schema, "ecr_data", "race");
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("ethnicity column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(db, schema, "ecr_data", "ethnicity"),
        ).toBe(true);
      });
      it("is a varchar(255)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "ethnicity",
        );
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("latitude column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(db, schema, "ecr_data", "latitude"),
        ).toBe(true);
      });
      it("is a float", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "latitude",
        );
        expect(column?.type).toBe("FLOAT");
      });
    });

    describe("longitude column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(db, schema, "ecr_data", "longitude"),
        ).toBe(true);
      });
      it("is a float", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "longitude",
        );
        expect(column?.type).toBe("FLOAT");
      });
    });

    describe("homelessness_status column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_data",
            "homelessness_status",
          ),
        ).toBe(true);
      });
      it("is a varchar(255)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "homelessness_status",
        );
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("disabilities column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_data",
            "disabilities",
          ),
        ).toBe(true);
      });
      it("is a varchar(255)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "disabilities",
        );
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("tribal_affiliation column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_data",
            "tribal_affiliation",
          ),
        ).toBe(true);
      });
      it("is a varchar(255)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "tribal_affiliation",
        );
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("tribal_enrollment_status column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_data",
            "tribal_enrollment_status",
          ),
        ).toBe(true);
      });
      it("is a varchar(255)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "tribal_enrollment_status",
        );
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("current_job_title column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_data",
            "current_job_title",
          ),
        ).toBe(true);
      });
      it("is a varchar(255)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "current_job_title",
        );
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("current_job_industry column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_data",
            "current_job_industry",
          ),
        ).toBe(true);
      });
      it("is a varchar(255)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "current_job_industry",
        );
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("usual_occupation column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_data",
            "usual_occupation",
          ),
        ).toBe(true);
      });
      it("is a varchar(255)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "usual_occupation",
        );
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("usual_industry column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_data",
            "usual_industry",
          ),
        ).toBe(true);
      });
      it("is a varchar(255)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "usual_industry",
        );
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("preferred_language column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_data",
            "preferred_language",
          ),
        ).toBe(true);
      });
      it("is a varchar(255)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "preferred_language",
        );
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("pregnancy_status column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_data",
            "pregnancy_status",
          ),
        ).toBe(true);
      });
      it("is a varchar(255)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "pregnancy_status",
        );
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("rr_id column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(db, schema, "ecr_data", "rr_id"),
        ).toBe(true);
      });
      it("is a varchar(255)", async () => {
        const column = await utils.getColumn(db, schema, "ecr_data", "rr_id");
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("processing_status column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_data",
            "processing_status",
          ),
        ).toBe(true);
      });
      it("is a varchar(255)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "processing_status",
        );
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

    describe("authoring_date column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_data",
            "authoring_date",
          ),
        ).toBe(true);
      });
      it("is a datetime", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "authoring_date",
        );
        expect(column?.type).toBe(getSql("datetimeType")); // Assuming getSql maps "DATETIME"
      });
    });

    describe("authoring_provider column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_data",
            "authoring_provider",
          ),
        ).toBe(true);
      });
      it("is a varchar(255)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "authoring_provider",
        );
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("provider_id column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(db, schema, "ecr_data", "provider_id"),
        ).toBe(true);
      });
      it("is a varchar(255)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "provider_id",
        );
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("facility_id column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(db, schema, "ecr_data", "facility_id"),
        ).toBe(true);
      });
      it("is a varchar(255)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "facility_id",
        );
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("facility_name column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_data",
            "facility_name",
          ),
        ).toBe(true);
      });
      it("is a varchar(255)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "facility_name",
        );
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("encounter_type column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_data",
            "encounter_type",
          ),
        ).toBe(true);
      });
      it("is a varchar(255)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "encounter_type",
        );
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("encounter_start_date column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_data",
            "encounter_start_date",
          ),
        ).toBe(true);
      });
      it("is a datetime", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "encounter_start_date",
        );
        expect(column?.type).toBe(getSql("datetimeType"));
      });
    });

    describe("encounter_end_date column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_data",
            "encounter_end_date",
          ),
        ).toBe(true);
      });
      it("is a datetime", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "encounter_end_date",
        );
        expect(column?.type).toBe(getSql("datetimeType"));
      });
    });

    describe("reason_for_visit column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_data",
            "reason_for_visit",
          ),
        ).toBe(true);
      });
      it("is a maxVarchar", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "reason_for_visit",
        );
        expect(column?.type).toBe(getSql("maxVarchar"));
      });
    });

    describe("active_problems column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_data",
            "active_problems",
          ),
        ).toBe(true);
      });
      it("is a maxVarchar", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "active_problems",
        );
        expect(column?.type).toBe(getSql("maxVarchar"));
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
      it("is a datetimetz", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_data",
          "date_created",
        );
        expect(column?.type).toBe(getSql("datetimeTzType")); // DATETIMEOFFSET or TIMESTAMPTZ
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
  });

  describe("patient_address table", () => {
    it("exists", async () => {
      expect(await utils.tableExistsByName(db, schema, "patient_address")).toBe(
        true,
      );
    });

    describe("uuid column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(db, schema, "patient_address", "uuid"),
        ).toBe(true);
      });
      it("is a primary key", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "patient_address",
          "uuid",
        );
        expect(column?.isPrimaryKey()).toBe(true);
      });
      it("is a varchar(200)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "patient_address",
          "uuid",
        );
        expect(column?.type).toBe("varchar(200)");
      });
    });

    describe("use column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(db, schema, "patient_address", "use"),
        ).toBe(true);
      });
      it("is a varchar(7)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "patient_address",
          "use",
        );
        expect(column?.type).toBe("varchar(7)");
      });
    });

    describe("type column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(db, schema, "patient_address", "type"),
        ).toBe(true);
      });
      it("is a varchar(8)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "patient_address",
          "type",
        );
        expect(column?.type).toBe("varchar(8)");
      });
    });

    describe("text column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(db, schema, "patient_address", "text"),
        ).toBe(true);
      });
      it("is a maxVarchar", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "patient_address",
          "text",
        );
        expect(column?.type).toBe(getSql("maxVarchar"));
      });
    });

    describe("line column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(db, schema, "patient_address", "line"),
        ).toBe(true);
      });
      it("is a varchar(255)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "patient_address",
          "line",
        );
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("city column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(db, schema, "patient_address", "city"),
        ).toBe(true);
      });
      it("is a varchar(255)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "patient_address",
          "city",
        );
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("district column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "patient_address",
            "district",
          ),
        ).toBe(true);
      });
      it("is a varchar(255)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "patient_address",
          "district",
        );
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("state column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "patient_address",
            "state",
          ),
        ).toBe(true);
      });
      it("is a varchar(255)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "patient_address",
          "state",
        );
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("postal_code column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "patient_address",
            "postal_code",
          ),
        ).toBe(true);
      });
      it("is a varchar(20)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "patient_address",
          "postal_code",
        );
        expect(column?.type).toBe("varchar(20)");
      });
    });

    describe("country column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "patient_address",
            "country",
          ),
        ).toBe(true);
      });
      it("is a varchar(255)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "patient_address",
          "country",
        );
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("period_start column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "patient_address",
            "period_start",
          ),
        ).toBe(true);
      });
      it("is a datetimetz", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "patient_address",
          "period_start",
        );
        expect(column?.type).toBe(getSql("datetimeTzType"));
      });
    });

    describe("period_end column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "patient_address",
            "period_end",
          ),
        ).toBe(true);
      });
      it("is a datetimetz", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "patient_address",
          "period_end",
        );
        expect(column?.type).toBe(getSql("datetimeTzType"));
      });
    });

    describe("eicr_id column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "patient_address",
            "eicr_id",
          ),
        ).toBe(true);
      });
      it("is a foreign key", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "patient_address",
          "eicr_id",
        );
        expect(column?.isForeignKey()).toBe(true);
      });
      it("references ecr_data.eicr_id", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "patient_address",
          "eicr_id",
        );
        expect(column?.foreignKey).toBe("ecr_data.eicr_id");
      });
      it("is a varchar(200)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "patient_address",
          "eicr_id",
        );
        expect(column?.type).toBe("varchar(200)");
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

  describe("ecr_labs table", () => {
    it("exists", async () => {
      expect(await utils.tableExistsByName(db, schema, "ecr_labs")).toBe(true);
    });

    describe("uuid column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(db, schema, "ecr_labs", "uuid"),
        ).toBe(true);
      });
      it("is part of the primary key", async () => {
        const column = await utils.getColumn(db, schema, "ecr_labs", "uuid");
        expect(column?.isPrimaryKey()).toBe(true);
      });
      it("is a varchar(200)", async () => {
        const column = await utils.getColumn(db, schema, "ecr_labs", "uuid");
        expect(column?.type).toBe("varchar(200)");
      });
    });

    describe("eicr_id column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(db, schema, "ecr_labs", "eicr_id"),
        ).toBe(true);
      });
      it("is part of the primary key", async () => {
        const column = await utils.getColumn(db, schema, "ecr_labs", "eicr_id");
        expect(column?.isPrimaryKey()).toBe(true);
      });
      it("is a foreign key", async () => {
        const column = await utils.getColumn(db, schema, "ecr_labs", "eicr_id");
        expect(column?.isForeignKey()).toBe(true);
      });
      it("references ecr_data.eicr_id", async () => {
        const column = await utils.getColumn(db, schema, "ecr_labs", "eicr_id");
        expect(column?.foreignKey).toBe("ecr_data.eicr_id");
      });
      it("is a varchar(200)", async () => {
        const column = await utils.getColumn(db, schema, "ecr_labs", "eicr_id");
        expect(column?.type).toBe("varchar(200)");
      });
    });

    describe("test_type column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(db, schema, "ecr_labs", "test_type"),
        ).toBe(true);
      });
      it("is a varchar(255)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_labs",
          "test_type",
        );
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("test_type_code column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_labs",
            "test_type_code",
          ),
        ).toBe(true);
      });
      it("is a varchar(50)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_labs",
          "test_type_code",
        );
        expect(column?.type).toBe("varchar(50)");
      });
    });

    describe("test_type_system column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_labs",
            "test_type_system",
          ),
        ).toBe(true);
      });
      it("is a varchar(255)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_labs",
          "test_type_system",
        );
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("test_result_qualitative column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_labs",
            "test_result_qualitative",
          ),
        ).toBe(true);
      });
      it("is a maxVarchar", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_labs",
          "test_result_qualitative",
        );
        expect(column?.type).toBe(getSql("maxVarchar"));
      });
    });

    describe("test_result_quantitative column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_labs",
            "test_result_quantitative",
          ),
        ).toBe(true);
      });
      it("is a float", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_labs",
          "test_result_quantitative",
        );
        expect(column?.type).toBe("FLOAT");
      });
    });

    describe("test_result_units column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_labs",
            "test_result_units",
          ),
        ).toBe(true);
      });
      it("is a varchar(50)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_labs",
          "test_result_units",
        );
        expect(column?.type).toBe("varchar(50)");
      });
    });

    describe("test_result_code column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_labs",
            "test_result_code",
          ),
        ).toBe(true);
      });
      it("is a varchar(50)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_labs",
          "test_result_code",
        );
        expect(column?.type).toBe("varchar(50)");
      });
    });

    describe("test_result_code_display column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_labs",
            "test_result_code_display",
          ),
        ).toBe(true);
      });
      it("is a varchar(255)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_labs",
          "test_result_code_display",
        );
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("test_result_code_system column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_labs",
            "test_result_code_system",
          ),
        ).toBe(true);
      });
      it("is a varchar(50)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_labs",
          "test_result_code_system",
        );
        expect(column?.type).toBe("varchar(50)");
      });
    });

    describe("test_result_interpretation column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_labs",
            "test_result_interpretation",
          ),
        ).toBe(true);
      });
      it("is a varchar(255)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_labs",
          "test_result_interpretation",
        );
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("test_result_interpretation_code column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_labs",
            "test_result_interpretation_code",
          ),
        ).toBe(true);
      });
      it("is a varchar(50)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_labs",
          "test_result_interpretation_code",
        );
        expect(column?.type).toBe("varchar(50)");
      });
    });

    describe("test_result_interpretation_system column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_labs",
            "test_result_interpretation_system",
          ),
        ).toBe(true);
      });
      it("is a varchar(255)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_labs",
          "test_result_interpretation_system",
        );
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("test_result_reference_range_low_value column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_labs",
            "test_result_reference_range_low_value",
          ),
        ).toBe(true);
      });
      it("is a float", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_labs",
          "test_result_reference_range_low_value",
        );
        expect(column?.type).toBe("FLOAT");
      });
    });

    describe("test_result_reference_range_low_units column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_labs",
            "test_result_reference_range_low_units",
          ),
        ).toBe(true);
      });
      it("is a varchar(50)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_labs",
          "test_result_reference_range_low_units",
        );
        expect(column?.type).toBe("varchar(50)");
      });
    });

    describe("test_result_reference_range_high_value column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_labs",
            "test_result_reference_range_high_value",
          ),
        ).toBe(true);
      });
      it("is a float", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_labs",
          "test_result_reference_range_high_value",
        );
        expect(column?.type).toBe("FLOAT");
      });
    });

    describe("test_result_reference_range_high_units column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_labs",
            "test_result_reference_range_high_units",
          ),
        ).toBe(true);
      });
      it("is a varchar(50)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_labs",
          "test_result_reference_range_high_units",
        );
        expect(column?.type).toBe("varchar(50)");
      });
    });

    describe("specimen_type column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_labs",
            "specimen_type",
          ),
        ).toBe(true);
      });
      it("is a varchar(255)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_labs",
          "specimen_type",
        );
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("specimen_collection_date column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_labs",
            "specimen_collection_date",
          ),
        ).toBe(true);
      });
      it("is a date", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_labs",
          "specimen_collection_date",
        );
        expect(column?.type).toBe("DATE");
      });
    });

    describe("performing_lab column", () => {
      it("exists", async () => {
        expect(
          await utils.columnExistsByName(
            db,
            schema,
            "ecr_labs",
            "performing_lab",
          ),
        ).toBe(true);
      });
      it("is a varchar(255)", async () => {
        const column = await utils.getColumn(
          db,
          schema,
          "ecr_labs",
          "performing_lab",
        );
        expect(column?.type).toBe("varchar(255)");
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
