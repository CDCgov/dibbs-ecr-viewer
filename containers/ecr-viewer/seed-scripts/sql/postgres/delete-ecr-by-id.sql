-- Deletes a single eCR record by eCR ID from the Postgres metadata database,
-- along with all associated child records.
--
-- Usage:
--   1. Set target_ecr_id in the DECLARE block below.
--   2. Run against your database:
--        psql "$DATABASE_URL" -f delete-ecr-by-id.sql
--
-- The eCR ID maps to ecr_data.eicr_id, which is the primary key documented for
-- eCR metadata records.
-- Take a database backup before running this script.

DO $$
DECLARE
  target_ecr_id VARCHAR(200) := 'REPLACE_WITH_ECR_ID';  -- <-- Set your eCR ID here
  ecr_count     INT;
BEGIN
  IF target_ecr_id IS NULL
    OR btrim(target_ecr_id) = ''
    OR target_ecr_id = 'REPLACE_WITH_ECR_ID'
  THEN
    RAISE EXCEPTION 'Set target_ecr_id before running this script.';
  END IF;

  SELECT COUNT(*) INTO ecr_count
  FROM ecr_viewer.ecr_data
  WHERE eicr_id = target_ecr_id;

  RAISE NOTICE 'Deleting % eCR record(s) with ecr_data.eicr_id = %.', ecr_count, target_ecr_id;

  -- Delete rule summaries first (FK: ecr_rr_rule_summaries - ecr_rr_conditions - ecr_data)
  DELETE FROM ecr_viewer.ecr_rr_rule_summaries
  WHERE ecr_rr_conditions_id IN (
    SELECT uuid FROM ecr_viewer.ecr_rr_conditions
    WHERE eicr_id = target_ecr_id
  );

  DELETE FROM ecr_viewer.ecr_rr_conditions
  WHERE eicr_id = target_ecr_id;

  -- Extended schema tables (ecr_lab_specimens, ecr_labs, ecr_immunizations,
  -- ecr_ehr_devices, patient_address).
  -- These tables only exist when METADATA_DATABASE_SCHEMA=extended.
  -- Each block checks for the table before attempting deletion, so this script
  -- is safe to run against both core and extended schema deployments.
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'ecr_viewer' AND table_name = 'ecr_lab_specimens'
  ) THEN
    DELETE FROM ecr_viewer.ecr_lab_specimens
    WHERE eicr_id = target_ecr_id;
  END IF;

  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'ecr_viewer' AND table_name = 'ecr_labs'
  ) THEN
    DELETE FROM ecr_viewer.ecr_labs
    WHERE eicr_id = target_ecr_id;
  END IF;

  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'ecr_viewer' AND table_name = 'ecr_immunizations'
  ) THEN
    DELETE FROM ecr_viewer.ecr_immunizations
    WHERE eicr_id = target_ecr_id;
  END IF;

  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'ecr_viewer' AND table_name = 'ecr_ehr_devices'
  ) THEN
    DELETE FROM ecr_viewer.ecr_ehr_devices
    WHERE eicr_id = target_ecr_id;
  END IF;

  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'ecr_viewer' AND table_name = 'patient_address'
  ) THEN
    DELETE FROM ecr_viewer.patient_address
    WHERE eicr_id = target_ecr_id;
  END IF;

  -- Delete the parent eCR record last.
  DELETE FROM ecr_viewer.ecr_data
  WHERE eicr_id = target_ecr_id;

  RAISE NOTICE 'Done. % eCR record(s) deleted.', ecr_count;
END $$;
