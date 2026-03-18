BEGIN;

CREATE TABLE IF NOT EXISTS ecr_viewer.schema_migration
(LIKE public.ecr_viewer_schema_migration INCLUDING ALL);

INSERT INTO ecr_viewer.schema_migration
SELECT * FROM public.ecr_viewer_schema_migration;

CREATE TABLE IF NOT EXISTS ecr_viewer.schema_migration_lock
(LIKE public.ecr_viewer_schema_migration_lock INCLUDING ALL);

INSERT INTO ecr_viewer.schema_migration_lock
SELECT * FROM public.ecr_viewer_schema_migration_lock;

DROP TABLE IF EXISTS public.ecr_viewer_schema_migration;
DROP TABLE IF EXISTS public.ecr_viewer_schema_migration_lock;

COMMIT;