#!/bin/bash

# ansi color codes
RED="\033[31m"
GREEN="\033[32m"
YELLOW="\033[33m"
CYAN="\033[36m"
RESET="\033[0m"

# Check if .env exists
if [ ! -f .env ]; then
  # If .env doesn't exist, copy .env to .env
  cp .env.sample .env
  echo -e "${GREEN}.env was created from .env.sample${RESET}"
else
  # Check the content of .env and .env.sample to see if any changes exist from other PRs
  sample_hash=$(sha256sum .env.sample | awk '{print $1}')
  local_hash=$(sha256sum .env | awk '{print $1}')
  # Offer an option to update if there are differences between sample and local
  if [ "$sample_hash" != "$local_hash" ]; then
    echo -e "${YELLOW}.env exists but differs from .env.sample.${RESET}"
    echo -e "${CYAN}Would you like to update .env to match .env.sample? (Y/N)${RESET}"
    read -r response
    case "$response" in
    [Yy]*)
      cp .env.sample .env
      echo -e "${GREEN}.env was updated to match .env.sample${RESET}"
      ;;
    [Nn]*)
      echo -e "${CYAN}No changes made to .env.${RESET}"
      ;;
    *)
      echo -e "${RED}Invalid response. No changes made.${RESET}"
      ;;
    esac
  else
    echo -e "${GREEN}.env is already up to date with .env.sample${RESET}"
  fi
fi
