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
