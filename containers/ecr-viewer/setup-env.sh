#!/bin/bash

# ansi color codes
RED="\033[31m"
GREEN="\033[32m"
YELLOW="\033[33m"
CYAN="\033[36m"
RESET="\033[0m"

# Check if .env.local exists
if [ ! -f .env.local ]; then
  # If .env.local doesn't exist, copy .env to .env.local
  cp .env.sample .env.local
  echo -e "${GREEN}.env.local was created from .env.sample${RESET}"
else
  # Check the content of .env.local and .env.sample to see if any changes exist from other PRs
  sample_hash=$(sha256sum .env.sample | awk '{print $1}')
  local_hash=$(sha256sum .env.local | awk '{print $1}')
  # Offer an option to update if there are differences between sample and local
  if [ "$sample_hash" != "$local_hash" ]; then
    echo -e "${YELLOW}.env.local exists but differs from .env.sample.${RESET}"
    echo -e "${CYAN}Would you like to update .env.local to match .env.sample? (Y/N)${RESET}"
    read -r response
    case "$response" in
    [Yy]*)
      cp .env.sample .env.local
      echo -e "${GREEN}.env.local was updated to match .env.sample${RESET}"
      ;;
    [Nn]*)
      echo -e "${CYAN}No changes made to .env.local.${RESET}"
      ;;
    *)
      echo -e "${RED}Invalid response. No changes made.${RESET}"
      ;;
    esac
  else
    echo -e "${GREEN}.env.local is already up to date with .env.sample${RESET}"
  fi
fi
