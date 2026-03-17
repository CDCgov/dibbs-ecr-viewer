IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'ecr_viewer')
BEGIN
    EXEC('CREATE SCHEMA ecr_viewer;');
END