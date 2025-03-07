/**
 * @jest-environment node
 */
import { postgresHealthCheck } from "@/app/data/db/postgres_db";

const mockConnect = jest.fn();
jest.mock("pg-promise", () => () => () => ({
  connect: mockConnect,
}));

describe("postgres health check", () => {
  afterEach(() => {
    jest.clearAllMocks();
    process.env.DATABASE_URL = "";
    delete process.env.METADATA_DATABASE_TYPE;
  });

  it("should return UNDEFINED if missing connection string", async () => {
    process.env.DATABASE_URL = "";
    expect(await postgresHealthCheck()).toBeUndefined();
  });
  it("should return UP connection was successful", async () => {
    process.env.DATABASE_URL = "https://postgres";
    process.env.METADATA_DATABASE_TYPE = "postgres";
    const mockDone = jest.fn();
    mockConnect.mockReturnValue({
      done: mockDone,
    });

    expect(await postgresHealthCheck()).toEqual("UP");
    expect(mockDone).toHaveBeenCalledOnce();
  });
  it("should return DOWN connection was failed", async () => {
    jest.spyOn(console, "error").mockImplementation();
    process.env.DATABASE_URL = "https://postgres";
    process.env.METADATA_DATABASE_TYPE = "postgres";
    mockConnect.mockImplementationOnce(() => {
      throw new Error("Failed to connect");
    });
    expect(await postgresHealthCheck()).toEqual("DOWN");
  });
});
