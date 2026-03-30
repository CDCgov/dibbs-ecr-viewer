#!/usr/bin/env node

const { Client } = require("pg");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

async function runPostgresMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log("Connected to PostgreSQL");

    const sqlPath = path.join(__dirname, "..", "sql", "postgres", "init.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    await client.query(sql);
    console.log("PostgreSQL migrations completed successfully");
  } catch (err) {
    console.error("PostgreSQL migration failed:", err.message);
    // Don't fail the build if migration already exists
    if (err.code !== "42P06") {
      // 42P06 = schema already exists
      throw err;
    }
  } finally {
    await client.end();
  }
}

async function runSqlServerMigration() {
  // Use mssql package for SQL Server
  const mssql = require("mssql");

  const config = {
    user: process.env.SQL_SERVER_USER,
    password: process.env.SQL_SERVER_PASSWORD,
    server: process.env.SQL_SERVER_HOST,
    database: process.env.DATABASE_URL?.split("/").pop() || "master",
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
  };

  try {
    const pool = await mssql.connect(config);
    console.log("Connected to SQL Server");

    const sqlPath = path.join(__dirname, "..", "sql", "sqlserver", "init.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    await pool.request().query(sql);
    console.log("SQL Server migrations completed successfully");
  } catch (err) {
    console.error("SQL Server migration failed:", err.message);
    // Don't fail if schema already exists (42P06 is PostgreSQL code, SQL Server uses different error codes)
    // Check for common schema exists error messages
    const isSchemaExists =
      err.message.includes("ecr_viewer") &&
      (err.message.includes("already exists") ||
        err.message.includes("There is already an object") ||
        err.message.includes("Cannot find the schema"));
    if (!isSchemaExists) {
      throw err;
    }
  } finally {
    mssql.close();
  }
}

async function main() {
  const configName = process.env.CONFIG_NAME || "";

  if (configName.includes("PG")) {
    console.log("Running PostgreSQL migrations...");
    await runPostgresMigration();
  } else if (configName.includes("SQLSERVER")) {
    console.log("Running SQL Server migrations...");
    await runSqlServerMigration();
  } else {
    console.log(
      "No database migrations needed (CONFIG_NAME does not specify PG or SQLSERVER)",
    );
  }
}

main().catch((err) => {
  console.error("Migration script failed:", err);
  process.exit(1);
});
