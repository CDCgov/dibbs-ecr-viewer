## Introduction

[!IMPORTANT]

When **upgrading from DIBBs version 8.0.0 or earlier to version 9.0.0 or later**, if you are using a configuration that includes a database (non-integrated or dual), you MUST run the correct script for your database type before applying migrations. 

This script will move the `ecr_viewer_schema_migration` and `ecr_viewer_schema_migration_lock` tables used by Kysely for managing migrations from the database's default schema into the `ecr_viewer` schema where the other tables are located.

## Instructions

- **Before running:** record the contents of the `ecr_viewer_schema_migration` table (for later reference/backup)
- Run the correct SQL script with the name corresponding to your database type
- Confirm that `ecr_viewer_schema_migration` and `ecr_viewer_schema_migration_lock` no longer exist in your default schema (`public` for Postgres, `dbo` for SQL Server)
- Confirm that `schema_migration` and `schema_migration_lock` now exist in the `ecr_viewer` schema
- Confirm that the new `schema_migration` table's contents match those recorded before running the script
- Confirm that `schema_migration_lock` contains 1 row with the `id` column's value as `migration_lock` and the `is_locked` column's as `0`
