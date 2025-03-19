import { ComparisonOperator, ColumnDataType, Expression, sql } from "kysely";

type MappedSqlThings = {
  now: Expression<string>;
  datetimeTzType: ColumnDataType | Expression<string>;
  like: ComparisonOperator;
  maxVarchar: Expression<string>;
};

const map: { [key: string]: MappedSqlThings } = {
  postgres: {
    now: sql`NOW()`,
    datetimeTzType: "timestamptz",
    like: "ilike",
    maxVarchar: sql`varchar`,
  },
  sqlserver: {
    now: sql`SYSDATETIMEOFFSET()`,
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
  key: K,
): MappedSqlThings[K] => {
  return map[process.env.METADATA_DATABASE_TYPE!][key];
};
