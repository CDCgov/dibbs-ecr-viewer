#!/bin/bash

# Use at your own risk. Always review scripts before running them on your system.
#
# Runs the eCR Viewer configuration wizard after verifying Docker is installed.
#
# Usage:
#   ./ecrv-update.sh
#
# Functions:
#   check_docker        - Exits with error if Docker is not properly installed
#   backup_config       - Sources config-backup.sh to backup existing config and prepare for new config
#   prompt_ecrv_wizard  - Asks user whether to run the interactive wizard
#   main                - Orchestrates: docker check → config-backup → wizard prompt
#
# Side effects:
#   Sources config-backup.sh via `source` (not `./config-backup.sh`) so variables are inherited.
#   Runs ./ecrv-wizard.sh if user answers "y" to the prompt.
#   Aborts with exit code 1 if Docker is not found.

set -e

echo "================================="
echo "  DIBBS eCR Viewer Update"
echo "================================="
echo ""

check_docker() {
  echo "Checking Docker installation..."
  if ! docker info &> /dev/null; then
    echo "WARNING: Docker is not properly installed or accessible for this user."
    echo "  Ensure the Docker service is running and your user has permissions."
    exit 1
  else
    echo "Docker is installed and accessible."
    echo ""
  fi
}

prompt_ecrv_wizard() {
  echo "The wizard script sets environment variables"
  read -rp "Would you like to run the wizard script? (y/n): " choice
  if [ "$choice" = "y" ]; then
    ./ecrv-wizard.sh
  else
    echo "Exiting..."
    exit 0
  fi
}

# Main execution
main() {
  check_docker
  source ./config-backup.sh
  prompt_ecrv_wizard
  echo ""
  echo "==================="
  echo "  Update Complete!"
  echo "==================="
  echo ""
}

main
