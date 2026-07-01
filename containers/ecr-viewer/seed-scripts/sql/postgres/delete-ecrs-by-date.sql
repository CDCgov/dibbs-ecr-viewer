-- Deletes eCR records created before a specified cutoff date from the Postgres
-- metadata database, along with all associated child records.
--
-- Usage:
--   1. Set CUTOFF_DATE in the DECLARE block below (YYYY-MM-DD format).
--   2. Run against your database:
--        psql "$DATABASE_URL" -f delete-ecrs-by-date.sql
--
-- Records with ecr_data.date_created < cutoff_date will be permanently deleted.
-- Take a database backup before running this script.

DO $$
DECLARE
  cutoff_date TIMESTAMPTZ := '2024-01-01';  -- <-- Set your cutoff date here
  ecr_count   INT;
BEGIN
  SELECT COUNT(*) INTO ecr_count
  FROM ecr_viewer.ecr_data
  WHERE date_created < cutoff_date;

  RAISE NOTICE 'Deleting % eCR record(s) created before %.', ecr_count, cutoff_date;

  -- Delete rule summaries first (FK: ecr_rr_rule_summaries - ecr_rr_conditions - ecr_data)
  DELETE FROM ecr_viewer.ecr_rr_rule_summaries
  WHERE ecr_rr_conditions_id IN (
    SELECT uuid FROM ecr_viewer.ecr_rr_conditions
    WHERE eicr_id IN (
      SELECT eicr_id FROM ecr_viewer.ecr_data
      WHERE date_created < cutoff_date
    )
  );

  DELETE FROM ecr_viewer.ecr_rr_conditions
  WHERE eicr_id IN (
    SELECT eicr_id FROM ecr_viewer.ecr_data
    WHERE date_created < cutoff_date
  );

  -- Extended schema tables (ecr_labs, ecr_immunizations, patient_address).
  -- These tables only exist when METADATA_DATABASE_SCHEMA=extended.
  -- Each block checks for the table before attempting deletion, so this script
  -- is safe to run against both core and extended schema deployments.
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'ecr_viewer' AND table_name = 'ecr_labs'
  ) THEN
    DELETE FROM ecr_viewer.ecr_labs
    WHERE eicr_id IN (
      SELECT eicr_id FROM ecr_viewer.ecr_data
      WHERE date_created < cutoff_date
    );
  END IF;

  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'ecr_viewer' AND table_name = 'ecr_immunizations'
  ) THEN
    DELETE FROM ecr_viewer.ecr_immunizations
    WHERE eicr_id IN (
      SELECT eicr_id FROM ecr_viewer.ecr_data
      WHERE date_created < cutoff_date
    );
  END IF;

  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'ecr_viewer' AND table_name = 'patient_address'
  ) THEN
    DELETE FROM ecr_viewer.patient_address
    WHERE eicr_id IN (
      SELECT eicr_id FROM ecr_viewer.ecr_data
      WHERE date_created < cutoff_date
    );
  END IF;

  -- Delete the parent eCR records last.
  DELETE FROM ecr_viewer.ecr_data
  WHERE date_created < cutoff_date;

  RAISE NOTICE 'Done. % eCR record(s) deleted.', ecr_count;
END $$;
