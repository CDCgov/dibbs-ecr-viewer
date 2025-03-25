import { makeEnvPublic } from "next-runtime-env";

import { register } from "./instrumentation";

jest.mock("next-runtime-env", () => ({
  makeEnvPublic: jest.fn(),
}));

jest.mock("./app/services/instrumentation", () => jest.fn());

describe("register and and setupConfigurationVariables", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should set AWS_INTEGRATED configuration variables", async () => {
    process.env.CONFIG_NAME = "AWS_INTEGRATED";
    await register();

    expect(process.env.NBS_AUTH).toBe("true");
    expect(process.env.NON_INTEGRATED_VIEWER).toBe("false");
    expect(process.env.SOURCE).toBe("s3");
    expect(makeEnvPublic).toHaveBeenCalledExactlyOnceWith([
      "NON_INTEGRATED_VIEWER",
    ]);
  });

  it("should set AWS_PG_NON_INTEGRATED configuration variables", async () => {
    process.env.CONFIG_NAME = "AWS_PG_NON_INTEGRATED";
    await register();

    expect(process.env.NBS_AUTH).toBe("false");
    expect(process.env.NON_INTEGRATED_VIEWER).toBe("true");
    expect(process.env.SOURCE).toBe("s3");
    expect(process.env.METADATA_DATABASE_TYPE).toBe("postgres");
    expect(process.env.METADATA_DATABASE_SCHEMA).toBe("core");
    expect(makeEnvPublic).toHaveBeenCalledExactlyOnceWith([
      "NON_INTEGRATED_VIEWER",
    ]);
  });

  it("should set AWS_SQLSERVER_NON_INTEGRATED configuration variables", async () => {
    process.env.CONFIG_NAME = "AWS_SQLSERVER_NON_INTEGRATED";
    await register();

    expect(process.env.NBS_AUTH).toBe("false");
    expect(process.env.NON_INTEGRATED_VIEWER).toBe("true");
    expect(process.env.SOURCE).toBe("s3");
    expect(process.env.METADATA_DATABASE_TYPE).toBe("sqlserver");
    expect(process.env.METADATA_DATABASE_SCHEMA).toBe("extended");
    expect(makeEnvPublic).toHaveBeenCalledExactlyOnceWith([
      "NON_INTEGRATED_VIEWER",
    ]);
  });

  it("should set AZURE_INTEGRATED configuration variables", async () => {
    process.env.CONFIG_NAME = "AZURE_INTEGRATED";
    await register();

    expect(process.env.NBS_AUTH).toBe("true");
    expect(process.env.NON_INTEGRATED_VIEWER).toBe("false");
    expect(process.env.SOURCE).toBe("azure");
    expect(makeEnvPublic).toHaveBeenCalledExactlyOnceWith([
      "NON_INTEGRATED_VIEWER",
    ]);
  });

  it("should set AZURE_PG_NON_INTEGRATED configuration variables", async () => {
    process.env.CONFIG_NAME = "AZURE_PG_NON_INTEGRATED";
    await register();

    expect(process.env.NBS_AUTH).toBe("false");
    expect(process.env.NON_INTEGRATED_VIEWER).toBe("true");
    expect(process.env.SOURCE).toBe("azure");
    expect(process.env.METADATA_DATABASE_TYPE).toBe("postgres");
    expect(process.env.METADATA_DATABASE_SCHEMA).toBe("core");
    expect(makeEnvPublic).toHaveBeenCalledExactlyOnceWith([
      "NON_INTEGRATED_VIEWER",
    ]);
  });

  it("should set AZURE_SQLSERVER_NON_INTEGRATED configuration variables", async () => {
    process.env.CONFIG_NAME = "AZURE_SQLSERVER_NON_INTEGRATED";
    await register();

    expect(process.env.NBS_AUTH).toBe("false");
    expect(process.env.NON_INTEGRATED_VIEWER).toBe("true");
    expect(process.env.SOURCE).toBe("azure");
    expect(process.env.METADATA_DATABASE_TYPE).toBe("sqlserver");
    expect(process.env.METADATA_DATABASE_SCHEMA).toBe("extended");
    expect(makeEnvPublic).toHaveBeenCalledExactlyOnceWith([
      "NON_INTEGRATED_VIEWER",
    ]);
  });

  it("should do nothing if CONFIG_NAME is not set", async () => {
    // @ts-expect-error
    delete process.env.CONFIG_NAME;
    await register();

    expect(process.env.NBS_AUTH).toBeUndefined();
    expect(process.env.NON_INTEGRATED_VIEWER).toBeUndefined();
    expect(process.env.SOURCE).toBeUndefined();
    expect(makeEnvPublic).toHaveBeenCalledExactlyOnceWith([
      "NON_INTEGRATED_VIEWER",
    ]);
  });
});
