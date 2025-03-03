/**
 * @jest-environment node
 */
import { sqlServerHealthCheck } from "@/app/data/db/sqlserver_db";
import sql from "mssql";

jest.mock("mssql", () => ({ connect: jest.fn() }));

describe("sql server health check", () => {
  afterEach(() => {
    process.env.SQL_SERVER_HOST = "";
    process.env.SQL_SERVER_USER = "";
    process.env.SQL_SERVER_PASSWORD = "";
  });

  it("should return UNDEFINED when SQL_SERVER_HOST is not set", async () => {
    process.env.SQL_SERVER_HOST = "";
    process.env.SQL_SERVER_USER = "user";
    process.env.SQL_SERVER_PASSWORD = "pw";
    expect(await sqlServerHealthCheck()).toBeUndefined();
  });
  it("should return UNDEFINED when SQL_SERVER_HOST is not set", async () => {
    process.env.SQL_SERVER_HOST = "hostname";
    process.env.SQL_SERVER_USER = "";
    process.env.SQL_SERVER_PASSWORD = "pw";
    expect(await sqlServerHealthCheck()).toBeUndefined();
  });
  it("should return UNDEFINED when SQL_SERVER_HOST is not set", async () => {
    process.env.SQL_SERVER_HOST = "hostname";
    process.env.SQL_SERVER_USER = "user";
    process.env.SQL_SERVER_PASSWORD = "";
    expect(await sqlServerHealthCheck()).toBeUndefined();
  });
  it("should return UP when pool is available", async () => {
    process.env.SQL_SERVER_HOST = "hostname";
    process.env.SQL_SERVER_USER = "user";
    process.env.SQL_SERVER_PASSWORD = "pw";
    expect(await sqlServerHealthCheck()).toEqual("UP");
  });
  it("should return DOWN when pool throws an error", async () => {
    jest.spyOn(console, "error").mockImplementation();
    process.env.SQL_SERVER_HOST = "hostname";
    process.env.SQL_SERVER_USER = "user";
    process.env.SQL_SERVER_PASSWORD = "pw";

    (sql.connect as jest.Mock).mockImplementationOnce(() => {
      throw new Error("Failed to connect");
    });

    expect(await sqlServerHealthCheck()).toEqual("DOWN");
  });
});
