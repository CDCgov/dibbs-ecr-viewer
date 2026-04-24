#!/bin/bash
# eCR Viewer Stack - Local Docker Deployment Script
#
# This script builds and starts all eCR Viewer services using Docker Compose.
# It requires Docker and Docker Compose to be installed and running.

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_DIR/deployment/docker-compose.yml"
ENV_FILE="$PROJECT_DIR/deployment/.env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print functions
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# =============================================================================
# Pre-flight Checks
# =============================================================================

check_prerequisites() {
    print_status "Checking prerequisites..."

    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed or not in PATH"
        exit 1
    fi

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed or not in PATH"
        exit 1
    fi

    # Check if compose file exists
    if [ ! -f "$COMPOSE_FILE" ]; then
        print_error "Docker Compose file not found: $COMPOSE_FILE"
        exit 1
    fi

    print_status "Prerequisites check passed"
}

check_environment() {
    print_status "Checking environment configuration..."

    # Check if .env file exists, copy from example if not
    if [ ! -f "$ENV_FILE" ]; then
        print_warning ".env file not found, copying from example..."
        cp "$PROJECT_DIR/deployment/docker-compose.env.example" "$ENV_FILE"
        print_status "Created .env file. Please edit it with your values."
        print_warning "Starting deployment with default (empty) values..."
    fi

    # Source .env file
    set -a
    source "$ENV_FILE"
    set +a

    # Check required variables
    if [ -z "$DATABASE_URL" ]; then
        print_error "DATABASE_URL is not set in .env file"
        print_status "Please edit $ENV_FILE and set DATABASE_URL"
        exit 1
    fi

    print_status "Environment check passed"
}

# =============================================================================
# Deployment Functions
# =============================================================================

build_images() {
    print_status "Building Docker images..."
    print_status "This may take several minutes on the first run."

    cd "$PROJECT_DIR"

    if command -v docker-compose &> /dev/null; then
        docker-compose -f "$COMPOSE_FILE" build
    else
        docker compose -f "$COMPOSE_FILE" build
    fi

    print_status "Docker images built successfully"
}

start_services() {
    print_status "Starting services..."

    cd "$PROJECT_DIR"

    if command -v docker-compose &> /dev/null; then
        docker-compose -f "$COMPOSE_FILE" up -d
    else
        docker compose -f "$COMPOSE_FILE" up -d
    fi

    print_status "Services started in detached mode"
}

wait_for_health() {
    print_status "Waiting for services to become healthy..."

    cd "$PROJECT_DIR"

    # Define services to wait for
    local services=("ecr-viewer" "orchestration" "fhir-converter" "ingestion" "message-parser" "trigger-code-reference")
    local max_wait=300  # 5 minutes max
    local waited=0
    local healthy_count=0

    while [ $healthy_count -lt ${#services[@]} ] && [ $waited -lt $max_wait ]; do
        sleep 10
        waited=$((waited + 10))

        healthy_count=0
        for service in "${services[@]}"; do
            # Get container status
            local status=""
            if command -v docker-compose &> /dev/null; then
                status=$(docker-compose -f "$COMPOSE_FILE" ps -q "$service" 2>/dev/null | xargs docker inspect --format='{{.State.Health.Status}}' 2>/dev/null || echo "checking")
            else
                status=$(docker compose -f "$COMPOSE_FILE" ps -q "$service" 2>/dev/null | xargs docker inspect --format='{{.State.Health.Status}}' 2>/dev/null || echo "checking")
            fi

            if [ "$status" = "healthy" ]; then
                healthy_count=$((healthy_count + 1))
            fi
        done

        print_status "Healthy services: $healthy_count/${#services[@]} (waited ${waited}s)"
    done

    if [ $healthy_count -lt ${#services[@]} ]; then
        print_warning "Not all services became healthy within timeout"
        print_status "Check logs with: docker-compose -f $COMPOSE_FILE logs"
    else
        print_status "All services are healthy!"
    fi
}

show_endpoints() {
    print_status ""
    print_status "=== eCR Viewer Stack is Running ==="
    print_status ""
    print_status "Service Endpoints:"
    print_status "  eCR Viewer:        http://localhost:3000"
    print_status "  Orchestration API: http://localhost:8080"
    print_status "  FHIR Converter:    http://localhost:8082"
    print_status "  Ingestion:         http://localhost:8083"
    print_status "  Message Parser:    http://localhost:8085"
    print_status "  Trigger Code Ref:  http://localhost:8086"
    print_status ""
    print_status "Health Check Endpoints:"
    print_status "  eCR Viewer:        http://localhost:3000/"
    print_status "  Orchestration:     http://localhost:8080/"
    print_status "  FHIR Converter:    http://localhost:8082/"
    print_status "  Ingestion:         http://localhost:8083/"
    print_status "  Message Parser:    http://localhost:8085/"
    print_status "  Trigger Code Ref:  http://localhost:8086/"
    print_status ""
    print_status "To view logs:      docker-compose -f $COMPOSE_FILE logs -f"
    print_status "To stop services:  docker-compose -f $COMPOSE_FILE down"
    print_status ""
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    echo ""
    print_status "eCR Viewer Stack Deployment"
    print_status "============================"
    echo ""

    check_prerequisites
    check_environment
    build_images
    start_services
    wait_for_health
    show_endpoints
}

main "$@"
