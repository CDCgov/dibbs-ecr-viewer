import { makeEnvPublic } from "next-runtime-env";

/**
 * The register function will be callled once when nextjs server is instantiated
 */
export async function register() {
  setupConfigurationVariables();

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./app/services/instrumentation");
  }
}

function setupConfigurationVariables() {
  switch (process.env.CONFIG_NAME) {
    case "AWS_INTEGRATED":
      process.env.NBS_AUTH = "true";
      process.env.NON_INTEGRATED_VIEWER = "false";
      process.env.SOURCE = "s3";
      break;
    case "AWS_PG_NON_INTEGRATED":
      process.env.NBS_AUTH = "false";
      process.env.NON_INTEGRATED_VIEWER = "true";
      process.env.SOURCE = "s3";
      process.env.METADATA_DATABASE_TYPE = "postgres";
      process.env.METADATA_DATABASE_SCHEMA = "core";
      break;
    case "AWS_SQLSERVER_NON_INTEGRATED":
      process.env.NBS_AUTH = "false";
      process.env.NON_INTEGRATED_VIEWER = "true";
      process.env.SOURCE = "s3";
      process.env.METADATA_DATABASE_TYPE = "sqlserver";
      process.env.METADATA_DATABASE_SCHEMA = "extended";
      break;
    case "AZURE_INTEGRATED":
      process.env.NBS_AUTH = "true";
      process.env.NON_INTEGRATED_VIEWER = "false";
      process.env.SOURCE = "azure";
      break;
    case "AZURE_PG_NON_INTEGRATED":
      process.env.NBS_AUTH = "false";
      process.env.NON_INTEGRATED_VIEWER = "true";
      process.env.SOURCE = "azure";
      process.env.METADATA_DATABASE_TYPE = "postgres";
      process.env.METADATA_DATABASE_SCHEMA = "core";
      break;
    case "AZURE_SQLSERVER_NON_INTEGRATED":
      process.env.NBS_AUTH = "false";
      process.env.NON_INTEGRATED_VIEWER = "true";
      process.env.SOURCE = "azure";
      process.env.METADATA_DATABASE_TYPE = "sqlserver";
      process.env.METADATA_DATABASE_SCHEMA = "extended";
      break;
    default:
      break;
  }
  makeEnvPublic(["NON_INTEGRATED_VIEWER"]);
}
