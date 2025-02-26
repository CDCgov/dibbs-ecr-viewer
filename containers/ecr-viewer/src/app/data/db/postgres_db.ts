import pgp from "pg-promise";

/**
 * Global scope singleton creator for pgPromise
 * @async
 * @function createSingleton
 * @param name A name for your singleton
 * @param create Anonymous function containing what you want singleton-ized
 * @returns A singleton of the provided object
 */
const createSingleton = <T>(name: string, create: () => T): T => {
  const s = Symbol.for(name);
  let scope = (global as any)[s];
  if (!scope) {
    scope = { ...create() };
    (global as any)[s] = scope;
  }
  return scope;
};

const pgPromise = pgp();
const db_url = process.env.DATABASE_URL || "";

interface IDatabaseScope {
  database: pgp.IDatabase<any>;
  pgPromise: pgp.IMain;
}

/**
 * Provides access to pgPromise DB singleton
 * @function getDB
 * @returns A singleton of the pgPromise DB connection
 */
export const getDB = (): IDatabaseScope => {
  return createSingleton<IDatabaseScope>("my-app-database-space", () => {
    return {
      database: pgPromise(db_url),
      pgPromise,
    };
  });
};
