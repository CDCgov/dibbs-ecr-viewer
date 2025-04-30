/**
 * Get the current database dialect
 * @returns string describing dialect
 */
export const dbDialect = () => {
  return process.env.METADATA_DATABASE_TYPE;
};

/**
 * Get the current database namespace (schema)
 * @returns string describing namespace
 */
export const dbNamespace = () => {
  // use a different schema in testing so seed data doesn't get wiped out
  return process.env.TEST_TYPE === "integration"
    ? "test_ev_schema"
    : "ecr_viewer";
};

/**
 * Get the current database schema
 * @returns string describing schema
 */
export const dbSchema = () => {
  return process.env.METADATA_DATABASE_SCHEMA;
};
