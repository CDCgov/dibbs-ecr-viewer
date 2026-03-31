#!/bin/sh
set -e

# Run database init via Node.js script with timeout
echo "Running database init..."
if ! timeout 60 node /app/sql/run-init.js; then
  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 124 ]; then
    echo "ERROR: Init timed out after 5 minutes"
  else
    echo "ERROR: Init failed with exit code $EXIT_CODE"
  fi
  exit 1
fi

# Execute the main command (start Next.js server)
exec "$@"
