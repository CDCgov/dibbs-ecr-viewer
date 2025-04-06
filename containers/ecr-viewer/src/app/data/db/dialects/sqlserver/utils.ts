import { Kysely } from 'kysely';

/**
 *
 * @param kysely - the Kysely instance
 * @param schemaName - the name of the schema to check
 * @returns true if the schema exists, false otherwise
 */
export async function schemaExistsByName(kysely: Kysely<any>, schemaName: string): Promise<boolean> {
  const result = await kysely
    .selectFrom('sys.schemas')
    .select('name')
    .where('name', '=', schemaName)
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
export async function tableExistsByName(kysely: Kysely<any>, schemaName: string, tableName: string): Promise<boolean> {
  const result = await kysely
    .selectFrom('sys.tables as t')
    .innerJoin('sys.schemas as s', 's.schema_id', 't.schema_id')
    .select('t.name as table_name')
    .where('s.name', '=', schemaName)
    .where('t.name', '=', tableName)
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
export async function columnExistsByName(kysely: Kysely<any>, schemaName: string, tableName: string, columnName: string): Promise<boolean> {
  const result = await kysely
    .selectFrom('sys.columns as c')
    .innerJoin('sys.tables as t', 't.object_id', 'c.object_id')
    .innerJoin('sys.schemas as s', 's.schema_id', 't.schema_id')
    .select('c.name as column_name')
    .where('s.name', '=', schemaName)
    .where('t.name', '=', tableName)
    .where('c.name', '=', columnName)
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
export async function getColumn(kysely: Kysely<any>, schemaName: string, tableName: string, columnName: string) {
  const result = await kysely
    .selectFrom('sys.columns as c')
    .innerJoin('sys.tables as t', 't.object_id', 'c.object_id')
    .innerJoin('sys.schemas as s', 's.schema_id', 't.schema_id')
    .selectAll('c')
    .where('s.name', '=', schemaName)
    .where('t.name', '=', tableName)
    .where('c.name', '=', columnName)
    .executeTakeFirst();

  return result;
}

/**
 *
 * @param kysely - the Kysely instance
 * @param schemaName - the name of the schema containing the table
 * @param tableName - the name of the table to return
 * @returns the table information if it exists, undefined otherwise
 */
export async function getTable(kysely: Kysely<any>, schemaName: string, tableName: string) {
  const result = await kysely
    .selectFrom('sys.tables as t')
    .innerJoin('sys.schemas as s', 's.schema_id', 't.schema_id')
    .selectAll('t')
    .where('s.name', '=', schemaName)
    .where('t.name', '=', tableName)
    .executeTakeFirst();

  return result;
}

/**
 *
 * @param kysely - the Kysely instance
 * @param schemaName - the name of the schema to return
 * @returns the schema information if it exists, undefined otherwise
 */
export async function getSchema(kysely: Kysely<any>, schemaName: string) {
  const result = await kysely
    .selectFrom('sys.schemas')
    .selectAll()
    .where('name', '=', schemaName)
    .executeTakeFirst();

  return result;
}

/**
 *
 * @param kysely - the Kysely instance
 * @returns all schemas in the database
 */
export async function getSchemas(kysely: Kysely<any>) {
  const result = await kysely
    .selectFrom('sys.schemas')
    .selectAll()
    .execute();

  return result;
}
