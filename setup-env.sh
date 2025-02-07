#!/bin/bash

# ansi color codes
RED="\033[31m"
GREEN="\033[32m"
YELLOW="\033[33m"
CYAN="\033[36m"
RESET="\033[0m"

ENV_FILE_NAME="${1:-.env}"
BASE_ENV_FILE="${2:-.env.sample}"

if [ ! -f  $ENV_FILE_NAME ]; then
  cp $BASE_ENV_FILE $ENV_FILE_NAME
  echo -e "${GREEN}$ENV_FILE_NAME was created from $BASE_ENV_FILE${RESET}"
else
  # Check the content of .env and $BASE_ENV_FILE to see if any changes exist from other PRs
  sample_hash=$(sha256sum $BASE_ENV_FILE | awk '{print $1}')
  local_hash=$(sha256sum $ENV_FILE_NAME | awk '{print $1}')
  # Offer an option to update if there are differences between sample and local
  if [ "$sample_hash" != "$local_hash" ]; then
    echo -e "${YELLOW}$ENV_FILE_NAME exists but differs from $BASE_ENV_FILE.${RESET}"
    echo -e "${CYAN}Would you like to update $ENV_FILE_NAME to match $BASE_ENV_FILE? (Y/N)${RESET}"
    read -r response
    case "$response" in
    [Yy]*)
      cp $BASE_ENV_FILE $ENV_FILE_NAME
      echo -e "${GREEN}$ENV_FILE_NAME was updated to match $BASE_ENV_FILE${RESET}"
      ;;
    [Nn]*)
      echo -e "${CYAN}No changes made to $ENV_FILE_NAME.${RESET}"
      ;;
    *)
      echo -e "${RED}Invalid response. No changes made.${RESET}"
      ;;
    esac
  else
    echo -e "${GREEN}$ENV_FILE_NAME is already up to date with $BASE_ENV_FILE${RESET}"
  fi
fi
