#!/usr/bin/env node

const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

async function runPostgresInit() {
  // Validate DATABASE_URL before attempting connection
  const url = process.env.DATABASE_URL;
  if (!url || url.length === 0) {
    console.error(
      "ERROR: DATABASE_URL environment variable is required but not set",
    );
    process.exit(1);
  }
  try {
    new URL(url); // Validates URL format
  } catch (_) {
    console.error("ERROR: DATABASE_URL is not a valid URL:", url);
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    connectTimeoutMS: 10000, // 10 seconds
  });

  try {
    await client.connect();
    console.log("Connected to PostgreSQL");

    const sqlPath = path.join(__dirname, "..", "postgres", "init.sql");
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`PostgreSQL init SQL file not found: ${sqlPath}`);
    }
    const sql = fs.readFileSync(sqlPath, "utf8");

    await client.query(sql);
    console.log("PostgreSQL init completed successfully");
  } catch (err) {
    console.error("PostgreSQL init failed:", err.message);
    // Don't fail the build if schema already exists
    if (err.code !== "42P06") {
      // 42P06 = schema already exists
      throw err;
    }
    console.warn("Init skipped - PostgreSQL schema already exists");
  } finally {
    await client.end();
  }
}

async function runSqlServerInit() {
  // Validate required environment variables before attempting connection
  const required = [
    "SQL_SERVER_HOST",
    "SQL_SERVER_USER",
    "SQL_SERVER_PASSWORD",
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error("ERROR: Missing SQL Server config:", missing.join(", "));
    process.exit(1);
  }

  // Use mssql package for SQL Server
  const mssql = require("mssql");

  // Get database name from env var or fallback to master
  const database = process.env.SQL_SERVER_DATABASE || "master";

  const config = {
    user: process.env.SQL_SERVER_USER,
    password: process.env.SQL_SERVER_PASSWORD,
    server: process.env.SQL_SERVER_HOST,
    database: database,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      connectTimeout: 10000, // 10 seconds
      requestTimeout: 30000, // 30 seconds for queries
    },
  };

  let pool;
  try {
    pool = await mssql.connect(config);
    console.log("Connected to SQL Server");

    const sqlPath = path.join(__dirname, "..", "sqlserver", "init.sql");
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`SQL Server init SQL file not found: ${sqlPath}`);
    }
    const sql = fs.readFileSync(sqlPath, "utf8");

    await pool.request().query(sql);
    console.log("SQL Server init completed successfully");
  } catch (err) {
    console.error("SQL Server init failed:", err.message);

    // Check for SQL Server schema exists errors
    const isSchemaExists =
      err.message.includes("already exists") ||
      err.message.includes("Cannot find the schema");

    if (!isSchemaExists) {
      throw err;
    }
    console.warn("Init skipped - Schema already exists");
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

async function main() {
  const configName = process.env.CONFIG_NAME || "";

  // Use simple string matching to determine database type
  const isPostgresConfig = configName.includes("_PG_");
  const isSqlServerConfig = configName.includes("_SQLSERVER_");

  if (isPostgresConfig) {
    console.log("Running PostgreSQL init...");
    await runPostgresInit();
  } else if (isSqlServerConfig) {
    console.log("Running SQL Server init...");
    await runSqlServerInit();
  } else {
    console.error('ERROR: CONFIG_NAME must contain "_PG_" or "_SQLSERVER"');
    console.error("Current CONFIG_NAME:", configName || "(not set)");
    process.exit(1);
  }
}

main();
