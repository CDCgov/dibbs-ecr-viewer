-- Deletes eCR records created before a specified cutoff date,
-- along with all associated child records.
--
-- Usage:
--   1. Set @cutoff_date in the DECLARE block below (YYYY-MM-DD format).
--   2. Run against your database:
--        sqlcmd -S <server> -U <user> -P <password> -i delete-ecrs-by-date.sql
--      Or via Docker (see seed-scripts/sql/sqlserver/Dockerfile):
--        sqlcmd -S localhost -U sa -P "$SQL_SERVER_PASSWORD" -C -i delete-ecrs-by-date.sql
--
-- Records with ecr_data.date_created < @cutoff_date will be permanently deleted.
-- Take a database backup before running this script.

DECLARE @cutoff_date DATETIMEOFFSET = '2024-01-01';  -- <-- Set your cutoff date here

BEGIN TRANSACTION;

BEGIN TRY
  -- Preview: show how many eCRs will be deleted.
  SELECT COUNT(*) AS ecrs_to_delete
  FROM ecr_viewer.ecr_data
  WHERE date_created < @cutoff_date;

  -- Delete rule summaries first (FK: ecr_rr_rule_summaries - ecr_rr_conditions - ecr_data)
  DELETE rs
  FROM ecr_viewer.ecr_rr_rule_summaries rs
  INNER JOIN ecr_viewer.ecr_rr_conditions rc ON rs.ecr_rr_conditions_id = rc.uuid
  INNER JOIN ecr_viewer.ecr_data d ON rc.eicr_id = d.eicr_id
  WHERE d.date_created < @cutoff_date;

  DELETE rc
  FROM ecr_viewer.ecr_rr_conditions rc
  INNER JOIN ecr_viewer.ecr_data d ON rc.eicr_id = d.eicr_id
  WHERE d.date_created < @cutoff_date;

  -- Extended schema tables (only present when METADATA_DATABASE_SCHEMA=extended).
  -- Each block checks for the table before attempting deletion, so this script
  -- is safe to run against both core and extended schema deployments.
  IF OBJECT_ID('ecr_viewer.ecr_lab_specimens', 'U') IS NOT NULL
  BEGIN
    DELETE els
    FROM ecr_viewer.ecr_lab_specimens els
    INNER JOIN ecr_viewer.ecr_data d ON els.eicr_id = d.eicr_id
    WHERE d.date_created < @cutoff_date;
  END

  IF OBJECT_ID('ecr_viewer.ecr_labs', 'U') IS NOT NULL
  BEGIN
    DELETE el
    FROM ecr_viewer.ecr_labs el
    INNER JOIN ecr_viewer.ecr_data d ON el.eicr_id = d.eicr_id
    WHERE d.date_created < @cutoff_date;
  END

  IF OBJECT_ID('ecr_viewer.ecr_immunizations', 'U') IS NOT NULL
  BEGIN
    DELETE ei
    FROM ecr_viewer.ecr_immunizations ei
    INNER JOIN ecr_viewer.ecr_data d ON ei.eicr_id = d.eicr_id
    WHERE d.date_created < @cutoff_date;
  END

  IF OBJECT_ID('ecr_viewer.ecr_ehr_devices', 'U') IS NOT NULL
  BEGIN
    DELETE eed
    FROM ecr_viewer.ecr_ehr_devices eed
    INNER JOIN ecr_viewer.ecr_data d ON eed.eicr_id = d.eicr_id
    WHERE d.date_created < @cutoff_date;
  END

  IF OBJECT_ID('ecr_viewer.patient_address', 'U') IS NOT NULL
  BEGIN
    DELETE pa
    FROM ecr_viewer.patient_address pa
    INNER JOIN ecr_viewer.ecr_data d ON pa.eicr_id = d.eicr_id
    WHERE d.date_created < @cutoff_date;
  END

  -- Delete the parent eCR records last.
  DELETE FROM ecr_viewer.ecr_data
  WHERE date_created < @cutoff_date;

  PRINT 'Deletion complete.';
  COMMIT TRANSACTION;

END TRY
BEGIN CATCH
  ROLLBACK TRANSACTION;
  PRINT 'Error: ' + ERROR_MESSAGE();
  THROW;
END CATCH;
