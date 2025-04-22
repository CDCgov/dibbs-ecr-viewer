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