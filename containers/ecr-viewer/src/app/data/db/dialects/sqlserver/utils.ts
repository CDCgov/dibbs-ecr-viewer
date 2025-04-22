import { sql, Kysely } from "kysely";

interface MigrationRow {
  name: string;
  timestamp?: string;
}

/**
 *
 * @param kysely - the Kysely instance
 * @returns all schemas in the database
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSchemas(kysely: Kysely<any>) {
  const schemas = await kysely.selectFrom("sys.schemas").selectAll().execute();
  return schemas.map((schemaRecord) => schemaRecord.schema_name);
}

/**
 *
 * @param kysely - the Kysely instance
 * @param schemaName - the name of the schema to return
 * @returns the schema information if it exists, undefined otherwise
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSchema(kysely: Kysely<any>, schemaName: string) {
  return await kysely
    .selectFrom("sys.schemas")
    .selectAll()
    .where("name", "=", schemaName)
    .executeTakeFirst();
}

/**
 *
 * @param kysely - the Kysely instance
 * @param schemaName - the name of the schema to check
 * @returns true if the schema exists, false otherwise
 */
export async function schemaExistsByName(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  kysely: Kysely<any>,
  schemaName: string,
): Promise<boolean> {
  return !!(await getSchema(kysely, schemaName)); // Returns true if schema exists, false otherwise
}

/**
 *
 * @param kysely - the Kysely instance
 * @param schemaName - the name of the schema to be examined
 * @returns - the names of all tables in the given schema
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getTables(kysely: Kysely<any>, schemaName: string) {
  const result = await kysely
    .selectFrom("sys.tables as t")
    .innerJoin("sys.schemas as s", "s.schema_id", "t.schema_id")
    .select("t.name as table_name")
    .where("s.name", "=", schemaName)
    .execute();

  return result.map((row) => row.table_name);
}

/**
 *
 * @param kysely - the Kysely instance
 * @param schemaName - the name of the schema containing the table
 * @param tableName - the name of the table to return
 * @returns the table information if it exists, undefined otherwise
 */
export async function getTable(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  kysely: Kysely<any>,
  schemaName: string,
  tableName: string,
) {
  return await kysely
    .selectFrom("sys.tables as t")
    .innerJoin("sys.schemas as s", "s.schema_id", "t.schema_id")
    .selectAll("t")
    .where("s.name", "=", schemaName)
    .where("t.name", "=", tableName)
    .executeTakeFirst();
}

/**
 *
 * @param kysely - the Kysely instance
 * @param schemaName - the name of the schema containing the table
 * @param tableName - the name of the table to check
 * @returns true if the table exists, false otherwise
 */
export async function tableExistsByName(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  kysely: Kysely<any>,
  schemaName: string,
  tableName: string,
): Promise<boolean> {
  return !!(await getTable(kysely, schemaName, tableName)); // Returns true if table exists, false otherwise
}

/**
 *
 * @param kysely - the Kysely instance
 * @param schemaName - the name of the schema containing the table
 * @param tableName - the name of the table containing the column
 * @returns all columns in the given table
 */
export async function getColumns(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  kysely: Kysely<any>,
  schemaName: string,
  tableName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  return await kysely
    .selectFrom("sys.columns as c")
    .innerJoin("sys.tables as t", "t.object_id", "c.object_id")
    .innerJoin("sys.schemas as s", "s.schema_id", "t.schema_id")
    .select("c.name as column_name")
    .where("s.name", "=", schemaName)
    .where("t.name", "=", tableName)
    .execute();
}

/**
 *
 * @param kysely - the Kysely instance
 * @param schemaName - the name of the schema containing the table
 * @param tableName - the name of the table containing the column
 * @param columnName - the name of the column to return
 * @returns the column information if it exists, undefined otherwise
 */
export async function getColumn(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  kysely: Kysely<any>,
  schemaName: string,
  tableName: string,
  columnName: string,
) {
  return await kysely
    .selectFrom("sys.columns as c")
    .innerJoin("sys.tables as t", "t.object_id", "c.object_id")
    .innerJoin("sys.schemas as s", "s.schema_id", "t.schema_id")
    .selectAll("c")
    .where("s.name", "=", schemaName)
    .where("t.name", "=", tableName)
    .where("c.name", "=", columnName)
    .executeTakeFirst();
}

/**
 *
 * @param kysely - the Kysely instance
 * @param schemaName - the name of the schema containing the table
 * @param tableName - the name of the table containing the column
 * @param columnName - the name of the column to check
 * @returns true if the column exists, false otherwise
 */
export async function columnExistsByName(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  kysely: Kysely<any>,
  schemaName: string,
  tableName: string,
  columnName: string,
): Promise<boolean> {
  return !!(await getColumn(kysely, schemaName, tableName, columnName)); // Returns true if column exists, false otherwise
}

/**
 *
 * @param kysely - the Kysely instance
 * @returns the names of all migrations in the migrations table
 */
export async function getMigrations(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  kysely: Kysely<any>,
): Promise<string[]> {
  const result =
    await sql<MigrationRow>`SELECT * FROM kysely_migrations`.execute(kysely);
  return result.rows.map((m) => m.name); // Return only the migration names
}
