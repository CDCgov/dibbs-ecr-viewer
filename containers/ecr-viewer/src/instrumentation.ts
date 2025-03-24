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
  const sourceMap: { [key: string]: "s3" | "azure" | "gcp" } = {
    AWS: "s3",
    AZURE: "azure",
    GCS: "gcp",
  };

  switch (process.env.CONFIG_NAME) {
    case "AWS_INTEGRATED":
    case "AZURE_INTEGRATED":
    case "GCP_INTEGRATED":
      process.env.NBS_AUTH = "true";
      process.env.NON_INTEGRATED_VIEWER = "false";
      process.env.SOURCE = sourceMap[process.env.CONFIG_NAME.split("_")[0]];
      break;

    case "AWS_PG_NON_INTEGRATED":
    case "AZURE_PG_NON_INTEGRATED":
    case "GCP_PG_NON_INTEGRATED":
      process.env.NBS_AUTH = "false";
      process.env.NON_INTEGRATED_VIEWER = "true";
      process.env.SOURCE = sourceMap[process.env.CONFIG_NAME.split("_")[0]];
      process.env.METADATA_DATABASE_TYPE = "postgres";
      process.env.METADATA_DATABASE_SCHEMA = "core";
      break;

    case "AWS_SQLSERVER_NON_INTEGRATED":
    case "AZURE_SQLSERVER_NON_INTEGRATED":
    case "GCP_SQLSERVER_NON_INTEGRATED":
      process.env.NBS_AUTH = "false";
      process.env.NON_INTEGRATED_VIEWER = "true";
      process.env.SOURCE = sourceMap[process.env.CONFIG_NAME.split("_")[0]];
      process.env.METADATA_DATABASE_TYPE = "sqlserver";
      process.env.METADATA_DATABASE_SCHEMA = "extended";
      break;

    default:
      break;
  }
  makeEnvPublic(["NON_INTEGRATED_VIEWER"]);
}
