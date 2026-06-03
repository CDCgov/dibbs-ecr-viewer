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
-- TRUNCATE ... CASCADE is used to handle foreign key relationships, including the
-- self-referential user.author_uuid FK, without requiring superuser privileges.
--
-- Usage:
--   psql "$DATABASE_URL" -f delete-all-data.sql

DO $$
BEGIN
  -- ECR records and all child tables (ecr_rr_conditions, ecr_rr_rule_summaries,
  -- and extended schema tables ecr_labs, ecr_immunizations, patient_address if present).
  TRUNCATE ecr_viewer.ecr_data CASCADE;

  -- Audit log (no FK dependencies)
  TRUNCATE ecr_viewer.audit_log;

  -- User accounts and all dependent tables.
  -- CASCADE handles user_program_area, program_area, and condition_reference
  -- (via their FK chains back to user), as well as the self-referential
  -- user.author_uuid FK.
  TRUNCATE ecr_viewer."user" CASCADE;

  RAISE NOTICE 'All data deleted from ecr_viewer schema.';
END $$;
