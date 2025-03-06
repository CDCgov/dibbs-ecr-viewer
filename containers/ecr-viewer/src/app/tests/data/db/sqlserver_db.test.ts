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
    delete process.env.SQL_SERVER_CONNECTION_STRING;
    delete process.env.DB_CIPHER;
    jest.resetAllMocks();
  });

  it("should return call connect with SQL_SERVER_CONNECTION_STRING and cipher", async () => {
    process.env.SQL_SERVER_CONNECTION_STRING =
      "server= localhost;port=1433;workstation id=1234";
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
  it("should throw an error when SQL_SERVER isn't provided", async () => {
    delete process.env.SQL_SERVER_CONNECTION_STRING;
    await expect(get_pool()).rejects.toThrowWithMessage(
      Error,
      "Missing SQL_SERVER_CONNECTION_STRING",
    );
  });
});

describe("sql server health check", () => {
  afterEach(() => {
    delete process.env.SQL_SERVER_CONNECTION_STRING;
    jest.resetAllMocks();
  });

  it("should return UNDEFINED when SQL_SERVER_CONNECTION_STRING is not set", async () => {
    delete process.env.SQL_SERVER_CONNECTION_STRING;
    expect(await sqlServerHealthCheck()).toBeUndefined();
  });

  it("should return UP when pool is available", async () => {
    process.env.SQL_SERVER_CONNECTION_STRING = "hostname";
    (sql.connect as jest.Mock).mockImplementationOnce(() => ({
      connected: true,
    }));

    expect(await sqlServerHealthCheck()).toEqual("UP");
  });
  it("should return DOWN when pool is not connected", async () => {
    process.env.SQL_SERVER_CONNECTION_STRING = "hostname";
    (sql.connect as jest.Mock).mockImplementationOnce(() => ({
      connected: false,
    }));

    expect(await sqlServerHealthCheck()).toEqual("DOWN");
  });
  it("should return DOWN when pool throws an error", async () => {
    jest.spyOn(console, "error").mockImplementation();
    process.env.SQL_SERVER_CONNECTION_STRING = "hostname";

    (sql.connect as jest.Mock).mockImplementationOnce(() => {
      throw new Error("Failed to connect");
    });

    expect(await sqlServerHealthCheck()).toEqual("DOWN");
  });
});
