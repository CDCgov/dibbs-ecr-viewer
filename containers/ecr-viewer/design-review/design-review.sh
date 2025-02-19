#!/bin/bash

# Check if branch name is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <branch-name>"
    exit 1
fi

BRANCH_NAME=$1

# Check if the value indicating whether to view the non-integrated viewer is provided/valid
if [ -n "$2" ]; then
    if [[ "$2" == "true" || "$2" == "false" ]]; then
        IS_NON_INTEGRATED=$2
    else
        echo "Invalid value for IS_NON_INTEGRATED. It must be 'true' or 'false'."
        exit 1
    fi
else
    IS_NON_INTEGRATED=true
fi

# Check if the value indicating whether to convert the seed data is provided/valid
if [ -n "$3" ]; then
    if [[ "$3" == "true" || "$3" == "false" ]]; then
        CONVERT_SEED_DATA=$3
    else
        echo "Invalid value for CONVERT_SEED_DATA. It must be 'true' or 'false'."
        exit 1
    fi
else
    CONVERT_SEED_DATA=false
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" &> /dev/null
}

# Install Homebrew if it's not already installed
if ! command_exists brew; then
    echo "Homebrew not found, installing it now..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Update Homebrew
brew update

# Install Git if it's not already installed
if ! command_exists git; then
    brew install git
fi

# Install Docker if it's not already installed
if ! command_exists docker; then
    brew install --cask docker
fi

# Install NPM if it's not already installed
if ! command_exists npm; then
    brew install node
fi

# Start Docker
open /Applications/Docker.app
echo "Waiting for Docker to launch..."
while ! docker system info > /dev/null 2>&1; do
    sleep 1
done

# Clone the repository if it doesn't exist, otherwise pull the latest changes
REPO_URL="https://github.com/CDCgov/phdi.git"
REPO_DIR="phdi"

if [ ! -d "$REPO_DIR" ]; then
    git clone $REPO_URL
    cd $REPO_DIR
else
    cd $REPO_DIR
    git fetch
fi

cd ./containers/ecr-viewer

# Checkout the specified branch
git checkout $BRANCH_NAME
git pull

npm i

# Write env vars to .env.local
npm run setup-local-env

if [ "$IS_NON_INTEGRATED" = true ]; then
    echo "CONFIG_NAME=AWS_SQLSERVER_NON_INTEGRATED" >> .env.local
    URL="http://localhost:3000/ecr-viewer"
else
    echo "CONFIG_NAME=AWS_INTEGRATED" >> .env.local
    URL=http://localhost:3000/ecr-viewer/view-data/6100896d-b520-497c-b2fe-1c111c679274?auth=eyJhbGciOiJSUzI1NiIsImlkIjoiYmxhaCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.hXmX6wu9ThiSqNEl6Y3pBETppiIt0j4RKSVPO_AAYZJZsngSFiu8GuGDtA13kJ-texfUHshqcy4euoVwfmN-naDi2Ly6p6lPjY6xzmTuQ1DtiKLZDNBsDupjoLAuIJQ3K8uWRnCdRGG1ZlTkZa-SG8b4jfDLRrl1fPiJCWM62XV7_gIvqCvRAPdP9kMrOV1LtLEuXgoXZGifVNnPQhtT7fQ7kDmbM-HDG4MquZy89CIRy2q22xIclePOAoe0Ifz6q7-NG3I9CzKOAa_Vx6Oy5ZYBYphfV1n46gp4OC0Cb_w-wFLfRDuDPJZvcS5ed2HxdyZrU_GeD4WSN5IQpEn_45CZifBzmv9-jweEUD2or3sp1DReORLZG2CvBqtixC0p3gIeGnY4HROduafmDfyI0gcv7pDM-fcreMCBG-7uqUPkk9rqhCPw9n6fhWvNMSGrtW9tx6hAPNxjKJ2AsyTh7cJyR0teVpijhXZz0dGJOtYY1-nlR7_BnJH2lC9tLiIJcVl1JKfGRu18MV1bHs7y25Wp1HxVDUXllShXa7_oD7ljnE3stmpO5GPMbxvWC_RKO_bu_e2mAgJ3yiPImFpLVYZZgBqClctciZMQeV1lZTAy-7Xlzgdx-IvFc9VuigKw6hfk4on98BxMUENeh20KIgVv8cMr4ZjAGV3MjnFnHWw
fi

# Run FHIR conversion on seed data
if [ "$CONVERT_SEED_DATA" = true ]; then
  echo "Running seed data FHIR conversion..."
  npm run clear-local
  npm run convert-seed-data:build
else
  echo "Skipping seed data FHIR conversion..."
fi

# Run ecr viewer
npm run local-docker

# Wait for eCR Viewer to be available
while ! curl -s -o /dev/null -w "%{http_code}" "$URL" | grep -q "200"; do
    echo "Waiting for $URL to be available..."
    sleep 5
done

# Open in default browser
open $URL

# Prompt to end review session
read -p "Press enter to end review"
docker compose -f ./docker-compose.yaml --profile "*" down
