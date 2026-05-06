#!/bin/bash

# Use at your own risk. Always review scripts before running them on your system.
#
# Downloads eCR Viewer deployment scripts from GitHub and performs initial VM setup.
#
# Usage:
#   ./ecrv-init.sh
#
# Functions:
#   check_prerequisites - Installs wget if missing
#   download_scripts    - Downloads scripts from GitHub into ${DIBBS_CONFIG_DIR}
#   check_docker        - Warns if Docker is not installed (does NOT abort)
#   main                - Orchestrates prerequisites → backup → download → docker check
#
# Variables:
#   REPO_URL         - Base URL for raw GitHub content (CDCgov/dibbs-ecr-viewer repo)
#   DIBBS_CONFIG_DIR - Target directory for downloaded files
#
# Side effects:
#   Downloads 9 files into ${DIBBS_CONFIG_DIR} (3 .env, 1 .yaml, 5 .sh scripts).
#   Runs `chmod +x <script>.sh` in the **home directory**, not ${DIBBS_CONFIG_DIR}.
#   Sources backup.sh via `source` so variables are inherited.
#   Warns about Docker but does NOT abort if missing.

set -e

echo "=================================="
echo "  DIBBS eCR Viewer Initial Setup  "
echo "=================================="
echo ""

# Configuration
REPO_URL="https://raw.githubusercontent.com/CDCgov/dibbs-ecr-viewer"
DIBBS_CONFIG_DIR="${HOME}/dibbs-ecr-viewer-deployment"
BRANCH="main"

# Prerequisites check
check_prerequisites() {
  echo "Checking prerequisites..."

  # Install wget if missing
  if ! command -v wget &> /dev/null; then
    echo "WARNING: wget is not installed. Installing..."
    # shellcheck disable=SC2015
    sudo apt-get update -qq && sudo apt-get install -y -qq wget || { echo "ERROR: Failed to install wget."; exit 1; }
  fi

  echo "Prerequisites check complete."
  echo ""
}

download_scripts() {
  cd "$HOME"
  echo "Downloading ecrv scripts..."

  wget -O apt-updates.sh ${REPO_URL}/${BRANCH}/deployment/vm/apt-updates.sh
  wget -O config-backup.sh ${REPO_URL}/${BRANCH}/deployment/vm/config-backup.sh
  wget -O docker-install.sh ${REPO_URL}/${BRANCH}/deployment/vm/docker-install.sh
  wget -O ecrv-init.sh ${REPO_URL}/${BRANCH}/deployment/vm/ecrv-init.sh
  wget -O ecrv-update.sh ${REPO_URL}/${BRANCH}/deployment/vm/ecrv-update.sh
  wget -O ecrv-wizard.sh ${REPO_URL}/${BRANCH}/deployment/vm/ecrv-wizard.sh

  chmod +x apt-updates.sh
  chmod +x config-backup.sh
  chmod +x docker-install.sh
  chmod +x ecrv-init.sh
  chmod +x ecrv-update.sh
  chmod +x ecrv-wizard.sh

  echo "New ecrv scripts downloaded to: $HOME"
  echo ""
}

download_config() {
  cd "$HOME"
  echo "Downloading docker configuration..."

  # -P set directory, -nc skip if file exists because we don't want to overwrite any user settings
  wget -nc -P "${DIBBS_CONFIG_DIR}" "${REPO_URL}/${BRANCH}/deployment/vm/dibbs-ecr-viewer.env"
  wget -P "${DIBBS_CONFIG_DIR}" "${REPO_URL}/${BRANCH}/deployment/vm/dibbs-orchestration.env"
  # remove old docker-compose.yaml if it exists to ensure we get the latest version (in case of breaking changes)
  rm -f "${DIBBS_CONFIG_DIR}/docker-compose.yaml" || true
  wget -P "${DIBBS_CONFIG_DIR}" "${REPO_URL}/${BRANCH}/deployment/vm/docker-compose.yaml"

  echo "New docker configuration downloaded to: $DIBBS_CONFIG_DIR"
  echo ""
}

check_docker() {
  if ! docker info &> /dev/null; then
    echo "WARNING: Docker is not properly installed or accessible for this user."
    echo "  Ensure the Docker service is running and your user has permissions."
    echo "  See the Docker installation docs or official docker installation repo for details"
    echo "  Docs site: https://docs.docker.com/engine/install/ubuntu/"
    echo "  Repo site: https://github.com/docker/docker-install"
  else
    echo "Docker is installed and accessible."
  fi
}

# Main execution
main() {
  check_prerequisites
  download_scripts
  source ./config-backup.sh
  download_config

  check_docker
  echo ""
  echo "==================="
  echo "  Setup Complete!  "
  echo "==================="
  echo "To continue the update:"
  echo "cd $HOME"
  echo "./ecrv-update.sh"
  echo ""
}

main
