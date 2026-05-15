#!/bin/bash

# Use at your own risk. Always review scripts before running them on your system.
#
# This script updates the Ubuntu server packages
# removes unnecessary packages, and cleans up the cache.
#
# Functions:
#   set_defaults: Initializes default values for the script options.
#   help: Displays the usage information and available options.
#   check_options: Parses and validates the command-line options.
#   run_commands: Executes the update, upgrade, autoremove, and clean commands based on the provided options.

set -euo pipefail

set_defaults() {
  apt_update=false
  apt_upgrade=false
  apt_autoremove=false
  apt_clean=false
}

msg() {
  echo -e "\e[1;32m$1\e[0m"
}

help() {
  echo "Usage: ./apt-updates.sh [-u] [-d] [-a] [-c] [-h] OR [-udac]"
  echo "Run all options: ./apt-updates.sh -udac"
  echo "Options:"
  echo "  -u  Update the package list"
  echo "  -d  Upgrade the installed packages"
  echo "  -a  Remove unnecessary packages"
  echo "  -c  Clean up the cache"
  echo "  -h  Display this help message"
  exit 1
}

check_options() {
  # if no arguments are passed, run the help message
  if [ $# -eq 0 ]; then
    help
  fi
  while getopts "udach" opt; do
    case ${opt} in
      u )
        apt_update=true
        ;;
      d )
        apt_upgrade=true
        ;;
      a )
        apt_autoremove=true
        ;;
      c )
        apt_clean=true
        ;;
      h )
        help
        ;;
      \? )
        echo "Invalid option: $OPTARG"
        ;;
    esac
  done
  shift $((OPTIND -1))
}

run_commands() {
  if [ "$apt_update" = true ]; then
    msg "Updating package list..."
    sudo apt-get update -y
    msg "Package list updated"
  fi
  if [ "$apt_upgrade" = true ]; then
    msg "Upgrading installed packages..."
    sudo apt-get upgrade -y
    msg "Installed packages upgraded"
  fi
  if [ "$apt_autoremove" = true ]; then
    msg "Removing unnecessary packages..."
    sudo apt-get autoremove -y
    msg "Unnecessary packages removed"
  fi
  if [ "$apt_clean" = true ]; then
    msg "Cleaning up the cache..."
    sudo apt-get clean
    msg "Cache cleaned up"
  fi
}

set_defaults
check_options "$@"
run_commands
