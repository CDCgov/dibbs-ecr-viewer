#!/bin/sh
set -e

# Run database migrations if using PostgreSQL
if echo "$DATABASE_URL" | grep -q "postgres"; then
  echo "Running PostgreSQL database migrations..."
  # The init.sql creates the schema, this can be extended for future migrations
  psql "$DATABASE_URL" -f /app/sql/postgres/init.sql || true
fi

# Execute the main command (start Next.js server)
exec "$@"
