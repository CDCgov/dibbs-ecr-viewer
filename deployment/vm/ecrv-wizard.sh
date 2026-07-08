#!/bin/bash

# Use at your own risk. Always review scripts before running them on your system.
#
# Interactive setup wizard for the eCR Viewer application. Guides the user through
# configuring environment variables and applying them to dibbs-ecr-viewer.env.
#
# Usage:
#   ./ecrv-wizard.sh
#
# Functions:
#   clear_dot_env            - Truncates the .wizard temp file
#   display_intro            - Prints welcome banner and documentation link
#   docker_compose_vars      - Prompts for ORCHESTRATION_URL and DIBBS_VERSION
#   set_vars                 - Presents 15 config profiles, calls provider functions
#   confirm_dot_env_var      - Prompts for a variable value with .env default
#   confirm_update           - Displays all settings, cleans empty vars via sed
#   restart_docker_compose   - Runs `docker compose down && docker compose up -d`
#   add_env                  - Writes quoted key-value to .wizard file
#   check_var                - Reads existing .env value, prompts for confirmation
#   pg, sqlserver.           - Database config prompts (PostgreSQL, SQL Server)
#   aws, azure, gcp          - Storage provider prompts (S3, Blob, GCS)
#   auth, nextauth, jwt, nbs - Authentication config prompts (AD/Keycloak, NextAuth, JWT, NBS)
#   optional                 - Optional config prompts (SAVE_XML, DISPLAY_FEEDBACK_LINKS)
#   main                     - Orchestrates: clear → intro → compose vars → config → confirm → restart
#
# Variables:
#   project_dir              - Base path (default: ~/dibbs-ecr-viewer-deployment)
#   dibbs_ecr_viewer_env     - Active env file path
#   dibbs_ecr_viewer_bak     - Backup file created during confirmation
#   dibbs_ecr_viewer_wizard  - Temp file for collecting new variables
#
# Side effects:
#   15 config profiles (AWS/Azure/GCP × PG/SQLServer/Integrated × Non-Integrated/Dual).
#   `check_var ORCHESTRATION_URL` hardcodes to `http://dibbs-orchestration:8080` without prompting.
#   confirm_update deletes lines with empty values via `sed -i "/$var=/d"`.
#   Non-interactive warning: `read -p` blocks indefinitely if run without a TTY.

project_dir=$HOME/dibbs-ecr-viewer-deployment
dibbs_ecr_viewer_env=$project_dir/dibbs-ecr-viewer.env
dibbs_ecr_viewer_bak=$project_dir/dibbs-ecr-viewer.bak
dibbs_ecr_viewer_wizard=$project_dir/dibbs-ecr-viewer.wizard

clear_dot_env() {
  echo "" >"$dibbs_ecr_viewer_wizard"
}

display_intro() {
  echo ""
  echo -e "\e[1;32m**********************************************\e[0m"
  echo -e "\e[1;32m*                                            *\e[0m"
  echo -e "\e[1;32m*\e[0m   \e[1;37mWelcome to the eCR Viewer setup wizard\e[0m   \e[1;32m*\e[0m"
  echo -e "\e[1;32m*                                            *\e[0m"
  echo -e "\e[1;32m**********************************************\e[0m"
  echo ""
  echo -e "\e[1;32mDocumentation can be found at: \e[4;36mhttps://github.com/CDCgov/dibbs-ecr-viewer\e[0m"
  echo ""
}

