/**
 * @jest-environment node
 */

import { ColumnMetadata, MigrationInfo, TableMetadata } from "kysely";

import { dateTimeType, dateTimeTypeTz } from "../../../helpers/common";
import { buildExtended, dropExisting } from "../../../helpers/ddl";
import { getDbRaw } from "@/app/api/services/database";
import { schemaExistsByName, getTable } from "@/app/data/db/utils/db";
import { dbNamespace } from "@/app/data/db/utils/db-config";
import { getMigrations } from "@/app/data/db/utils/migrate";

describe("Extended Schema Migration Tests", () => {
  const db = getDbRaw();
  const schema = dbNamespace();

  beforeAll(async () => {
    await buildExtended(); // Build the extended schema
  });

  afterAll(async () => {
    await dropExisting(); // Drop the core schema
  });

  // Schema-level tests
  describe("Schema", () => {
    it("should exist with name 'extended'", async () => {
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

    it("should exist in the 'extended' schema", () => {
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

    describe("Column: fhir_reference_link", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "fhir_reference_link");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: last_name", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "last_name");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: first_name", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "first_name");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: birth_date", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "birth_date");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type date", () => {
        expect(column?.dataType).toBe("date");
      });
    });

    describe("Column: gender", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "gender");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(50)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: birth_sex", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "birth_sex");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(50)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: gender_identity", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "gender_identity");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(50)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: race", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "race");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: ethnicity", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "ethnicity");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: latitude", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "latitude");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type float", () => {
        expect(column?.dataType).toBe("numeric");
      });
    });

    describe("Column: longitude", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "longitude");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type float", () => {
        expect(column?.dataType).toBe("numeric");
      });
    });

    describe("Column: homelessness_status", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "homelessness_status");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: disabilities", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "disabilities");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: tribal_affiliation", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "tribal_affiliation");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: tribal_enrollment_status", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find(
          (c) => c.name === "tribal_enrollment_status",
        );
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: current_job_title", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "current_job_title");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: current_job_industry", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "current_job_industry");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: usual_occupation", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "usual_occupation");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: usual_industry", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "usual_industry");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: preferred_language", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "preferred_language");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: pregnancy_status", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "pregnancy_status");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: rr_id", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "rr_id");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: processing_status", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "processing_status");
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

    describe("Column: authoring_date", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "authoring_date");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type datetime", () => {
        expect(column?.dataType).toBe(dateTimeType());
      });
    });

    describe("Column: authoring_provider", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "authoring_provider");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: provider_id", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "provider_id");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: facility_id", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "facility_id");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: facility_name", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "facility_name");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: encounter_type", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "encounter_type");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: encounter_start_date", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "encounter_start_date");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type datetime", () => {
        expect(column?.dataType).toBe(dateTimeType());
      });
    });

    describe("Column: encounter_end_date", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "encounter_end_date");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type datetime", () => {
        expect(column?.dataType).toBe(dateTimeType());
      });
    });

    describe("Column: reason_for_visit", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "reason_for_visit");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type text or varchar(max)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: active_problems", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "active_problems");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type text or varchar(max)", () => {
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
        expect(column?.dataType).toBe(dateTimeTypeTz());
      });

      it("should not be nullable", () => {
        expect(column?.isNullable).toBeFalse();
      });

      it("should default to current timestamp", () => {
        expect(column?.hasDefaultValue).toBeTrue();
      });
    });
  });

  // patient_address table tests
  describe("Table: patient_address", () => {
    let table: TableMetadata | undefined;

    beforeAll(async () => {
      table = await getTable(db, schema, "patient_address");
    });

    it("should exist in the 'extended' schema", () => {
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

    describe("Column: use", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "use");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(7)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: type", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "type");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(8)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: text", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "text");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type text or varchar(max)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: line", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "line");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: city", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "city");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: district", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "district");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: state", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "state");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: postal_code", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "postal_code");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(20)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: country", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "country");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: period_start", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "period_start");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type timestamp with time zone", () => {
        expect(column?.dataType).toBe(dateTimeTypeTz());
      });
    });

    describe("Column: period_end", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "period_end");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type timestamp with time zone", () => {
        expect(column?.dataType).toBe(dateTimeTypeTz());
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

      it("should be of type varchar(200)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });
  });

  // ecr_rr_conditions table tests
  describe("Table: ecr_rr_conditions", () => {
    let table: TableMetadata | undefined;

    beforeAll(async () => {
      table = await getTable(db, schema, "ecr_rr_conditions");
    });

    it("should exist in the 'extended' schema", () => {
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
        expect(column?.dataType).toBe("varchar");
      });
    });
  });

  // ecr_rr_rule_summaries table tests
  describe("Table: ecr_rr_rule_summaries", () => {
    let table: TableMetadata | undefined;

    beforeAll(async () => {
      table = await getTable(db, schema, "ecr_rr_rule_summaries");
    });

    it("should exist in the 'extended' schema", () => {
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

  // ecr_labs table tests
  describe("Table: ecr_labs", () => {
    let table: TableMetadata | undefined;

    beforeAll(async () => {
      table = await getTable(db, schema, "ecr_labs");
    });

    it("should exist in the 'extended' schema", () => {
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

      it("should be of type varchar(200)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: test_type", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "test_type");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: test_type_code", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "test_type_code");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(50)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: test_type_system", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "test_type_system");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: test_result_qualitative", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find(
          (c) => c.name === "test_result_qualitative",
        );
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type text or varchar(max)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: test_result_quantitative", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find(
          (c) => c.name === "test_result_quantitative",
        );
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type float", () => {
        expect(column?.dataType).toBe("numeric");
      });
    });

    describe("Column: test_result_units", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "test_result_units");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(50)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: test_result_code", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "test_result_code");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(50)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: test_result_code_display", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find(
          (c) => c.name === "test_result_code_display",
        );
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: test_result_code_system", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find(
          (c) => c.name === "test_result_code_system",
        );
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(50)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: test_result_interpretation", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find(
          (c) => c.name === "test_result_interpretation",
        );
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: test_result_interpretation_code", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find(
          (c) => c.name === "test_result_interpretation_code",
        );
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(50)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: test_result_interpretation_system", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find(
          (c) => c.name === "test_result_interpretation_system",
        );
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: test_result_reference_range_low_value", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find(
          (c) => c.name === "test_result_reference_range_low_value",
        );
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type float", () => {
        expect(column?.dataType).toBe("numeric");
      });
    });

    describe("Column: test_result_reference_range_low_units", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find(
          (c) => c.name === "test_result_reference_range_low_units",
        );
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(50)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: test_result_reference_range_high_value", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find(
          (c) => c.name === "test_result_reference_range_high_value",
        );
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type float", () => {
        expect(column?.dataType).toBe("numeric");
      });
    });

    describe("Column: test_result_reference_range_high_units", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find(
          (c) => c.name === "test_result_reference_range_high_units",
        );
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(50)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: specimen_type", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "specimen_type");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });

    describe("Column: specimen_collection_date", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find(
          (c) => c.name === "specimen_collection_date",
        );
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type date", () => {
        expect(column?.dataType).toBe("date");
      });
    });

    describe("Column: performing_lab", () => {
      let column: ColumnMetadata | undefined;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "performing_lab");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.dataType).toBe("varchar");
      });
    });
  });

  // Migration status tests
  describe("Migration Status", () => {
    let migrations: readonly MigrationInfo[];

    beforeAll(async () => {
      migrations = await getMigrations();
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
          ({ name }) => name === "19700101000000_initial.ts_extended",
        ),
      ).toHaveProperty("executedAt");
    });
  });
});
