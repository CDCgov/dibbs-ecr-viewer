#!/bin/bash

# Use at your own risk. Always review scripts before running them on your system.
#
# Run shellcheck against eCR Viewer deployment scripts
# Exit non-zero on any warning

set -e

SCRIPTS=(
  apt-updates.sh
  config-backup.sh
  docker-install.sh
  ecrv-init.sh
  ecrv-update.sh
  ecrv-wizard.sh
)

EXCLUDE=""  # variables set elsewhere / sourced-in vars

echo "Running shellcheck on deployment scripts..."
echo "Excluding: $EXCLUDE"
echo "---"

fail=0
for script in "${SCRIPTS[@]}"; do
  if [ ! -f "$script" ]; then
    echo "SKIP  $script (not found)"
    continue
  fi
  echo -n "PASS  $script"
  if ! shellcheck -e "$EXCLUDE" "$script" >/dev/null 2>&1; then
    echo "  FAILED"
    shellcheck -e "$EXCLUDE" "$script" || true
    fail=1
  else
    echo "  OK"
  fi
done

echo "---"
if [ "$fail" -ne 0 ]; then
  echo "shellcheck: FAILED (see warnings above)"
  exit 1
fi
echo "shellcheck: all passed"
exit 0
