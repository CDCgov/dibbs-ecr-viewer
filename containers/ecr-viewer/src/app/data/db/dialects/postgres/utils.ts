import { sql, Kysely } from "kysely";

interface MigrationRow {
  name: string;
  timestamp?: string;
}

/**
 *
 * @param kysely - the Kysely instance
 * @param schemaName - the name of the schema to return
 * @returns the schema information if it exists, undefined otherwise
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSchema(kysely: Kysely<any>, schemaName: string) {
  return await kysely
    .selectFrom("information_schema.schemata")
    .selectAll()
    .where("schema_name", "=", schemaName)
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
    .selectFrom("information_schema.tables")
    .select("table_name")
    .where("table_schema", "=", schemaName)
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
    .selectFrom("information_schema.tables")
    .selectAll()
    .where("table_schema", "=", schemaName)
    .where("table_name", "=", tableName)
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
 * @param tableName = the name of the table containing the columns
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
    .selectFrom("information_schema.columns")
    .selectAll()
    .where("table_schema", "=", schemaName)
    .where("table_name", "=", tableName)
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
    .selectFrom("information_schema.columns")
    .selectAll()
    .where("table_schema", "=", schemaName)
    .where("table_name", "=", tableName)
    .where("column_name", "=", columnName)
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getMigrations(kysely: Kysely<any>): Promise<string[]> {
  const result =
    await sql<MigrationRow>`SELECT * FROM kysely_migrations`.execute(kysely);
  return result.rows.map((m) => m.name); // Return only the migration names
}
