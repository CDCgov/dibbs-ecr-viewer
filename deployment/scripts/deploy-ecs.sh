#!/bin/bash
# eCR Viewer Stack - AWS ECS Fargate Deployment Script
#
# This script builds Docker images, pushes them to ECR, and deploys to ECS Fargate.
# It requires AWS CLI, Docker, and proper AWS credentials/configuration.

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_DIR/deployment/docker-compose.yml"
TASK_DEFINITION="$PROJECT_DIR/deployment/ecs/ecs-task-definition.json"
REGION="${AWS_REGION:-us-east-1}"
REPOSITORY_PREFIX="ecr-viewer"

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

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed or not in PATH"
        exit 1
    fi

    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed or not in PATH"
        exit 1
    fi

    # Check if task definition exists
    if [ ! -f "$TASK_DEFINITION" ]; then
        print_error "Task definition file not found: $TASK_DEFINITION"
        exit 1
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured or invalid"
        print_status "Please run: aws configure"
        exit 1
    fi

    print_status "Prerequisites check passed"
}

check_aws_configuration() {
    print_status "Checking AWS configuration..."

    # Get account ID
    ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
    echo "AWS Account ID: $ACCOUNT_ID"
    echo "AWS Region: $REGION"

    # Confirm before proceeding
    echo ""
    print_warning "This will deploy to ECS Fargate in region $REGION"
    read -p "Continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Deployment cancelled"
        exit 0
    fi
}

create_ecr_repositories() {
    print_status "Checking/creating ECR repositories..."

    local services=("ecr-viewer" "orchestration" "fhir-converter" "ingestion" "message-parser" "trigger-code-reference")

    for service in "${services[@]}"; do
        local repo_name="$REPOSITORY_PREFIX-$service"
        print_status "Checking repository: $repo_name"

        if ! aws ecr describe-repositories --repository-names "$repo_name" --region "$REGION" &> /dev/null; then
            print_status "Creating ECR repository: $repo_name"
            aws ecr create-repository --repository-name "$repo_name" --region "$REGION" > /dev/null
        else
            print_status "Repository exists: $repo_name"
        fi
    done

    print_status "ECR repositories ready"
}

get_login_password() {
    print_status "Getting ECR login credentials..."

    # Get login token
    aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

    print_status "Docker logged in to ECR"
}

build_and_push_images() {
    print_status "Building and pushing Docker images to ECR..."

    cd "$PROJECT_DIR"

    local services=("ecr-viewer" "orchestration" "fhir-converter" "ingestion" "message-parser" "trigger-code-reference")

    for service in "${services[@]}"; do
        print_status "Processing service: $service"

        # Get ECR repository URI
        local repo_uri="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPOSITORY_PREFIX-$service"

        # Build image
        print_status "Building image for $service..."
        if [ "$service" = "ecr-viewer" ]; then
            # ecr-viewer has a different context path
            docker build -t "$repo_uri:$VERSION" "../containers/$service/"
        else
            docker build -t "$repo_uri:$VERSION" "../containers/$service/"
        fi

        # Push image
        print_status "Pushing image to ECR: $repo_uri:$VERSION"
        docker push "$repo_uri:$VERSION"
    done

    print_status "All images pushed to ECR successfully"
}

update_task_definition() {
    print_status "Updating ECS task definition..."

    # Update placeholders in task definition
    local task_def_content=$(cat "$TASK_DEFINITION")
    task_def_content=$(echo "$task_def_content" | sed "s|ACCOUNT_ID|$ACCOUNT_ID|g")
    task_def_content=$(echo "$task_def_content" | sed "s|REGION|$REGION|g")

    # Write updated task definition to temp file
    local temp_file=$(mktemp)
    echo "$task_def_content" > "$temp_file"

    # Register new task definition
    print_status "Registering new task definition..."
    local result=$(aws ecs register-task-definition --cli-input-json file://"$(echo "$temp_file")" --region "$REGION")
    rm -f "$temp_file"

    # Extract task definition ARN
    TASK_DEFINITION_ARN=$(echo "$result" | jq -r '.taskDefinition.taskDefinitionArn')
    print_status "Task definition registered: $TASK_DEFINITION_ARN"
}

update_ecs_service() {
    print_status "Updating ECS service..."

    # Get service name from ECS cluster
    # Default cluster name
    local cluster_name="default"
    local service_name="ecr-viewer-service"

    # Check if cluster exists
    if ! aws ecs describe-clusters --cluster "$cluster_name" --region "$REGION" &> /dev/null; then
        print_warning "ECS cluster '$cluster_name' does not exist"
        print_status "Please create a cluster first, then update the service manually"
        print_status ""
        print_status "To deploy manually, run:"
        print_status "  aws ecs update-service --cluster $cluster_name --service $service_name --force-new-deployment --region $REGION"
        print_status ""
        print_status "Task Definition ARN to use: $TASK_DEFINITION_ARN"
        return 0
    fi

    # Update service with new task definition
    print_status "Updating service with new task definition..."
    aws ecs update-service \
        --cluster "$cluster_name" \
        --service "$service_name" \
        --task-definition "$TASK_DEFINITION_ARN" \
        --force-new-deployment \
        --region "$REGION"

    print_status "ECS service update initiated"
    print_status "Deployment in progress..."
}

show_endpoints() {
    print_status ""
    print_status "=== ECS Deployment Initiated ==="
    print_status ""
    print_status "Task Definition: $TASK_DEFINITION_ARN"
    print_status "Cluster: default"
    print_status "Service: ecr-viewer-service"
    print_status ""
    print_status "Note: It may take several minutes for the service to stabilize."
    print_status "Check status with: aws ecs describe-services --cluster default --service ecr-viewer-service --region $REGION"
    print_status ""
    print_status "To find your load balancer endpoint:"
    print_status "  aws ecs describe-services --cluster default --service ecr-viewer-service --region $REGION"
    print_status ""
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    echo ""
    print_status "eCR Viewer Stack - ECS Fargate Deployment"
    print_status "=========================================="
    echo ""

    check_prerequisites
    check_aws_configuration
    create_ecr_repositories
    get_login_password

    # Get version from environment or default
    VERSION="${VERSION:-latest}"
    print_status "Image version: $VERSION"

    build_and_push_images
    update_task_definition
    update_ecs_service
    show_endpoints
}

main "$@"
