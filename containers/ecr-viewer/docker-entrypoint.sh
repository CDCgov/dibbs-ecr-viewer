#!/bin/sh
set -e

# Run database migrations via Node.js script
echo "Running database migrations..."
node /app/scripts/run-migrations.js

# Execute the main command (start Next.js server)
exec "$@"
