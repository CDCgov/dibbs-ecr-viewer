SET XACT_ABORT ON; -- ensures rollback on error
BEGIN TRANSACTION;

SELECT *
INTO ecr_viewer.schema_migration
FROM ecr_viewer_schema_migration;

ALTER TABLE ecr_viewer.schema_migration
    ADD CONSTRAINT PK_schema_migration PRIMARY KEY (name);

ALTER TABLE ecr_viewer.schema_migration
    ALTER COLUMN name VARCHAR(255) NOT NULL;
ALTER TABLE ecr_viewer.schema_migration
    ALTER COLUMN timestamp VARCHAR(255) NOT NULL;

DROP TABLE ecr_viewer_schema_migration;

SELECT *
INTO ecr_viewer.schema_migration_lock
FROM ecr_viewer_schema_migration_lock;

ALTER TABLE ecr_viewer.schema_migration_lock
    ADD CONSTRAINT PK_schema_migration_lock PRIMARY KEY (id);

ALTER TABLE ecr_viewer.schema_migration_lock
    ALTER COLUMN id VARCHAR(255) NOT NULL;
ALTER TABLE ecr_viewer.schema_migration_lock
    ALTER COLUMN is_locked INT NOT NULL;

DROP TABLE ecr_viewer_schema_migration_lock;

COMMIT TRANSACTION;