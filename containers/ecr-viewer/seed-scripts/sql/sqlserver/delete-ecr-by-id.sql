-- Deletes a single eCR record by eCR ID from the SQL Server metadata database,
-- along with all associated child records.
--
-- Usage:
--   1. Set @target_ecr_id in the DECLARE block below.
--   2. Run against your database:
--        sqlcmd -S <server> -U <user> -P <password> -i delete-ecr-by-id.sql
--      Or via Docker (see seed-scripts/sql/sqlserver/Dockerfile):
--        sqlcmd -S localhost -U sa -P "$SQL_SERVER_PASSWORD" -C -i delete-ecr-by-id.sql
--
-- The eCR ID maps to ecr_data.eicr_id, which is the primary key documented for
-- eCR metadata records.
-- Take a database backup before running this script.

DECLARE @target_ecr_id VARCHAR(200) = 'REPLACE_WITH_ECR_ID';  -- <-- Set your eCR ID here
DECLARE @ecr_count INT;

BEGIN TRANSACTION;

BEGIN TRY
  IF @target_ecr_id IS NULL
    OR LTRIM(RTRIM(@target_ecr_id)) = ''
    OR @target_ecr_id = 'REPLACE_WITH_ECR_ID'
  BEGIN
    THROW 50000, 'Set @target_ecr_id before running this script.', 1;
  END

  SELECT @ecr_count = COUNT(*)
  FROM ecr_viewer.ecr_data
  WHERE eicr_id = @target_ecr_id;

  PRINT 'Deleting ' + CAST(@ecr_count AS VARCHAR(10)) + ' eCR record(s) with ecr_data.eicr_id = ' + @target_ecr_id + '.';

  -- Delete rule summaries first (FK: ecr_rr_rule_summaries - ecr_rr_conditions - ecr_data)
  DELETE rs
  FROM ecr_viewer.ecr_rr_rule_summaries rs
  INNER JOIN ecr_viewer.ecr_rr_conditions rc ON rs.ecr_rr_conditions_id = rc.uuid
  WHERE rc.eicr_id = @target_ecr_id;

  DELETE rc
  FROM ecr_viewer.ecr_rr_conditions rc
  WHERE rc.eicr_id = @target_ecr_id;

  -- Extended schema tables (only present when METADATA_DATABASE_SCHEMA=extended).
  -- Each block checks for the table before attempting deletion, so this script
  -- is safe to run against both core and extended schema deployments.
  IF OBJECT_ID('ecr_viewer.ecr_labs', 'U') IS NOT NULL
  BEGIN
    DELETE el
    FROM ecr_viewer.ecr_labs el
    WHERE el.eicr_id = @target_ecr_id;
  END

  IF OBJECT_ID('ecr_viewer.ecr_immunizations', 'U') IS NOT NULL
  BEGIN
    DELETE ei
    FROM ecr_viewer.ecr_immunizations ei
    WHERE ei.eicr_id = @target_ecr_id;
  END

  IF OBJECT_ID('ecr_viewer.patient_address', 'U') IS NOT NULL
  BEGIN
    DELETE pa
    FROM ecr_viewer.patient_address pa
    WHERE pa.eicr_id = @target_ecr_id;
  END

  -- Delete the parent eCR record last.
  DELETE FROM ecr_viewer.ecr_data
  WHERE eicr_id = @target_ecr_id;

  PRINT 'Done. ' + CAST(@ecr_count AS VARCHAR(10)) + ' eCR record(s) deleted.';
  COMMIT TRANSACTION;

END TRY
BEGIN CATCH
  ROLLBACK TRANSACTION;
  PRINT 'Error: ' + ERROR_MESSAGE();
  THROW;
END CATCH;