set_vars() {
  while IFS= read -r line; do
    case $line in
    CONFIG_NAME=*)
      config_name=$(echo "$line" | cut -d'=' -f2-)
      ;;
    esac
  done <"$dibbs_ecr_viewer_env"
  if [ -z "$config_name" ]; then
    config_name="\e[1;33mNONE SELECTED\e[0m"
  fi
  echo -e "Current configuration: $config_name"
  echo ""
  PS3='
  Please select your CONFIG_NAME: '
  options=(
    "AWS_PG_NON_INTEGRATED" 
    "AWS_PG_DUAL"
    "AWS_SQLSERVER_NON_INTEGRATED"
    "AWS_SQLSERVER_DUAL"
    "AWS_INTEGRATED"
    "AZURE_PG_NON_INTEGRATED"
    "AZURE_PG_DUAL"
    "AZURE_SQLSERVER_NON_INTEGRATED"
    "AZURE_SQLSERVER_DUAL"
    "AZURE_INTEGRATED"
    "GCP_PG_NON_INTEGRATED"
    "GCP_PG_DUAL"
    "GCP_SQLSERVER_NON_INTEGRATED"
    "GCP_SQLSERVER_DUAL"
    "GCP_INTEGRATED"
    "Quit"
  )
  select opt in "${options[@]}"; do
    echo ""
    echo -e "\e[1;36m  Setting: CONFIG_NAME=$opt\e[0m"
    echo ""
    case $opt in
    "AWS_PG_NON_INTEGRATED")
      CONFIG_NAME="AWS_PG_NON_INTEGRATED"
      add_env "CONFIG_NAME" "$CONFIG_NAME"
      aws
      pg
      auth
      nextauth
      optional
      break
      ;;
    "AWS_PG_DUAL")
      CONFIG_NAME="AWS_PG_DUAL"
      add_env "CONFIG_NAME" "$CONFIG_NAME"
      aws
      pg
      nbs
      jwt
      auth
      nextauth
      optional
      break
      ;;
    "AWS_SQLSERVER_NON_INTEGRATED")
      CONFIG_NAME="AWS_SQLSERVER_NON_INTEGRATED"
      add_env "CONFIG_NAME" "$CONFIG_NAME"
      aws
      sqlserver
      auth
      nextauth
      optional
      break
      ;;
    "AWS_SQLSERVER_DUAL")
      CONFIG_NAME="AWS_SQLSERVER_DUAL"
      add_env "CONFIG_NAME" "$CONFIG_NAME"
      aws
      sqlserver
      nbs
      jwt
      auth
      nextauth
      optional
      break
      ;;
    "AWS_INTEGRATED")
      CONFIG_NAME="AWS_INTEGRATED"
      add_env "CONFIG_NAME" "$CONFIG_NAME"
      aws
      nbs
      jwt
      nextauth
      optional
      break
      ;;
    "AZURE_PG_NON_INTEGRATED")
      CONFIG_NAME="AZURE_PG_NON_INTEGRATED"
      add_env "CONFIG_NAME" "$CONFIG_NAME"
      azure
      pg
      auth
      nextauth
      optional
      break
      ;;
    "AZURE_PG_DUAL")
      CONFIG_NAME="AZURE_PG_DUAL"
      add_env "CONFIG_NAME" "$CONFIG_NAME"
      azure
      pg
      nbs
      jwt
      auth
      nextauth
      optional
      break
      ;;
    "AZURE_SQLSERVER_NON_INTEGRATED")
      CONFIG_NAME="AZURE_SQLSERVER_NON_INTEGRATED"
      add_env "CONFIG_NAME" "$CONFIG_NAME"
      azure
      sqlserver
      auth
      nextauth
      optional
      break
      ;;
    "AZURE_SQLSERVER_DUAL")
      CONFIG_NAME="AZURE_SQLSERVER_DUAL"
      add_env "CONFIG_NAME" "$CONFIG_NAME"
      azure
      sqlserver
      nbs
      jwt
      auth
      nextauth
      optional
      break
      ;;
    "AZURE_INTEGRATED")
      CONFIG_NAME="AZURE_INTEGRATED"
      add_env "CONFIG_NAME" "$CONFIG_NAME"
      azure
      nbs
      jwt
      nextauth
      optional
      break
      ;;
    "GCP_PG_NON_INTEGRATED")
      CONFIG_NAME="GCP_PG_NON_INTEGRATED"
      add_env "CONFIG_NAME" "$CONFIG_NAME"
      gcp
      pg
      auth
      nextauth
      optional
      break
      ;;
    "GCP_PG_DUAL")
      CONFIG_NAME="GCP_PG_DUAL"
      add_env "CONFIG_NAME" "$CONFIG_NAME"
      gcp
      pg
      nbs
      jwt
      auth
      nextauth
      optional
      break
      ;;
    "GCP_SQLSERVER_NON_INTEGRATED")
      CONFIG_NAME="GCP_SQLSERVER_NON_INTEGRATED"
      add_env "CONFIG_NAME" "$CONFIG_NAME"
      gcp
      sqlserver
      auth
      nextauth
      optional
      break
      ;;
    "GCP_SQLSERVER_DUAL")
      CONFIG_NAME="GCP_SQLSERVER_DUAL"
      add_env "CONFIG_NAME" "$CONFIG_NAME"
      gcp
      sqlserver
      nbs
      jwt
      auth
      nextauth
      optional
      break
      ;;
    "GCP_INTEGRATED")
      CONFIG_NAME="GCP_INTEGRATED"
      add_env "CONFIG_NAME" "$CONFIG_NAME"
      gcp
      nbs
      jwt
      nextauth
      optional
      break
      ;;
    "Quit")
      break
      ;;
    *) echo "invalid option $REPLY" ;;
    esac
  done
}

