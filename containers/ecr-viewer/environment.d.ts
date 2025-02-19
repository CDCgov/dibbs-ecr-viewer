/* eslint-disable unused-imports/no-unused-vars */
namespace NodeJS {
  interface ProcessEnv {
    AWS_ACCESS_KEY_ID: string;
    AWS_CUSTOM_ENDPOINT: string;
    AWS_REGION: string;
    AWS_SECRET_ACCESS_KEY: string;
    AZURE_CONTAINER_NAME: string;
    AZURE_STORAGE_CONNECTION_STRING: string;
    BASE_PATH: string;
    CONFIG_NAME:
      | "AWS_INTEGRATED"
      | "AWS_PG_NON_INTEGRATED"
      | "AWS_SQLSERVER_NON_INTEGRATED"
      | "AZURE_INTEGRATED"
      | "AZURE_PG_NON_INTEGRATED"
      | "AZURE_SQLSERVER_NON_INTEGRATED";
    DATABASE_TYPE: string;
    DATABASE_URL: string;
    DB_CIPHER?: string;
    ECR_BUCKET_NAME: string;
    GITHUB_ID: string;
    GITHUB_SECRET: string;
    METADATA_DATABASE_SCHEMA?: "core" | "extended";
    METADATA_DATABASE_TYPE?: "postgres" | "sqlserver";
    NBS_AUTH: "true" | "false";
    NBS_PUB_KEY: string;
    NEXT_PUBLIC_NON_INTEGRATED_VIEWER: "true" | "false";
    NEXT_RUNTIME: string;
    NEXTAUTH_SECRET: string;
    NON_INTEGRATED_VIEWER: "true" | "false";
    ORCHESTRATION_URL: string;
    SOURCE: "s3" | "azure";
    SQL_SERVER_HOST: string;
    SQL_SERVER_PASSWORD: string;
    SQL_SERVER_USER: string;
  }
}
