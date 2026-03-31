#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Validate required environment variables for PostgreSQL
function validatePostgresConfig() {
  const url = process.env.DATABASE_URL;
  if (!url || url.length === 0) {
    console.error('ERROR: DATABASE_URL environment variable is required but not set');
    return false;
  }
  try {
    new URL(url); // Validates URL format
  } catch (_) {
    console.error('ERROR: DATABASE_URL is not a valid URL:', url);
    return false;
  }
  return true;
}

// Validate required environment variables for SQL Server
function validateSqlServerConfig() {
  const required = ['SQL_SERVER_HOST', 'SQL_SERVER_USER', 'SQL_SERVER_PASSWORD'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.error('ERROR: Missing SQL Server config:', missing.join(', '));
    return false;
  }
  return true;
}

async function runPostgresMigration() {
  // Validate DATABASE_URL before attempting connection
  if (!validatePostgresConfig()) {
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    connectTimeoutMS: 10000, // 10 seconds
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL');

    const sqlPath = path.join(__dirname, '..', 'sql', 'postgres', 'init.sql');
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`PostgreSQL migration SQL file not found: ${sqlPath}`);
    }
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sql);
    console.log('PostgreSQL migrations completed successfully');
  } catch (err) {
    console.error('PostgreSQL migration failed:', err.message);
    // Don't fail the build if schema already exists
    if (err.code !== '42P06') { // 42P06 = schema already exists
      throw err;
    }
    console.warn('Migration skipped - PostgreSQL schema already exists');
  } finally {
    await client.end();
  }
}

async function runSqlServerMigration() {
  // Validate required environment variables before attempting connection
  if (!validateSqlServerConfig()) {
    process.exit(1);
  }

  // Use mssql package for SQL Server
  const mssql = require('mssql');

  // Extract database name from DATABASE_URL or use SQL_SERVER_DATABASE env var
  let database = process.env.SQL_SERVER_DATABASE;
  if (!database) {
    // Fallback to parsing DATABASE_URL if set (PostgreSQL format)
    try {
      const urlParts = process.env.DATABASE_URL?.split('/');
      database = urlParts && urlParts.length > 0 ? urlParts[urlParts.length - 1] : 'master';
    } catch (_) {
      database = 'master';
    }
  }

  const config = {
    user: process.env.SQL_SERVER_USER,
    password: process.env.SQL_SERVER_PASSWORD,
    server: process.env.SQL_SERVER_HOST,
    database: database,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      connectTimeout: 10000, // 10 seconds
      requestTimeout: 300000, // 5 minutes for queries
    },
  };

  let pool;
  try {
    pool = await mssql.connect(config);
    console.log('Connected to SQL Server');

    const sqlPath = path.join(__dirname, '..', 'sql', 'sqlserver', 'init.sql');
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`SQL Server migration SQL file not found: ${sqlPath}`);
    }
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await pool.request().query(sql);
    console.log('SQL Server migrations completed successfully');
  } catch (err) {
    console.error('SQL Server migration failed:', err.message);

    // Check for SQL Server schema exists errors using error numbers
    // 2714 = There is already an object named '...' in the database
    // 15151 = Cannot find the schema ... because it does not exist
    const isSchemaExists =
      err.number === 2714 ||
      err.number === 15151 ||
      err.message.includes('already exists') ||
      err.message.includes('Cannot find the schema');

    if (!isSchemaExists) {
      throw err;
    }
    console.warn('Migration skipped - SQL Server schema already exists');
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

async function main() {
  const configName = process.env.CONFIG_NAME || '';

  // Use more specific matching to avoid false positives
  const isPostgresConfig = configName.includes('_PG_') || /_(PG)$/.test(configName);
  const isSqlServerConfig = configName.includes('_SQLSERVER_') || /_(SQLSERVER)$/.test(configName);

  if (isPostgresConfig) {
    console.log('Running PostgreSQL migrations...');
    await runPostgresMigration();
  } else if (isSqlServerConfig) {
    console.log('Running SQL Server migrations...');
    await runSqlServerMigration();
  } else {
    console.error('ERROR: CONFIG_NAME must contain "_PG_" or "_SQLSERVER"');
    console.error('Current CONFIG_NAME:', configName || '(not set)');
    process.exit(1);
  }
}

main();
