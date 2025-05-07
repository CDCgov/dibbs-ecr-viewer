# Notes 5/7/25
## Release Summary
This release adds support for automated database migrations for the non-integrated version of the Viewer. More information about these automated migrations is below.

This release also adds a sign-out button to the application, and added [new docs](https://cdcgov.github.io/dibbs-ecr-viewer/documents/Setup_Guide.html) to reference. It also adds basic user management tables to the application, which will be used in user permissions later.


### 🚧 Required Infrastructure Changes 🚧

There are two environment variable changes associated with the automated migrations. These changes are only required for users running the non-integrated Viewer.

`METADATA_DATABASE_SCHEMA`: Optional. Possible values are "core" and "extended". Database schema to use for metadata storage. Core has a small subset of Extended. Default value is "extended".
`METADATA_DATABASE_MIGRATION_SECRET` : Secret needed to apply migrations via the /migrate-db api route. If not set, a random UUID will be assigned by the application and logged to the server.


## 📊 Automated Database Migrations 📊

This release adds support for [Kysely automated database migrations](https://kysely.dev/docs/migrations). These add two quality-of-life improvements for implementers of the Viewer:
1. If the eCR Viewer database isn't up to date with the latest migrations, the application will show an error message
    i. This means you can't get into a state where the data schema version doesn't match the application version.
2. Instead of running the SQL scripts manually, you'll call a new API endpoint that runs the migrations for you. See [API documentation here](https://github.com/CDCgov/dibbs-ecr-viewer/blob/main/containers/ecr-viewer/api-documentation.md#migrate-metadata-database).

### 🏕 Notable Features

# Notes 4/29/25
## Release Summary
This release adds support for automated database migrations for the non-integrated version of the Viewer. More information about these automated migrations is below.

This release also adds a sign-out button to the application, and added [new docs](https://cdcgov.github.io/dibbs-ecr-viewer/documents/Setup_Guide.html) to reference.  


### 🚧 Required Infrastructure Changes 🚧

There are two environment variable changes associated with the automated migrations. These changes are only required for users running the non-integrated Viewer.

`METADATA_DATABASE_SCHEMA`: Optional. Possible values are "core" and "extended". Database schema to use for metadata storage. Core has a small subset of Extended. Default value is "extended".
`METADATA_DATABASE_MIGRATION_SECRET` : Secret needed to apply migrations via the /migrate-db api route. If not set, a random UUID will be assigned by the application and logged to the server.


## 📊 Automated Database Migrations 📊

This release adds support for [Kysely automated database migrations](https://kysely.dev/docs/migrations). These add two quality-of-life improvements for implementers of the Viewer:
1. If the eCR Viewer database isn't up to date with the latest migrations, the application will show an error message
    i. This means you can't get into a state where the data schema version doesn't match the application version.
2. Instead of running the SQL scripts manually, you'll call a new API endpoint that runs the migrations for you. See [API documentation here](https://github.com/CDCgov/dibbs-ecr-viewer/blob/main/containers/ecr-viewer/api-documentation.md#migrate-metadata-database).

### 🏕 Notable Features

----

# Notes 4/23/25
## Release Summary
This release fixes several user requests, including:
- Updated age calculations
- Improved error handling for data saving
- Consistent formatting of units in reference ranges

This release also adds new documentation and user guides, including [sample Rhapsody routes](https://github.com/CDCgov/dibbs-ecr-viewer/tree/main/examples/rhapsody).


### 🚧 Required Infrastructure Changes 🚧
No infrastructure changes are required in this release.

A change has been made to the eCR Viewer `process-zip` endpoint to improve debugging. If you would like the FHIR bundle to be returned from the request, you can use the new `return_fhir_bundle` parameter in the request. See [API docs here](https://github.com/CDCgov/dibbs-ecr-viewer/blob/main/containers/ecr-viewer/api-documentation.md).

### 🏕 Notable Features


-----

# Notes 4/9/2025

## Release Summary

This release adds several major features, including:
- Supporting GCP as a blob storage platform
- "Dual boot mode" authentication for jurisdictions who want to use both the eCR Library and NBS integration
- Using APHL's TES service to improve our relevant condition summaries
- Finalizing eCR grouping by `set_ID` in the Library

This release also adds an object-relational manager (ORM) to the eCR Viewer, which will help manage database connections. This change should be invisible to end users for now, but will make database management more seamless.

### 🚧 Required Infrastructure Changes 🚧

There are no required infrastructure changes with this release, but there is one suggested change for database management - see below.

### Environment Variable change:

Previously, SQLServer database connections were managed through individual environment variables - `SQL_SERVER_USER`, `SQL_SERVER_PASSWORD`, etc. With this release, we recommend changing to the universal `DATABASE_URL` environment variable to set your connection. This will allow you to specify more detailed connection strings, and manage things like the specific schema you're connecting to.
The legacy SQLServer environment variables will still be maintained for backwards compatibility in this release, but long-term `DATABASE_URL` will be the supported connection setting.

### 🏕 Notable Features