BEGIN TRY
    BEGIN TRANSACTION;

    SELECT * INTO ecr_viewer.schema_migration FROM dbo.ecr_viewer_schema_migration;
    
    ALTER TABLE ecr_viewer.schema_migration
    ADD CONSTRAINT PK_schema_migration PRIMARY KEY (name);

    ALTER TABLE ecr_viewer.schema_migration
        ALTER COLUMN name VARCHAR(255) NOT NULL;
    ALTER TABLE ecr_viewer.schema_migration
        ALTER COLUMN timestamp VARCHAR(255) NOT NULL;

    SELECT * INTO ecr_viewer.schema_migration_lock FROM dbo.ecr_viewer_schema_migration_lock;

    ALTER TABLE ecr_viewer.schema_migration_lock
    ADD CONSTRAINT PK_schema_migration_lock PRIMARY KEY (id);

    ALTER TABLE ecr_viewer.schema_migration_lock
        ALTER COLUMN id VARCHAR(255) NOT NULL;
    ALTER TABLE ecr_viewer.schema_migration_lock
        ALTER COLUMN is_locked INT NOT NULL;

    DROP TABLE IF EXISTS dbo.ecr_viewer_schema_migration;
    DROP TABLE IF EXISTS dbo.ecr_viewer_schema_migration_lock;

    COMMIT;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    THROW;
END CATCH;