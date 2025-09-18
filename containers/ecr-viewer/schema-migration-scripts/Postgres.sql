BEGIN;

CREATE TABLE ecr_viewer.schema_migration
AS
SELECT * FROM ecr_viewer_schema_migration;

ALTER TABLE ecr_viewer.schema_migration
    ADD CONSTRAINT schema_migration_pkey PRIMARY KEY (name),
    ALTER COLUMN name SET NOT NULL,
    ALTER COLUMN timestamp SET NOT NULL;

DROP TABLE ecr_viewer_schema_migration;

CREATE TABLE ecr_viewer.schema_migration_lock
AS
SELECT * FROM ecr_viewer_schema_migration_lock;

ALTER TABLE ecr_viewer.schema_migration_lock
    ADD CONSTRAINT schema_migration_lock_pkey PRIMARY KEY (id),
    ALTER COLUMN id SET NOT NULL,
    ALTER COLUMN is_locked SET NOT NULL;

DROP TABLE ecr_viewer_schema_migration_lock;

COMMIT;