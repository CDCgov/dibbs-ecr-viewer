/* eslint-disable unused-imports/no-unused-vars */
namespace NodeJS {
  interface ProcessEnv {
    APP_VERSION: string; // Version of eCR Viewer. This value is set at build time
    AUTH_CLIENT_ID?: string;
    AUTH_CLIENT_SECRET?: string;
    AUTH_ISSUER?: string;
    AUTH_PROVIDER?: "keycloak" | "ad";
    AWS_ACCESS_KEY_ID?: string;
    AWS_CUSTOM_ENDPOINT?: string;
    AWS_REGION?: string;
    AWS_SECRET_ACCESS_KEY?: string;
    AZURE_CONTAINER_NAME?: string;
    AZURE_STORAGE_CONNECTION_STRING?: string;
    BASE_PATH: string;
    CONFIG_NAME:
      | "AWS_INTEGRATED"
      | "AWS_PG_NON_INTEGRATED"
      | "AWS_SQLSERVER_NON_INTEGRATED"
      | "AWS_PG_DUAL"
      | "AWS_SQLSERVER_DUAL"
      | "AZURE_INTEGRATED"
      | "AZURE_PG_NON_INTEGRATED"
      | "AZURE_SQLSERVER_NON_INTEGRATED"
      | "AZURE_PG_DUAL"
      | "AZURE_SQLSERVER_DUAL"
      | "GCP_INTEGRATED"
      | "GCP_PG_NON_INTEGRATED"
      | "GCP_SQLSERVER_NON_INTEGRATED"
      | "GCP_PG_DUAL"
      | "GCP_SQLSERVER_DUAL";
    DATABASE_URL?: string;
    DB_CIPHER?: string;
    ECR_BUCKET_NAME: string;
    GCP_CREDENTIALS?: string;
    GCP_PROJECT_ID?: string;
    GCP_API_ENDPOINT?: string;
    METADATA_DATABASE_SCHEMA?: "core" | "extended";
    METADATA_DATABASE_TYPE?: "postgres" | "sqlserver";
    NBS_PUB_KEY?: string;
    NEXT_RUNTIME: string;
    NEXTAUTH_SECRET: string;
    ORCHESTRATION_URL: string;
    SOURCE: "s3" | "azure" | "gcp";
    SQL_SERVER_HOST?: string;
    SQL_SERVER_PASSWORD?: string;
    SQL_SERVER_USER?: string;
  }
}
