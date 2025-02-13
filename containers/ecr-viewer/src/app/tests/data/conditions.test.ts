/**
 * @jest-environment node
 */
import { getAllConditions } from "@/app/data/conditions";
import { getDB } from "@/app/api/services/postgres_db";
import { get_pool } from "@/app/api/services/sqlserver_db";

jest.mock("../../api/services/postgres_db", () => ({
  getDB: jest.fn(),
}));

jest.mock("../../api/services/sqlserver_db", () => ({
  get_pool: jest.fn(),
}));

const MOCK_CONDITIONS = [
  { condition: "condition1" },
  { condition: "condition2" },
];

describe("Conditions service", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("Should throw an error if the database type is undefined", async () => {
    process.env.METADATA_DATABASE_TYPE = undefined;
    await expect(getAllConditions()).rejects.toThrow(
      "Database type is undefined.",
    );
  });

  it("Should retrieve all unique conditions with PostgreSQL", async () => {
    process.env.METADATA_DATABASE_TYPE = "postgres";

    const mockDatabase = {
      any: jest.fn(),
    };

    // Mock getDB to return the mock database
    (getDB as jest.Mock).mockReturnValue({
      database: mockDatabase,
      pgPromise: {
        ParameterizedQuery: jest.fn().mockImplementation(({ text }: any) => ({
          text,
        })),
      },
    });

    mockDatabase.any.mockReturnValue(MOCK_CONDITIONS);
    const conditions = await getAllConditions();

    expect(conditions).toEqual(["condition1", "condition2"]);
    expect(mockDatabase.any).toHaveBeenCalledWith({
      text: 'SELECT DISTINCT "condition" FROM ecr_rr_conditions ORDER BY "condition"',
    });
  });

  it("Should retrieve all unique conditions with SQL Server", async () => {
    process.env.METADATA_DATABASE_TYPE = "sqlserver";

    const mockRequest = {
      query: jest.fn().mockResolvedValue({ recordset: MOCK_CONDITIONS }),
    };
    (get_pool as jest.Mock).mockReturnValue({ request: () => mockRequest });

    const conditions = await getAllConditions();

    expect(conditions).toEqual(["condition1", "condition2"]);
    expect(mockRequest.query).toHaveBeenCalledWith(
      "SELECT DISTINCT condition FROM ecr_rr_conditions ORDER BY condition",
    );
  });
});
