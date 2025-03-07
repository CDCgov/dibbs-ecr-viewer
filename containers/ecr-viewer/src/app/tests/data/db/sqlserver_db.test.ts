/**
 * @jest-environment node
 */
import sql from "mssql";

import { get_pool, sqlServerHealthCheck } from "@/app/data/db/sqlserver_db";

jest.mock("mssql", () => ({
  connect: jest.fn(),
  close: jest.fn(),
  ConnectionPool: {
    parseConnectionString: () => ({
      server: "localhost",
      options: { workstationId: 1234 },
    }),
  },
}));

describe("sql server getPool", () => {
  afterEach(() => {
    delete process.env.METADATA_DATABASE_TYPE;
    delete process.env.DB_CIPHER;
    process.env.DATABASE_URL === "";
    jest.resetAllMocks();
  });

  it("should return call connect with DATABASE_URL and cipher", async () => {
    process.env.DATABASE_URL =
      "server= localhost;port=1433;workstation id=1234";
    process.env.METADATA_DATABASE_TYPE = "sqlserver";
    process.env.DB_CIPHER = "rsa512";
    await get_pool();
    expect(sql.connect).toHaveBeenCalledExactlyOnceWith({
      options: {
        cryptoCredentialsDetails: { ciphers: "rsa512" },
        connectTimeout: 30000,
        workstationId: 1234,
      },
      server: "localhost",
    });
  });
});

describe("sql server health check", () => {
  afterEach(() => {
    process.env.DATABASE_URL = "";
    jest.resetAllMocks();
  });

  it("should return UNDEFINED when DATABASE_URL is not set", async () => {
    process.env.DATABASE_URL = "";
    expect(await sqlServerHealthCheck()).toBeUndefined();
  });

  it("should return UP when pool is available", async () => {
    process.env.DATABASE_URL = "hostname";
    process.env.METADATA_DATABASE_TYPE = "sqlserver";
    (sql.connect as jest.Mock).mockImplementationOnce(() => ({
      connected: true,
    }));

    expect(await sqlServerHealthCheck()).toEqual("UP");
  });
  it("should return DOWN when pool is not connected", async () => {
    process.env.DATABASE_URL = "hostname";
    (sql.connect as jest.Mock).mockImplementationOnce(() => ({
      connected: false,
    }));

    expect(await sqlServerHealthCheck()).toEqual("DOWN");
  });
  it("should return DOWN when pool throws an error", async () => {
    jest.spyOn(console, "error").mockImplementation();
    process.env.DATABASE_URL = "hostname";

    (sql.connect as jest.Mock).mockImplementationOnce(() => {
      throw new Error("Failed to connect");
    });

    expect(await sqlServerHealthCheck()).toEqual("DOWN");
  });
});