confirm_dot_env_var() {
  value=$1
  default=$2
  read -rp $'  \e[3m'"$value (Current Value: $default): "$'\e[0m' choice
  if [ -z "$choice" ]; then
    choice="$default"
  fi
  echo ""
  echo -e "  \e[1;36mSetting: $value=$choice\e[0m"
  echo ""
  add_env "$value" "$choice"
}

confirm_update() {
  echo -e "\e[1;33mPlease confirm the following settings (Double check for special characters that should be escaped):\e[0m"
  vars=$(cat "$dibbs_ecr_viewer_wizard")
  echo -e "\e[1;36m$vars\e[0m"
  echo ""
  read -p "Is this information correct? (y/n): " -r choice
  if [ "$choice" != "y" ]; then
    echo "Please run the script again and provide the correct information."
    exit 1
  fi
  echo -e "\e[1;32mSettings confirmed. Updating your configuration.\e[0m"
  cp "$dibbs_ecr_viewer_env" "$dibbs_ecr_viewer_bak"
  cat "$dibbs_ecr_viewer_wizard" >"$dibbs_ecr_viewer_env"
  # Read all lines first, then process - avoid read/write conflict with sed -i
  while IFS= read -r line; do
    # if line has an = sign, check the variable
    if [[ $line == *"="* ]]; then
      var=$(echo "$line" | cut -d'=' -f1)
      value=$(echo "$line" | cut -d'=' -f2-)
      # if the variable is empty or just quotes, delete the line
      if [[ $value == "" || $value == "\"\"" ]]; then
        echo -e "\e[1;33mRemoving empty variable from configuration: $var\e[0m"
        sed -i "/$var=/d" "$dibbs_ecr_viewer_env"
      fi
      # Update ~/.bashrc with the confirmed DIBBS_VERSION (must be before cleanup)
      if [[ $var == *"DIBBS_VERSION"* ]]; then
        set_bashrc_var "DIBBS_VERSION" "$value"
        DIBBS_VERSION=$value
      fi
    fi
  done < <(cat "$dibbs_ecr_viewer_env")
  echo ""
}

