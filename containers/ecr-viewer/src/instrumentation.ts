import { AZURE_SOURCE, GCP_SOURCE, S3_SOURCE } from "./app/api/utils";

/**
 * The register function will be callled once when nextjs server is instantiated
 */
export async function register() {
  setupConfigurationVariables();

  // Code with server side dependencies runs in here
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./app/services/instrumentation");
  }
}

/**
 * This function sets the configuration variables for the server based on the environment variables.
 * It sets the `SOURCE` environment variable based on the first part of the `CONFIG_NAME` environment variable.
 * It also sets the `METADATA_DATABASE_TYPE` and `METADATA_DATABASE_SCHEMA` environment variables based on the second part of the `CONFIG_NAME` environment variable.
 */
export function setupConfigurationVariables() {
  const sourceMap: {
    [key: string]: typeof process.env.SOURCE;
  } = {
    AWS: S3_SOURCE,
    AZURE: AZURE_SOURCE,
    GCP: GCP_SOURCE,
  };
  process.env.SOURCE = sourceMap[process.env.CONFIG_NAME?.split("_")[0]];

  // INTEGRATED and DUAL should have NBS auth
  if (process.env.CONFIG_NAME?.endsWith("_NON_INTEGRATED")) {
    delete process.env.NBS_PUB_KEY; // makes dev life easier
  } else if (process.env.CONFIG_NAME?.endsWith("_INTEGRATED")) {
    delete process.env.AUTH_PROVIDER; // makes dev life easier
  }

  if (process.env.CONFIG_NAME?.includes("_PG_")) {
    process.env.METADATA_DATABASE_TYPE = "postgres";
    process.env.METADATA_DATABASE_SCHEMA ||= "extended";
  } else if (process.env.CONFIG_NAME?.includes("_SQLSERVER_")) {
    process.env.METADATA_DATABASE_TYPE = "sqlserver";
    process.env.METADATA_DATABASE_SCHEMA ||= "extended";
  }
}
