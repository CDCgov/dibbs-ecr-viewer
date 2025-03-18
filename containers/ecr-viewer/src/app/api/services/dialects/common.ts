import { ColumnDataType, Expression, sql } from "kysely";

type MappedSqlThings = {
  now: Expression<string>;
  datetimeType: ColumnDataType | Expression<string>;
};

const map: { [key: string]: MappedSqlThings } = {
  postgres: {
    now: sql`NOW()`,
    datetimeType: "timestamptz",
  },
  sqlserver: {
    now: sql`SYSDATETIMEOFFSET()`,
    datetimeType: sql`DATETIMEOFFSET`,
  },
};

/**
 * helper to get mapped sql expression
 * @param key which thing to get
 * @returns mapped sql
 */
export const getSql = <K extends keyof MappedSqlThings>(
  key: K,
): MappedSqlThings[K] => {
  return map[process.env.METADATA_DATABASE_TYPE!][key];
};
