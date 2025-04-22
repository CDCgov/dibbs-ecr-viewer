/**
 * @jest-environment node
 */

import { buildCore, dropCore } from "../../../helpers/ddl";
import { getDbUtils } from "@/app/data/db/utils/db";

describe("Extended Schema Migration Tests", () => {
  let utils;

  beforeAll(async () => {
    await buildCore(); // Build the core schema
    utils = getDbUtils();
  });

  afterAll(async () => {
    await dropCore(); // Drop the core schema
  });

  // Schema-level tests
  describe("Schema", () => {
    it("should exist with name 'extended'", async () => {
      const exists = await utils.schemaExistsByName(db, schema);
      expect(exists).toBe(true);
    });
  });

  // ecr_data table tests
  describe("Table: ecr_data", () => {
    let table;

    beforeAll(async () => {
      table = await utils.getTable(db, schema, "ecr_data");
    });

    it("should exist in the 'extended' schema", () => {
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

    describe("Column: fhir_reference_link", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "fhir_reference_link");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("Column: last_name", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "last_name");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("Column: first_name", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "first_name");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("Column: birth_date", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "birth_date");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type date", () => {
        expect(column?.type).toBe("DATE");
      });
    });

    describe("Column: gender", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "gender");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(50)", () => {
        expect(column?.type).toBe("varchar(50)");
      });
    });

    describe("Column: birth_sex", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "birth_sex");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(50)", () => {
        expect(column?.type).toBe("varchar(50)");
      });
    });

    describe("Column: gender_identity", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "gender_identity");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(50)", () => {
        expect(column?.type).toBe("varchar(50)");
      });
    });

    describe("Column: race", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "race");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("Column: ethnicity", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "ethnicity");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("Column: latitude", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "latitude");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type float", () => {
        expect(column?.type).toBe("FLOAT");
      });
    });

    describe("Column: longitude", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "longitude");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type float", () => {
        expect(column?.type).toBe("FLOAT");
      });
    });

    describe("Column: homelessness_status", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "homelessness_status");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("Column: disabilities", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "disabilities");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("Column: tribal_affiliation", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "tribal_affiliation");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("Column: tribal_enrollment_status", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find(
          (c) => c.name === "tribal_enrollment_status",
        );
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("Column: current_job_title", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "current_job_title");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("Column: current_job_industry", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "current_job_industry");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("Column: usual_occupation", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "usual_occupation");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("Column: usual_industry", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "usual_industry");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("Column: preferred_language", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "preferred_language");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("Column: pregnancy_status", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "pregnancy_status");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("Column: rr_id", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "rr_id");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("Column: processing_status", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "processing_status");
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

    describe("Column: authoring_date", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "authoring_date");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type datetime", () => {
        expect(column?.type).toBe(getSql("datetimeType"));
      });
    });

    describe("Column: authoring_provider", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "authoring_provider");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("Column: provider_id", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "provider_id");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("Column: facility_id", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "facility_id");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("Column: facility_name", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "facility_name");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("Column: encounter_type", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "encounter_type");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("Column: encounter_start_date", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "encounter_start_date");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type datetime", () => {
        expect(column?.type).toBe(getSql("datetimeType"));
      });
    });

    describe("Column: encounter_end_date", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "encounter_end_date");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type datetime", () => {
        expect(column?.type).toBe(getSql("datetimeType"));
      });
    });

    describe("Column: reason_for_visit", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "reason_for_visit");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type text or varchar(max)", () => {
        expect(column?.type).toBe(getSql("maxVarchar"));
      });
    });

    describe("Column: active_problems", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "active_problems");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type text or varchar(max)", () => {
        expect(column?.type).toBe(getSql("maxVarchar"));
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
        expect(column?.type).toBe(getSql("datetimeTzType"));
      });

      it("should not be nullable", () => {
        expect(column?.isNullable()).toBe(false);
      });

      it("should default to current timestamp", () => {
        expect(column?.defaultValue).toBe(getSql("now"));
      });
    });
  });

  // patient_address table tests
  describe("Table: patient_address", () => {
    let table;

    beforeAll(async () => {
      table = await utils.getTable(db, schema, "patient_address");
    });

    it("should exist in the 'extended' schema", () => {
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

    describe("Column: use", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "use");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(7)", () => {
        expect(column?.type).toBe("varchar(7)");
      });
    });

    describe("Column: type", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "type");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(8)", () => {
        expect(column?.type).toBe("varchar(8)");
      });
    });

    describe("Column: text", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "text");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type text or varchar(max)", () => {
        expect(column?.type).toBe(getSql("maxVarchar"));
      });
    });

    describe("Column: line", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "line");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("Column: city", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "city");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("Column: district", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "district");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("Column: state", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "state");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("Column: postal_code", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "postal_code");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(20)", () => {
        expect(column?.type).toBe("varchar(20)");
      });
    });

    describe("Column: country", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "country");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("Column: period_start", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "period_start");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type timestamp with time zone", () => {
        expect(column?.type).toBe(getSql("datetimeTzType"));
      });
    });

    describe("Column: period_end", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "period_end");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type timestamp with time zone", () => {
        expect(column?.type).toBe(getSql("datetimeTzType"));
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

      it("should be a foreign key referencing ecr_data.eicr_id", () => {
        expect(column?.isForeignKey()).toBe(true);
        expect(column?.foreignKey).toBe("ecr_data.eicr_id");
      });

      it("should be of type varchar(200)", () => {
        expect(column?.type).toBe("varchar(200)");
      });
    });
  });

  // ecr_rr_conditions table tests
  describe("Table: ecr_rr_conditions", () => {
    let table;

    beforeAll(async () => {
      table = await utils.getTable(db, schema, "ecr_rr_conditions");
    });

    it("should exist in the 'extended' schema", () => {
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
        expect(column?.type).toBe(getSql("maxVarchar"));
      });
    });
  });

  // ecr_rr_rule_summaries table tests
  describe("Table: ecr_rr_rule_summaries", () => {
    let table;

    beforeAll(async () => {
      table = await utils.getTable(db, schema, "ecr_rr_rule_summaries");
    });

    it("should exist in the 'extended' schema", () => {
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

  // ecr_labs table tests
  describe("Table: ecr_labs", () => {
    let table;

    beforeAll(async () => {
      table = await utils.getTable(db, schema, "ecr_labs");
    });

    it("should exist in the 'extended' schema", () => {
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

      it("should be part of the primary key", () => {
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

      it("should be part of the primary key", () => {
        expect(column?.isPrimaryKey()).toBe(true);
      });

      it("should be a foreign key referencing ecr_data.eicr_id", () => {
        expect(column?.isForeignKey()).toBe(true);
        expect(column?.foreignKey).toBe("ecr_data.eicr_id");
      });

      it("should be of type varchar(200)", () => {
        expect(column?.type).toBe("varchar(200)");
      });
    });

    describe("Column: test_type", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "test_type");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("Column: test_type_code", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "test_type_code");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(50)", () => {
        expect(column?.type).toBe("varchar(50)");
      });
    });

    describe("Column: test_type_system", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "test_type_system");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("Column: test_result_qualitative", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find(
          (c) => c.name === "test_result_qualitative",
        );
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type text or varchar(max)", () => {
        expect(column?.type).toBe(getSql("maxVarchar"));
      });
    });

    describe("Column: test_result_quantitative", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find(
          (c) => c.name === "test_result_quantitative",
        );
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type float", () => {
        expect(column?.type).toBe("FLOAT");
      });
    });

    describe("Column: test_result_units", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "test_result_units");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(50)", () => {
        expect(column?.type).toBe("varchar(50)");
      });
    });

    describe("Column: test_result_code", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "test_result_code");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(50)", () => {
        expect(column?.type).toBe("varchar(50)");
      });
    });

    describe("Column: test_result_code_display", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find(
          (c) => c.name === "test_result_code_display",
        );
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("Column: test_result_code_system", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find(
          (c) => c.name === "test_result_code_system",
        );
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(50)", () => {
        expect(column?.type).toBe("varchar(50)");
      });
    });

    describe("Column: test_result_interpretation", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find(
          (c) => c.name === "test_result_interpretation",
        );
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("Column: test_result_interpretation_code", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find(
          (c) => c.name === "test_result_interpretation_code",
        );
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(50)", () => {
        expect(column?.type).toBe("varchar(50)");
      });
    });

    describe("Column: test_result_interpretation_system", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find(
          (c) => c.name === "test_result_interpretation_system",
        );
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("Column: test_result_reference_range_low_value", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find(
          (c) => c.name === "test_result_reference_range_low_value",
        );
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type float", () => {
        expect(column?.type).toBe("FLOAT");
      });
    });

    describe("Column: test_result_reference_range_low_units", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find(
          (c) => c.name === "test_result_reference_range_low_units",
        );
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(50)", () => {
        expect(column?.type).toBe("varchar(50)");
      });
    });

    describe("Column: test_result_reference_range_high_value", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find(
          (c) => c.name === "test_result_reference_range_high_value",
        );
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type float", () => {
        expect(column?.type).toBe("FLOAT");
      });
    });

    describe("Column: test_result_reference_range_high_units", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find(
          (c) => c.name === "test_result_reference_range_high_units",
        );
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(50)", () => {
        expect(column?.type).toBe("varchar(50)");
      });
    });

    describe("Column: specimen_type", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "specimen_type");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.type).toBe("varchar(255)");
      });
    });

    describe("Column: specimen_collection_date", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find(
          (c) => c.name === "specimen_collection_date",
        );
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type date", () => {
        expect(column?.type).toBe("DATE");
      });
    });

    describe("Column: performing_lab", () => {
      let column;

      beforeAll(() => {
        column = table?.columns.find((c) => c.name === "performing_lab");
      });

      it("should exist", () => {
        expect(column).toBeDefined();
      });

      it("should be of type varchar(255)", () => {
        expect(column?.type).toBe("varchar(255)");
      });
    });
  });

  // Migration status tests
  describe("Migration Status", () => {
    let migrations;

    beforeAll(async () => {
      migrations = await utils.getMigrations(db);
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
