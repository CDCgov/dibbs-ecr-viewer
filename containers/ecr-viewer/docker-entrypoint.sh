#!/bin/sh
set -e

# Run database init via Node.js script with timeout
echo "Running database init..."
if ! timeout 60 node /app/sql/run-init.js; then
  if [ $? -eq 124 ]; then
    echo "ERROR: Init timed out after 60 seconds"
  else
    echo "ERROR: Init failed with exit code $?"
  fi
  exit 1
fi

# Execute the main command (start Next.js server)
exec "$@"
