import {
  ComparisonOperator,
  ColumnDataType,
  Expression,
  sql,
  Kysely,
} from "kysely";

type MappedSqlThings = {
  now: Expression<string>;
  datetimeType: ColumnDataType | Expression<string>;
  datetimeTzType: ColumnDataType | Expression<string>;
  like: ComparisonOperator;
  maxVarchar: Expression<string>;
};

const map: {
  [K in NonNullable<
    typeof process.env.METADATA_DATABASE_TYPE
  >]: MappedSqlThings;
} = {
  postgres: {
    now: sql`NOW()`,
    datetimeType: "timestamp",
    datetimeTzType: "timestamptz",
    like: "ilike",
    maxVarchar: sql`varchar`,
  },
  sqlserver: {
    now: sql`SYSDATETIMEOFFSET()`,
    datetimeType: sql`DATETIME`,
    datetimeTzType: sql`DATETIMEOFFSET`,
    like: "like",
    maxVarchar: sql`varchar(MAX)`,
  },
};

/**
 * helper to get mapped sql expression
 * @param key which thing to get
 * @returns mapped sql
 */
export const getSql = <K extends keyof MappedSqlThings>(
  key: K
): MappedSqlThings[K] => {
  return map[process.env.METADATA_DATABASE_TYPE!][key];
};

/**
 * Function to rename column (uses SQL syntax for specified db type)
 * 
 * @param db - Kysely database instance
 * @param schema - Database schema
 * @param table - Table name containing the column to rename
 * @param oldColumn - Existing column name
 * @param newColumn - New column name
 * @throws {Error} If the configured database type is not supported.
 */
export const renameColumn = async (
  db: Kysely<unknown>,
  schema: string,
  table: string,
  oldColumnName: string,
  newColumnName: string
) => {
  switch (process.env.METADATA_DATABASE_TYPE) {
    case "postgres":
      await sql
        .raw(
          `ALTER TABLE "${schema}"."${table}" RENAME COLUMN "${oldColumnName}" TO "${newColumnName}"`
        )
        .execute(db);
      break;

    case "sqlserver":
      await sql
        .raw(
          `EXEC sp_rename '${schema}.${table}.${oldColumnName}', '${newColumnName}', 'COLUMN'`
        )
        .execute(db);
      break;

    default:
      throw new Error(
        `Unsupported database type: ${process.env.METADATA_DATABASE_TYPE}`
      );
  }
};