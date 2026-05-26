#!/bin/bash

# Use at your own risk. Always review scripts before running them on your system.
#
# Backs up the existing DIBBS_CONFIG_DIR directory (if present) and ensures
# the directory exists for subsequent use.
#
# Functions:
#   backup_config: Renames DIBBS_CONFIG_DIR to DIBBS_CONFIG_DIR.backup.TIMESTAMP
#   create_config_dir: Creates DIBBS_CONFIG_DIR if it doesn't exist
#
# Globals:
#   DIBBS_CONFIG_DIR — must be set by the caller before invoking main()

set -euo pipefail

DIBBS_CONFIG_DIR="${HOME}/dibbs-ecr-viewer-deployment"

backup_config() {
  # Backup existing clone if present
  echo "Backing up existing configuration (if any)..."
  if [ -d "$DIBBS_CONFIG_DIR" ]; then
    BACKUP_DIR="${DIBBS_CONFIG_DIR}.backup.${RANDOM}.$(date +%Y%m%d%H%M%S)"
    echo "Backing up configuration to: $BACKUP_DIR"
    cp -R "$DIBBS_CONFIG_DIR" "$BACKUP_DIR"
  fi
  echo "Backup complete."
  echo ""
}

create_config_dir() {
  echo "Ensuring configuration directory exists: $DIBBS_CONFIG_DIR"
  if [ ! -d "$DIBBS_CONFIG_DIR" ]; then
    echo "Creating configuration directory..."
    mkdir -p "$DIBBS_CONFIG_DIR"
  fi
  echo "Configuration directory ready."
  echo ""
}

# Main execution
main() {
  echo "================================="
  echo "  DIBBS eCR Viewer Config Backup"
  echo "================================="
  echo ""
  backup_config
  create_config_dir
  echo "============================="
  echo "  Backup Complete! "
  echo "  New config directory ready at: $DIBBS_CONFIG_DIR"
  echo "=============================="
  echo ""
}

main
