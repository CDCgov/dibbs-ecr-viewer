import { Kysely, TableMetadata } from "kysely";

import { AnyDb } from "@/app/data/metadataDb/database";

/**
 * get table metadata
 * @param db a database
 * @param schemaName name of the schema that we want to get tables from
 * @returns an array of table names
 */
export const getTables = async (
  db: Kysely<AnyDb>,
  schemaName: string,
): Promise<string[]> => {
  const tables = await db.introspection.getTables();
  return tables
    .filter(({ schema }) => schema === schemaName)
    .map(({ name }) => name);
};

/**
 * Looks up a schema by name and returns if it exists
 * @param db a database
 * @param schemaName the schema that you want to look up
 * @returns whether that schema exists
 */
export const schemaExistsByName = async (
  db: Kysely<AnyDb>,
  schemaName: string,
): Promise<boolean> => {
  const schemas = await db.introspection.getSchemas();
  return schemas.some(({ name }) => name === schemaName);
};

/**
 * Gets metadata for a table from the database
 * @param db a database
 * @param schemaName the name of the schema that contains the table
 * @param tableName the name of the table you want to look up
 * @returns the table metadata
 */
export const getTable = async (
  db: Kysely<AnyDb>,
  schemaName: string,
  tableName: string,
): Promise<TableMetadata | undefined> => {
  const tables = await db.introspection.getTables();
  return tables.find(
    ({ name, schema }) => name === tableName && schema === schemaName,
  );
};