restart_docker_compose() {
  cd "$project_dir" || exit
  docker compose down
  DIBBS_VERSION=${DIBBS_VERSION//\"/} docker compose up -d
  cd - || exit
}

add_env() {
  if [[ $2 == \"*\" ]]; then
    # variable is already quoted
    echo "$1=$2" >>"$dibbs_ecr_viewer_wizard"
  else
    # variable is not quoted
    echo "$1=\"$2\"" >>"$dibbs_ecr_viewer_wizard"
  fi
}

# Set an environment variable in ~/.bashrc: remove any existing line and append.
# $1=var_name, $2=value (already quoted, e.g. "1.0.0").
set_bashrc_var() {
  local bashrc="$HOME/.bashrc"
  local version=${2//\"/}

  echo "Updating ~/.bashrc with ${1}=$version"
  sed -i "/^export ${1}=/d" "$bashrc"
  echo "export ${1}=$version" >> "$bashrc"
  echo -e "  \e[1;36mSet $1 in ~/.bashrc\e[0m"
  echo ""
}

pg() {
  check_var DATABASE_URL "PostgreSQL connection string format: postgres://USER:PASSWORD@HOST:PORT/DATABASE_NAME"
  check_var METADATA_DATABASE_SCHEMA "Schema options are: 'core' or 'extended'"
  check_var METADATA_DATABASE_MIGRATION_SECRET "Migration secret used to trigger migrations"
}

sqlserver() {
  check_var SQL_SERVER_USER
  check_var SQL_SERVER_PASSWORD
  check_var SQL_SERVER_HOST
  check_var DB_CIPHER
  check_var METADATA_DATABASE_SCHEMA "Schema options are: 'core' or 'extended'"
  check_var METADATA_DATABASE_MIGRATION_SECRET "Migration secret used to trigger migrations, one will be generated and output to ecr-viewer logs if you do not provide one"
}

nbs() {
  check_var NBS_API_PUB_KEY
  check_var NBS_PUB_KEY
}

jwt() {
  check_var JWT_API_PUB_KEY
  check_var JWT_PUB_KEY
}

auth() {
  check_var AUTH_PROVIDER "Valid options are 'ad' or 'keycloak'"
  check_var AUTH_CLIENT_ID
  check_var AUTH_CLIENT_SECRET
  check_var AUTH_ISSUER
  check_var AUTH_SESSION_DURATION_MIN "Optional: leave blank for use defaults"
  check_var NEXTAUTH_URL "URL for the eCR Viewer application authentication: http(s)://(DOMAIN||IP:PORT)/ecr-viewer/api/auth/"
}

nextauth() {
  check_var NEXTAUTH_SECRET "Generate a random secret using: openssl rand -base64 32"
}

optional() {
  check_var SAVE_XML "Optional: leave blank for use defaults"
  check_var DISPLAY_FEEDBACK_LINKS "Optional: leave blank for use defaults"
  check_var ECR_PROCESSING_TIMEOUT "Optional: leave blank for use defaults"
}

aws() {
  check_var AWS_REGION
  check_var ECR_BUCKET_NAME
}

azure() {
  check_var AZURE_STORAGE_CONNECTION_STRING
  check_var AZURE_CONTAINER_NAME
}

gcp() {
  check_var GCP_PROJECT_ID
  check_var ECR_BUCKET_NAME
}

check_var() {
  if [ -n "$2" ]; then
    printf "\e[1;31m%s\e[0m" "INFO: $2"
    echo ""
  fi
  if [ "$1" == "ORCHESTRATION_URL" ]; then
    echo -e "  \e[1;36mSetting: ORCHESTRATION_URL=http://dibbs-orchestration:8080\e[0m"
    echo ""
    add_env "$1" "http://dibbs-orchestration:8080"
  else
    while IFS= read -r line; do
      case $line in
      $1=*)
        # get the value after the first =, do not cut any other = signs
        # this is to avoid cutting the value in case it has an = sign
        var=$(echo "$line" | cut -d'=' -f2-)
        ;;
      esac
    done <"$dibbs_ecr_viewer_env"
    if [[ $var == "" ]]; then
      echo -e "\e[1;33m$1 is not set.\e[0m"
      echo ""
    fi
    confirm_dot_env_var "$1" "$var"
    # clear var to avoid reusing previous value
    var=""
  fi
}

docker_compose_vars() {
  # parse ecr-viewer.env file for environment variables
  echo -e "\e[1;33mParsing eCR Viewer for default environment variables...\e[0m"
  echo ""
  check_var ORCHESTRATION_URL
  check_var DIBBS_VERSION
}

main() {
  clear_dot_env
  display_intro
  docker_compose_vars
  set_vars
  confirm_update
  restart_docker_compose
}

main
