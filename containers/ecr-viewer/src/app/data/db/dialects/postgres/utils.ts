import { Kysely } from "kysely";

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
  const result = await kysely
    .selectFrom("information_schema.schemata")
    .select("schema_name")
    .where("schema_name", "=", schemaName)
    .executeTakeFirst();

  return !!result; // Returns true if schema exists, false otherwise
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
  const result = await kysely
    .selectFrom("information_schema.tables")
    .select("table_name")
    .where("table_schema", "=", schemaName)
    .where("table_name", "=", tableName)
    .executeTakeFirst();

  return !!result; // Returns true if table exists, false otherwise
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
  const result = await kysely
    .selectFrom("information_schema.columns")
    .select("column_name")
    .where("table_schema", "=", schemaName)
    .where("table_name", "=", tableName)
    .where("column_name", "=", columnName)
    .executeTakeFirst();

  return !!result; // Returns true if column exists, false otherwise
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
  const result = await kysely
    .selectFrom("information_schema.columns")
    .selectAll()
    .where("table_schema", "=", schemaName)
    .where("table_name", "=", tableName)
    .where("column_name", "=", columnName)
    .executeTakeFirst();

  return result;
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
  const result = await kysely
    .selectFrom("information_schema.tables")
    .selectAll()
    .where("table_schema", "=", schemaName)
    .where("table_name", "=", tableName)
    .executeTakeFirst();

  return result;
}
/**
 *
 * @param kysely - the Kysely instance
 * @param schemaName - the name of the schema to return
 * @returns the schema information if it exists, undefined otherwise
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSchema(kysely: Kysely<any>, schemaName: string) {
  const result = await kysely
    .selectFrom("information_schema.schemata")
    .selectAll()
    .where("schema_name", "=", schemaName)
    .executeTakeFirst();

  return result;
}
/**
 *
 * @param kysely - the Kysely instance
 * @returns all schemas in the database
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSchemas(kysely: Kysely<any>) {
  const result = await kysely
    .selectFrom("information_schema.schemata")
    .selectAll()
    .execute();

  return result;
}
