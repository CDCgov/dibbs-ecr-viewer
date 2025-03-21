import { register } from "./instrumentation";

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
    const jestSpy = jest.spyOn(console, "warn").mockImplementation();
    await register();

    expect(process.env.SOURCE).toBe("s3");
    expect(jestSpy).toHaveBeenCalled();
    expect(makeEnvPublic).toHaveBeenCalledExactlyOnceWith([
      "NON_INTEGRATED_VIEWER",
    ]);
  });

  it("should set AWS_PG_NON_INTEGRATED configuration variables", async () => {
    process.env.CONFIG_NAME = "AWS_PG_NON_INTEGRATED";
    await register();

    expect(process.env.SOURCE).toBe("s3");
    expect(process.env.METADATA_DATABASE_TYPE).toBe("postgres");
    expect(process.env.METADATA_DATABASE_SCHEMA).toBe("core");
  });

  it("should set AWS_SQLSERVER_NON_INTEGRATED configuration variables", async () => {
    process.env.CONFIG_NAME = "AWS_SQLSERVER_NON_INTEGRATED";
    await register();

    expect(process.env.SOURCE).toBe("s3");
    expect(process.env.METADATA_DATABASE_TYPE).toBe("sqlserver");
    expect(process.env.METADATA_DATABASE_SCHEMA).toBe("extended");
  });

  it("should set AWS_PG_DUAL configuration variables", async () => {
    process.env.CONFIG_NAME = "AWS_PG_DUAL";
    await register();

    expect(process.env.SOURCE).toBe("s3");
    expect(process.env.METADATA_DATABASE_TYPE).toBe("postgres");
    expect(process.env.METADATA_DATABASE_SCHEMA).toBe("core");
  });

  it("should set AWS_SQLSERVER_DUAL configuration variables", async () => {
    process.env.CONFIG_NAME = "AWS_SQLSERVER_DUAL";
    await register();

    expect(process.env.SOURCE).toBe("s3");
    expect(process.env.METADATA_DATABASE_TYPE).toBe("sqlserver");
    expect(process.env.METADATA_DATABASE_SCHEMA).toBe("extended");
  });

  it("should set AZURE_INTEGRATED configuration variables", async () => {
    process.env.CONFIG_NAME = "AZURE_INTEGRATED";
    await register();

    expect(process.env.SOURCE).toBe("azure");
  });

  it("should set AZURE_PG_NON_INTEGRATED configuration variables", async () => {
    process.env.CONFIG_NAME = "AZURE_PG_NON_INTEGRATED";
    await register();

    expect(process.env.SOURCE).toBe("azure");
    expect(process.env.METADATA_DATABASE_TYPE).toBe("postgres");
    expect(process.env.METADATA_DATABASE_SCHEMA).toBe("core");
  });

  it("should set AZURE_SQLSERVER_NON_INTEGRATED configuration variables", async () => {
    process.env.CONFIG_NAME = "AZURE_SQLSERVER_NON_INTEGRATED";
    await register();

    expect(process.env.SOURCE).toBe("azure");
    expect(process.env.METADATA_DATABASE_TYPE).toBe("sqlserver");
    expect(process.env.METADATA_DATABASE_SCHEMA).toBe("extended");
  });

  it("should set AZURE_PG_DUAL configuration variables", async () => {
    process.env.CONFIG_NAME = "AZURE_PG_DUAL";
    await register();

    expect(process.env.SOURCE).toBe("azure");
    expect(process.env.METADATA_DATABASE_TYPE).toBe("postgres");
    expect(process.env.METADATA_DATABASE_SCHEMA).toBe("core");
  });

  it("should set AZURE_SQLSERVER_DUAL configuration variables", async () => {
    process.env.CONFIG_NAME = "AZURE_SQLSERVER_DUAL";
    await register();

    expect(process.env.SOURCE).toBe("azure");
    expect(process.env.METADATA_DATABASE_TYPE).toBe("sqlserver");
    expect(process.env.METADATA_DATABASE_SCHEMA).toBe("extended");
  });

  it("should set GCP_INTEGRATED configuration variables", async () => {
    process.env.CONFIG_NAME = "GCP_INTEGRATED";
    await register();

    expect(process.env.SOURCE).toBe("gcp");
  });

  it("should set GCP_PG_NON_INTEGRATED configuration variables", async () => {
    process.env.CONFIG_NAME = "GCP_PG_NON_INTEGRATED";
    await register();

    expect(process.env.SOURCE).toBe("gcp");
    expect(process.env.METADATA_DATABASE_TYPE).toBe("postgres");
    expect(process.env.METADATA_DATABASE_SCHEMA).toBe("core");
  });

  it("should set GCP_SQLSERVER_NON_INTEGRATED configuration variables", async () => {
    process.env.CONFIG_NAME = "GCP_SQLSERVER_NON_INTEGRATED";
    await register();

    expect(process.env.SOURCE).toBe("gcp");
    expect(process.env.METADATA_DATABASE_TYPE).toBe("sqlserver");
    expect(process.env.METADATA_DATABASE_SCHEMA).toBe("extended");
  });

  it("should set GCP_PG_DUAL configuration variables", async () => {
    process.env.CONFIG_NAME = "GCP_PG_DUAL";
    await register();

    expect(process.env.SOURCE).toBe("gcp");
    expect(process.env.METADATA_DATABASE_TYPE).toBe("postgres");
    expect(process.env.METADATA_DATABASE_SCHEMA).toBe("core");
  });

  it("should set GCP_SQLSERVER_DUAL configuration variables", async () => {
    process.env.CONFIG_NAME = "GCP_SQLSERVER_DUAL";
    await register();

    expect(process.env.SOURCE).toBe("gcp");
    expect(process.env.METADATA_DATABASE_TYPE).toBe("sqlserver");
    expect(process.env.METADATA_DATABASE_SCHEMA).toBe("extended");
  });

  it("should do nothing if CONFIG_NAME is not set", async () => {
    // @ts-expect-error
    delete process.env.CONFIG_NAME;
    await register();

    expect(process.env.SOURCE).toBeUndefined();
  });
});
