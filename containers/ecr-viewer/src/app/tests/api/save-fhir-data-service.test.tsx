/**
 * @jest-environment node
 */

import { saveCoreMetadata } from "../../api/save-fhir-data/save-fhir-data-service";
import { BundleMetadata } from "../../api/save-fhir-data/types";
import { getDB } from "../../api/services/postgres_db";
import { db } from '../../api/services/database'
import { sql } from 'kysely'

// jest.mock("../../api/services/postgres_db", () => ({
//   getDB: jest.fn(),
// }));

describe("saveCoreMetadata", () => {
  // const mockTransaction = {
  //   query: jest.fn(),
  //   none: jest.fn(),
  //   one: jest.fn(),
  // };

  const baseMetadata: BundleMetadata = {
    last_name: "lname",
    first_name: "fname",
    birth_date: "01/01/2000",
    data_source: "s3",
    eicr_set_id: "1234",
    eicr_version_number: "1",
    rr: [],
    report_date: "12/20/2024",
  };

  // const saveEcrDataQuery =
  //   "INSERT INTO ecr_data (eICR_ID, patient_name_last, patient_name_first, patient_birth_date, data_source, report_date, set_id, eicr_version_number) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)";
  // const saveRRConditionsQuery =
  //   "INSERT INTO ecr_rr_conditions (uuid, eICR_ID, condition) VALUES (uuid_generate_v4(), $1, $2) RETURNING uuid";
  // const saveRRSummaryQuery =
  //   "INSERT INTO ecr_rr_rule_summaries (uuid, ecr_rr_conditions_id, rule_summary) VALUES (uuid_generate_v4(), $1, $2)";
  // beforeEach(() => {
  //   const mockDatabase = {
  //     tx: jest.fn(),
  //   };

  //   mockDatabase.tx.mockImplementation(async (callback) => {
  //     return callback(mockTransaction);
  //   });

  //   (getDB as jest.Mock).mockReturnValue({
  //     database: mockDatabase,
  //     pgPromise: {
  //       ParameterizedQuery: jest
  //         .fn()
  //         .mockImplementation(({ text, values }: any) => ({
  //           text,
  //           values,
  //         })),
  //     },
  //   });
  // });
  
  beforeAll(async () => {
    await db.schema.createTable('ecr_data')
      .addColumn('eICR_ID', 'varchar(200)', (cb) => cb.primaryKey())
      .addColumn('set_id', 'varchar(255)')
      .addColumn('eicr_version_number', 'varchar(50)')
      .addColumn('data_source', 'varchar(2)') // S3 or DB
      .addColumn('fhir_reference_link', 'varchar(500)')
      .addColumn('patient_name_first', 'varchar(100)')
      .addColumn('patient_name_last', 'varchar(100)')
      .addColumn('patient_birth_date', 'date')
      .addColumn('date_created', 'timestamptz', (cb) => cb.notNull().defaultTo(sql`NOW()`))
      .addColumn('report_date', 'date')
      .execute()
    await db.schema.createTable('ecr_rr_conditions')
      .addColumn('uuid', 'varchar(200)', (cb) => cb.primaryKey())
      .addColumn('eICR_ID', 'varchar(255)', (cb) => cb.notNull())
      .addColumn('condition', 'varchar')
      .execute()
    await db.schema.createTable('ecr_rr_rule_summaries')
      .addColumn('uuid', 'varchar(200)', (cb) => cb.primaryKey())
      .addColumn('ecr_rr_conditions_id', 'varchar(200)')
      .addColumn('rule_summary', 'varchar')
      .execute()
  })

  afterAll(async () => {
    await db.schema.dropTable('ecr_data').execute()
    await db.schema.dropTable('ecr_rr_conditions').execute()
    await db.schema.dropTable('ecr_rr_rule_summaries').execute()
  })

  afterEach(async () => {
    await db.deleteFrom('ecr_data').execute()
    await db.deleteFrom('ecr_rr_conditions').execute()
    await db.deleteFrom('ecr_rr_rule_summaries').execute()
  })

  // afterEach(() => {
  //   jest.resetAllMocks();
  // });
  it("should save without any rr", async () => {
    const resp = await saveCoreMetadata(baseMetadata, "1-2-3-4");

    expect(resp.message).toEqual("Success. Saved metadata to database.");
    expect(resp.status).toEqual(200);
    // expect(mockTransaction.one).not.toHaveBeenCalled();
    // expect(mockTransaction.none).toHaveBeenCalledExactlyOnceWith({
    //   text: saveEcrDataQuery,
    //   values: [
    //     "1-2-3-4",
    //     "lname",
    //     "fname",
    //     "01/01/2000",
    //     "DB",
    //     "12/20/2024",
    //     "1234",
    //     "1",
    //   ],
    // });
  });

  it("should save with rr without rule summaries", async () => {
    const metadata: BundleMetadata = {
      ...baseMetadata,
      rr: [
        {
          condition: "flu",
          rule_summaries: [],
        },
      ],
    };

    // mockTransaction.one.mockReturnValue({ uuid: "return-id-1" });

    const resp = await saveCoreMetadata(metadata, "1-2-3-4");

    expect(resp.message).toEqual("Success. Saved metadata to database.");
    expect(resp.status).toEqual(200);
    // expect(mockTransaction.one).toHaveBeenCalledExactlyOnceWith({
    //   text: saveRRConditionsQuery,
    //   values: ["1-2-3-4", "flu"],
    // });
    // expect(mockTransaction.none).toHaveBeenCalledExactlyOnceWith({
    //   text: saveEcrDataQuery,
    //   values: [
    //     "1-2-3-4",
    //     "lname",
    //     "fname",
    //     "01/01/2000",
    //     "DB",
    //     "12/20/2024",
    //     "1234",
    //     "1",
    //   ],
    // });
  });

  it("should save with rr with rule summaries", async () => {
    const metadata: BundleMetadata = {
      ...baseMetadata,
      rr: [
        {
          condition: "flu",
          rule_summaries: [{ summary: "fever" }, { summary: "influenza" }],
        },
      ],
    };

    // mockTransaction.one.mockReturnValueOnce({ uuid: "return-id-1" });

    const resp = await saveCoreMetadata(metadata, "1-2-3-4");

    expect(resp.message).toEqual("Success. Saved metadata to database.");
    expect(resp.status).toEqual(200);
    // expect(mockTransaction.one).toHaveBeenCalledExactlyOnceWith({
    //   text: saveRRConditionsQuery,
    //   values: ["1-2-3-4", "flu"],
    // });
    // expect(mockTransaction.none).toHaveBeenCalledTimes(3);
    // expect(mockTransaction.none).toHaveBeenNthCalledWith(1, {
    //   text: saveEcrDataQuery,
    //   values: [
    //     "1-2-3-4",
    //     "lname",
    //     "fname",
    //     "01/01/2000",
    //     "DB",
    //     "12/20/2024",
    //     "1234",
    //     "1",
    //   ],
    // });

    // expect(mockTransaction.none).toHaveBeenNthCalledWith(2, {
    //   text: saveRRSummaryQuery,
    //   values: ["return-id-1", "fever"],
    // });
    // expect(mockTransaction.none).toHaveBeenNthCalledWith(3, {
    //   text: saveRRSummaryQuery,
    //   values: ["return-id-1", "influenza"],
    // });
  });

  it("should return an error when db save fails", async () => {
    // jest.spyOn(console, "error").mockImplementation(() => {});

    // mockTransaction.none.mockRejectedValue({ error: "Connection timed out" });

    const badMetadata: BundleMetadata = {
      last_name: 1,
      first_name: 2,
      birth_date: "01/01/2000",
      data_source: "s3",
      eicr_set_id: "1234",
      eicr_version_number: "1",
      rr: [],
      report_date: "12/20/2024",
    };
    const resp = await saveCoreMetadata(badMetadata, "1-2-3-4");

    expect(resp.message).toEqual("Failed to insert metadata to database.");
    expect(resp.status).toEqual(500);
    // expect(mockTransaction.none).toHaveBeenCalledOnce();
    // expect(mockTransaction.one).not.toHaveBeenCalled();
  });
});
