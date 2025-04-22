/**
 * @jest-environment node
 */

import { buildCore, dropCore } from "../../../helpers/ddl";
import { getSql } from "@/app/api/services/dialects/common";
import { schemaExistsByName, getTable } from "@/app/data/db/utils/db";
import { getMigrations } from "@/app/data/db/utils/migrate";

describe("Common Schema Migration Tests", () => {
  beforeAll(async () => {
    await buildCore(); // Build the core schema
  });

  afterAll(async () => {
    await dropCore(); // Drop the core schema
  });

  // Schema-level tests
  describe("Schema", () => {
    it("should exist with name 'common'", async () => {
      const exists = await schemaExistsByName(db, schema);
      expect(exists).toBe(true);
    });
  });

  // ecr_data table tests
  describe("Table: ecr_data", () => {
    let table;

    beforeAll(async () => {
      table = await getTable(db, schema, "ecr_data");
    });

    it("should exist in the 'common' schema", () => {
      expect(table).toBeDefined();
    });

    describe("Column: eicr_id", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "eicr_id");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be the primary key", () => {
        expect(column?.isPrimaryKey()).toBe(true);
      });

      it("should be of type varchar(200)", () => {
        expect(column?.type).toBe("varchar(200)");
      });
    });

    describe("Column: set_id", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "set_id");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("Column: eicr_version_number", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "eicr_version_number");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(50)", () => {
        expect(column?.type).toBe("varchar(50)");
      });
    });

    describe("Column: data_source", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "data_source");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(20)", () => {
        expect(column?.type).toBe("varchar(20)");
      });
    });

    describe("Column: fhir_reference_link", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "fhir_reference_link");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(500)", () => {
        expect(column?.type).toBe("varchar(500)");
      });
    });

    describe("Column: patient_name_first", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "patient_name_first");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(100)", () => {
        expect(column?.type).toBe("varchar(100)");
      });
    });

    describe("Column: patient_name_last", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "patient_name_last");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(100)", () => {
        expect(column?.type).toBe("varchar(100)");
      });
    });

    describe("Column: date_created", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "date_created");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type timestamp with time zone", () => {
        expect(column?.type).toBe(getSql("datetimeTzType")); // Handles dialect-specific type
      });

      it("should not be nullable", () => {
        expect(column?.isNullable()).toBe(false);
      });

      it("should default to current timestamp", () => {
        expect(column?.defaultValue).toBe(getSql("now"));
      });
    });

    describe("Column: report_date", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "report_date");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type date", () => {
        expect(column?.type).toBe("DATE");
      });
    });
  });

  // ecr_rr_conditions table tests
  describe("Table: ecr_rr_conditions", () => {
    let table;

    beforeAll(async () => {
      table = await getTable(db, schema, "ecr_rr_conditions");
    });

    it("should exist in the 'common' schema", () => {
      expect(table).toBeDefined();
    });

    describe("Column: uuid", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "uuid");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be the primary key", () => {
        expect(column?.isPrimaryKey()).toBe(true);
      });

      it("should be of type varchar(200)", () => {
        expect(column?.type).toBe("varchar(200)");
      });
    });

    describe("Column: eicr_id", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "eicr_id");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should not be nullable", () => {
        expect(column?.isNullable()).toBe(false);
      });

      it("should be a foreign key referencing ecr_data.eicr_id", () => {
        expect(column?.isForeignKey()).toBe(true);
        expect(column?.foreignKey).toBe("ecr_data.eicr_id");
      });

      it("should be of type varchar(200)", () => {
        expect(column?.type).toBe("varchar(200)");
      });
    });

    describe("Column: condition", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "condition");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type text or varchar(max)", () => {
        expect(column?.type).toBe(getSql("maxVarchar")); // Dialect-specific max varchar
      });
    });
  });

  // ecr_rr_rule_summaries table tests
  describe("Table: ecr_rr_rule_summaries", () => {
    let table;

    beforeAll(async () => {
      table = await getTable(db, schema, "ecr_rr_rule_summaries");
    });

    it("should exist in the 'common' schema", () => {
      expect(table).toBeDefined();
    });

    describe("Column: uuid", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "uuid");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be the primary key", () => {
        expect(column?.isPrimaryKey()).toBe(true);
      });

      it("should be of type varchar(200)", () => {
        expect(column?.type).toBe("varchar(200)");
      });
    });

    describe("Column: ecr_rr_conditions_id", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "ecr_rr_conditions_id");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should not be nullable", () => {
        expect(column?.isNullable()).toBe(false);
      });

      it("should be a foreign key referencing ecr_rr_conditions.uuid", () => {
        expect(column?.isForeignKey()).toBe(true);
        expect(column?.foreignKey).toBe("ecr_rr_conditions.uuid");
      });

      it("should be of type varchar(200)", () => {
        expect(column?.type).toBe("varchar(200)");
      });
    });

    describe("Column: rule_summary", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "rule_summary");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type text or varchar(max)", () => {
        expect(column?.type).toBe(getSql("maxVarchar"));
      });
    });
  });

  // Migration status tests
  describe("Migration Status", () => {
    let migrations;

    beforeAll(async () => {
      migrations = await getMigrations(); // Assuming getMigrations returns executed migration names
    });

    it("should have exactly two migrations applied", () => {
      expect(migrations.length).toBe(2);
    });

    it("should have applied the correct migrations", () => {
      expect(migrations).toContain("19700101000000_initial");
      expect(migrations).toContain("19700101000001_initial");
    });
  });
});
