BEGIN TRY
    BEGIN TRANSACTION;

    SELECT * INTO ecr_viewer.schema_migration FROM dbo.ecr_viewer_schema_migration;
    SELECT * INTO ecr_viewer.schema_migration_lock FROM dbo.ecr_viewer_schema_migration_lock;

    DROP TABLE IF EXISTS dbo.ecr_viewer_schema_migration;
    DROP TABLE IF EXISTS dbo.ecr_viewer_schema_migration_lock;

    COMMIT;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    THROW;
END CATCH;