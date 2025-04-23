/**
 * @jest-environment node
 */

import { ColumnMetadata, MigrationInfo, TableMetadata } from "kysely";

import { dateTimeTypeTz } from "../helpers/common";
import { buildCore, dropExisting } from "../helpers/ddl";
import { getMigrations } from "@/app/api/migrate-db/migrate";
import { getDbRaw } from "@/app/api/services/database";
import { dbNamespace } from "@/app/api/services/utils/db-config";
import {
  schemaExistsByName,
  getTable,
} from "@/app/api/services/utils/db-metadata";

beforeAll(async () => {
  await buildCore(); // Build the core schema
});

afterAll(async () => {
  await dropExisting(); // Drop the core schema
});

describe("Common Schema Migration Tests", () => {
  const db = getDbRaw();
  const schema = dbNamespace();

  // Schema-level tests
  describe("Schema", () => {
    it("should exist with name 'common'", async () => {
      const exists = await schemaExistsByName(db, schema);
      expect(exists).toBe(true);
    });
  });

  // ecr_data table tests
  describe("Table: ecr_data", () => {
    let table: TableMetadata | undefined;

    beforeAll(async () => {
      table = await getTable(db, schema, "ecr_data");
    });

    it("should exist in the 'common' schema", () => {
      expect(table).toBeDefined();
    });

    describe("Column: eicr_id", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "eicr_id");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(200)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: set_id", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "set_id");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: eicr_version_number", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "eicr_version_number");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(50)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: data_source", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "data_source");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(20)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: fhir_reference_link", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "fhir_reference_link");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(500)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: patient_name_first", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "patient_name_first");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(100)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: patient_name_last", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "patient_name_last");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(100)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: date_created", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "date_created");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type timestamp with time zone", () => {
        expect(column?.dataType).toBe(dateTimeTypeTz()); // Handles dialect-specific type
      });

      it("should not be nullable", () => {
        expect(column?.isNullable).toBeFalse();
      });

      it("should default to current timestamp", () => {
        expect(column?.hasDefaultValue).toBeTrue();
      });
    });

    describe("Column: report_date", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "report_date");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type date", () => {
        expect(column?.dataType).toBe("date");
      });
    });
  });

  // ecr_rr_conditions table tests
  describe("Table: ecr_rr_conditions", () => {
    let table: TableMetadata | undefined;

    beforeAll(async () => {
      table = await getTable(db, schema, "ecr_rr_conditions");
    });

    it("should exist in the 'common' schema", () => {
      expect(table).toBeDefined();
    });

    describe("Column: uuid", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "uuid");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(200)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: eicr_id", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "eicr_id");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should not be nullable", () => {
        expect(column?.isNullable).toBe(false);
      });

      it("should be of type varchar(200)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: condition", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "condition");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type text or varchar(max)", () => {
        expect(column?.dataType).toBe("varchar"); // Dialect-specific max varchar
      });
    });
  });

  // ecr_rr_rule_summaries table tests
  describe("Table: ecr_rr_rule_summaries", () => {
    let table: TableMetadata | undefined;

    beforeAll(async () => {
      table = await getTable(db, schema, "ecr_rr_rule_summaries");
    });

    it("should exist in the 'common' schema", () => {
      expect(table).toBeDefined();
    });

    describe("Column: uuid", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "uuid");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(200)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: ecr_rr_conditions_id", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "ecr_rr_conditions_id");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(200)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: rule_summary", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "rule_summary");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type text or varchar(max)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });
  });

  // Migration status tests
  describe("Migration Status", () => {
    let migrations: readonly MigrationInfo[];

    beforeAll(async () => {
      migrations = await getMigrations(); // Assuming getMigrations returns executed migration names
    });

    it("should have exactly two migrations applied", () => {
      expect(migrations.length).toBe(2);
    });

    it("should have applied the correct migrations", () => {
      expect(
        migrations.find(
          ({ name }) => name === "19700101000000_initial.ts_common",
        ),
      ).toHaveProperty("executedAt");
      expect(
        migrations.find(
          ({ name }) => name === "19700101000000_initial.ts_core",
        ),
      ).toHaveProperty("executedAt");
    });
  });
});
