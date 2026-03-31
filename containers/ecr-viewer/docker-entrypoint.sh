#!/bin/sh
set -e

# Run database migrations via Node.js script with timeout
echo "Running database migrations..."
if ! timeout 300 node /app/scripts/run-migrations.js; then
  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 124 ]; then
    echo "ERROR: Migration timed out after 5 minutes"
  else
    echo "ERROR: Migration failed with exit code $EXIT_CODE"
  fi
  exit 1
fi

# Execute the main command (start Next.js server)
exec "$@"
