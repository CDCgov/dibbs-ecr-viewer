-- Deletes ALL data from every table in the ecr_viewer schema.
--
-- WARNING: This is irreversible. Take a database backup before running.
--
-- Deleted data includes:
--   - All eCR records and associated child tables (labs, immunizations, RR data, etc.)
--   - Audit log entries
--   - Condition reference data
--   - User accounts, program areas, and user-program area assignments
--
-- The schema itself (tables, indexes, constraints) is preserved. You will need to
-- re-run database initialization (POST /migrate-db with init_admin_email) to
-- restore a usable admin account before the app can be used again.
--
-- Usage:
--   sqlcmd -S <server> -U <user> -P <password> -i delete-all-data.sql
--   Or via Docker (see seed-scripts/sql/sqlserver/Dockerfile):
--   sqlcmd -S localhost -U sa -P "$SQL_SERVER_PASSWORD" -C -i delete-all-data.sql

BEGIN TRANSACTION;

BEGIN TRY
  -- ECR child tables (FK order: deepest dependents first)
  DELETE FROM ecr_viewer.ecr_rr_rule_summaries;
  DELETE FROM ecr_viewer.ecr_rr_conditions;

  -- Extended schema tables (only present when METADATA_DATABASE_SCHEMA=extended)
  IF OBJECT_ID('ecr_viewer.ecr_labs', 'U') IS NOT NULL
    DELETE FROM ecr_viewer.ecr_labs;

  IF OBJECT_ID('ecr_viewer.ecr_immunizations', 'U') IS NOT NULL
    DELETE FROM ecr_viewer.ecr_immunizations;

  IF OBJECT_ID('ecr_viewer.patient_address', 'U') IS NOT NULL
    DELETE FROM ecr_viewer.patient_address;

  -- Parent ECR records
  DELETE FROM ecr_viewer.ecr_data;

  -- Audit log
  DELETE FROM ecr_viewer.audit_log;

  -- Condition reference (FK: condition_reference.program_area_uuid - program_area)
  DELETE FROM ecr_viewer.condition_reference;

  -- user_program_area must be cleared before user and program_area (FK constraints)
  DELETE FROM ecr_viewer.user_program_area;

  -- program_area.author_uuid references [user], so it must be deleted first
  DELETE FROM ecr_viewer.program_area;

  -- [user].author_uuid is a self-referential FK. Temporarily disable FK constraints
  -- on this table so all rows can be deleted in a single pass without ordering issues.
  ALTER TABLE ecr_viewer.[user] NOCHECK CONSTRAINT ALL;
  DELETE FROM ecr_viewer.[user];
  ALTER TABLE ecr_viewer.[user] CHECK CONSTRAINT ALL;

  PRINT 'All data deleted from ecr_viewer schema.';
  COMMIT TRANSACTION;

END TRY
BEGIN CATCH
  -- Re-enable constraints if the transaction is rolling back
  IF OBJECT_ID('ecr_viewer.[user]', 'U') IS NOT NULL
    ALTER TABLE ecr_viewer.[user] CHECK CONSTRAINT ALL;

  ROLLBACK TRANSACTION;
  PRINT 'Error: ' + ERROR_MESSAGE();
  THROW;
END CATCH;
