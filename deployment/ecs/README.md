# ECS Task Definitions for eCR Viewer

Example AWS ECS task definitions for deploying eCR Viewer services on AWS Fargate. Derived from the Docker Compose patterns in `deployment/vm/`.

These JSON files define standalone ECS task definitions for each microservice. They are templates intended for registration and inspection -- they use placeholder values throughout and do not include production-ready IAM roles, VPC, or networking infrastructure.

## Prerequisites

Before deploying, ensure you have:

- [ ] AWS CLI installed and configured (`aws configure`)
- [ ] An ECS cluster created (or provision via Terraform)
- [ ] A VPC with at least 2 subnets in different AZs
- [ ] Security groups for ECS tasks and ALB
- [ ] An Application Load Balancer (for ecr-viewer frontend)
- [ ] ECS task execution role with required policies
- [ ] ECS task role(s) with least-privilege permissions
- [ ] Secrets in AWS Secrets Manager (see [Secrets Management](#secrets-management))

See [Architecture](#architecture) for an overview of the 7 services. For common issues, see [Troubleshooting](#troubleshooting).

## Quick Start

Go from "infrastructure ready" to "task definitions registered" in four steps:

```bash
# 1. Store secrets in AWS Secrets Manager
aws secretsmanager put-secret-value \
  --secret-id dibbs-ecr-viewer-DATABASE_URL \
  --secret-string "postgresql://user:pass@host:5432/dbname"

# 2. Replace placeholders in the task definition JSON
ACCOUNT_ID=123456789012
IMAGE_TAG=v1.0.0
REGION=us-east-2
for f in deployment/ecs/*.json; do
  sed -i "s/\${AWS_ACCOUNT}/$ACCOUNT_ID/g" "$f"
  sed -i "s/\${IMAGE_TAG}/$IMAGE_TAG/g" "$f"
  sed -i "s/\${AWS_REGION}/$REGION/g" "$f"
done

# 3. Register task definitions
aws ecs register-task-definition \
  --cli-input-file file://deployment/ecs/ecr-viewer.json \
  --region $REGION

# 4. Create ECS services (internal services)
aws ecs create-service \
  --cluster your-cluster \
  --service-name dibbs-ingestion \
  --task-definition ingestion \
  --network-configuration "awsvpcConfiguration=subnets=[subnet-abc123,subnet-def456],securityGroups=[sg-abc123],assignPublicIp=DISABLED" \
  --launch-type FARGATE \
  --region $REGION
```

For a detailed walkthrough of each step, see [Deployment Steps](#deployment-steps). For common issues, see [Troubleshooting](#troubleshooting).

## Architecture

eCR Viewer consists of 7 microservices running on AWS Fargate:

- `ecr-viewer` (port 3000) -- Next.js frontend, accessible via ALB
- `orchestration` (port 8080) -- coordinates inter-service communication
- `ingestion` (port 8080) -- document ingestion
- `fhir-converter` (port 8080) -- FHIR document conversion
- `fhir-converter-proxy` (port 8126) -- HAProxy proxy
- `message-parser` (port 8080) -- message parsing
- `trigger-code-reference` (port 8080) -- address reference data

All services share a VPC and communicate via DNS-based discovery (e.g., `http://dibbs-ecr-viewer:3000/ecr-viewer`). Images are pulled from `ghcr.io/cdcgov/*`. Only `ecr-viewer` is exposed publicly via an Application Load Balancer; all other services are internal-only.

## Available Task Definitions

| File                          | Service                  | Port | Description                                                     |
| ----------------------------- | ------------------------ | ---- | --------------------------------------------------------------- |
| `ecr-viewer.json`             | `ecr-viewer`             | 3000 | Web frontend (Next.js application)                              |
| `ingestion.json`              | `ingestion`              | 8080 | Document ingestion service                                      |
| `fhir-converter.json`         | `fhir-converter`         | 8080 | FHIR document converter                                         |
| `message-parser.json`         | `message-parser`         | 8080 | Message parsing service                                         |
| `trigger-code-reference.json` | `trigger-code-reference` | 8080 | Trigger code reference data service                             |
| `orchestration.json`          | `orchestration`          | 8080 | Service orchestration (coordinates inter-service communication) |
| `fhir-converter-proxy.json`   | `fhir-converter-proxy`   | 8126 | HAProxy proxy for FHIR converter                                |

All services use `awsvpc` network mode, `FARGATE` compatibility, X86_64 architecture, 512 CPU, and 1024 MB memory.

## Deployment Steps

A complete walkthrough for going from an empty AWS account to running services. Follow these steps in order.

### Step 1: Create Secrets in AWS Secrets Manager

Store sensitive values (database passwords, OAuth secrets, API tokens) in AWS Secrets Manager before registering task definitions. The secret name follows the pattern `dibbs-<service>-<VAR_NAME>`.

Example:

```bash
aws secretsmanager put-secret-value \
  --secret-id dibbs-ecr-viewer-DATABASE_URL \
  --secret-string "postgresql://user:pass@host:5432/dbname"
```

See [Secrets Management](#secrets-management) for the full list of sensitive variables and their purpose.

### Step 2: Replace Placeholders

Each JSON file contains placeholder values that must be replaced with real values for your environment. Use `sed` or a scripting language to bulk-replace all placeholders:

```bash
ACCOUNT_ID=123456789012
IMAGE_TAG=v1.0.0
REGION=us-east-2
for f in deployment/ecs/*.json; do
  sed -i "s/\${AWS_ACCOUNT}/$ACCOUNT_ID/g" "$f"
  sed -i "s/\${IMAGE_TAG}/$IMAGE_TAG/g" "$f"
  sed -i "s/\${AWS_REGION}/$REGION/g" "$f"
done
```

See [Placeholders](#placeholders) for the complete list of placeholders and examples.

### Step 3: Register Task Definitions

Register each task definition with AWS ECS. This creates a versioned task definition that ECS services can run.

```bash
aws ecs register-task-definition \
  --cli-input-file file://deployment/ecs/ecr-viewer.json
```

Replace `ecr-viewer` with the desired service file name. The command returns the registered task definition ARN, family name, revision number, and container definition details.

### Example: Register eCR Viewer

```bash
aws ecs register-task-definition \
  --cli-input-file file://deployment/ecs/ecr-viewer.json \
  --region us-east-2
```

### Step 4: Create ECS Services

Create ECS services to run the task definitions. With `awsvpc` network mode, every `create-service` call requires a `--network-configuration` specifying subnet IDs, security group IDs, and whether to assign a public IP.

For internal services (everything except ecr-viewer):

```bash
aws ecs create-service \
  --cluster your-cluster \
  --service-name dibbs-ingestion \
  --task-definition ingestion \
  --network-configuration "awsvpcConfiguration=subnets=[subnet-abc123,subnet-def456],securityGroups=[sg-abc123],assignPublicIp=DISABLED" \
  --launch-type FARGATE \
  --region us-east-2
```

For `ecr-viewer`, assign a public IP so the ALB can route traffic to it:

```bash
aws ecs create-service \
  --cluster your-cluster \
  --service-name dibbs-ecr-viewer \
  --task-definition ecr-viewer \
  --network-configuration "awsvpcConfiguration=subnets=[subnet-abc123,subnet-def456],securityGroups=[sg-abc123],assignPublicIp=ENABLED" \
  --launch-type FARGATE \
  --region us-east-2
```

See [Troubleshooting](#troubleshooting) for common issues with service creation.

## Service-Specific Configuration

### ecr-viewer (web frontend)

- Runs on port 3000
- Sets `HOSTNAME` to `0.0.0.0` and disables Next.js telemetry
- Uses `APP_VERSION` env var set to the image tag for version reporting
- Uses `CONFIG_NAME` to select the deployment configuration profile
- `DATABASE_URL` is injected via AWS Secrets Manager (see Secrets Management section)
- Health check probes `/api/health-check`
- `readonlyRootFilesystem` is disabled (`false`) to allow Next.js cache writes
- **Environment variables**: ORCHESTRATION_URL, DIBBS_VERSION, CONFIG_NAME, METADATA_DATABASE_SCHEMA, SQL_SERVER_USER, SQL_SERVER_HOST, DB_CIPHER, AUTH_PROVIDER, AUTH_CLIENT_ID, AUTH_ISSUER, AUTH_SESSION_DURATION_MIN, NEXTAUTH_URL, SAVE_XML, DISPLAY_FEEDBACK_LINKS, ECR_PROCESSING_TIMEOUT, AWS_REGION, ECR_BUCKET_NAME, AZURE_CONTAINER_NAME, GCP_PROJECT_ID, NBS_API_PUB_KEY, NBS_PUB_KEY
- **Secrets**: AUTH_CLIENT_SECRET, NEXTAUTH_SECRET, DATABASE_URL, METADATA_DATABASE_MIGRATION_SECRET, SQL_SERVER_PASSWORD, AZURE_STORAGE_CONNECTION_STRING

### ingestion, message-parser, fhir-converter, fhir-converter-proxy

- No custom environment variables required
- Health check probes the root path `/`

### trigger-code-reference

- Configures three service URLs pointing to orchestration, message-parser, and itself
- `readonlyRootFilesystem` is disabled (`false`)

### orchestration

Coordinates inter-service communication by setting URLs for all other services:

| Variable                     | Value                                      |
| ---------------------------- | ------------------------------------------ |
| `ECR_VIEWER_URL`             | `http://dibbs-ecr-viewer:3000/ecr-viewer`  |
| `FHIR_CONVERTER_URL`         | `http://dibbs-fhir-converter:8080`         |
| `INGESTION_URL`              | `http://dibbs-ingestion:8080`              |
| `MESSAGE_PARSER_URL`         | `http://dibbs-message-parser:8080`         |
| `OTEL_METRICS`               | `none`                                     |
| `OTEL_METRICS_EXPORTER`      | `none`                                     |
| `TRIGGER_CODE_REFERENCE_URL` | `http://dibbs-trigger-code-reference:8080` |
| `DIBBS_VERSION`              | `${DIBBS_VERSION}`                         |
| `ORCHESTRATION_URL`          | `http://dibbs-orchestration:8080`          |

These values are derived from the reference configuration in `deployment/vm/dibbs-orchestration.env`.

## Placeholders

All files contain the following placeholders that must be replaced before use in a live environment:

| Placeholder             | Description                                             | Example                                                                       |
| ----------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `${IMAGE_TAG}`          | Container image tag                                     | `v1.2.3`, git commit SHA                                                      |
| `${AWS_ACCOUNT}`        | AWS account ID (embedded in ARNs)                       | `123456789012`                                                                |
| `${AWS_REGION}`         | AWS region                                              | `us-east-2`                                                                   |
| `${EXECUTION_ROLE_ARN}` | ECS task execution role ARN                             | `arn:aws:iam::123456789012:role/ecsExecutionRole`                             |
| `${TASK_ROLE_ARN}`      | ECS task role ARN                                       | `arn:aws:iam::123456789012:role/ecsTaskRole`                                  |
| `${SECRET_ARN}`         | AWS Secrets Manager secret ARN (for sensitive env vars) | `arn:aws:secretsmanager:us-east-2:123456789012:secret:dibbs-ecr-viewer-<VAR>` |
| `${APP_VERSION}`        | Application version string                              | `v1.2.3`                                                                      |

Use `sed` or a scripting language to bulk-replace placeholders before registration:

```bash
sed -i "s/\${AWS_ACCOUNT}/$(aws sts get-caller-identity --query Account --output text)/g" deployment/ecs/ecr-viewer.json
sed -i "s/\${IMAGE_TAG}/v1.2.3/g" deployment/ecs/ecr-viewer.json
sed -i "s/\${AWS_REGION}/us-east-2/g" deployment/ecs/ecr-viewer.json
```

## Secrets Management

Services with sensitive configuration values use AWS Secrets Manager via the ECS task definition `secrets` field.

### Pattern (ecr-viewer.json)

The `ecr-viewer.json` task definition demonstrates the secrets pattern. It uses six environment variables backed by Secrets Manager:

```json
"secrets": [
  {
    "name": "AUTH_CLIENT_SECRET",
    "valueFrom": "arn:aws:secretsmanager:us-east-2:123456789012:secret:dibbs-ecr-viewer-AUTH_CLIENT_SECRET"
  },
  {
    "name": "NEXTAUTH_SECRET",
    "valueFrom": "arn:aws:secretsmanager:us-east-2:123456789012:secret:dibbs-ecr-viewer-NEXTAUTH_SECRET"
  },
  {
    "name": "DATABASE_URL",
    "valueFrom": "arn:aws:secretsmanager:us-east-2:123456789012:secret:dibbs-ecr-viewer-DATABASE_URL"
  },
  {
    "name": "METADATA_DATABASE_MIGRATION_SECRET",
    "valueFrom": "arn:aws:secretsmanager:us-east-2:123456789012:secret:dibbs-ecr-viewer-METADATA_DATABASE_MIGRATION_SECRET"
  },
  {
    "name": "SQL_SERVER_PASSWORD",
    "valueFrom": "arn:aws:secretsmanager:us-east-2:123456789012:secret:dibbs-ecr-viewer-SQL_SERVER_PASSWORD"
  },
  {
    "name": "AZURE_STORAGE_CONNECTION_STRING",
    "valueFrom": "arn:aws:secretsmanager:us-east-2:123456789012:secret:dibbs-ecr-viewer-AZURE_STORAGE_CONNECTION_STRING"
  }
]
```

In the container's `environment` array, the same variable name also has a placeholder value:

```json
{ "name": "DATABASE_URL", "value": "${DATABASE_URL}" }
```

When both `environment` and `secrets` define the same variable name, the `secrets` value takes precedence. This dual-field pattern lets you document the variable name in both places while keeping the actual secret out of the task definition JSON.

### Sensitive Variables

The following variables should be stored in AWS Secrets Manager and referenced via the `secrets` field:

| Variable | Service(s) | Purpose |
|----------|------------|---------|
| `DATABASE_URL` | ecr-viewer | PostgreSQL connection string |
| `AUTH_CLIENT_SECRET` | ecr-viewer | OAuth client secret for authentication |
| `NEXTAUTH_SECRET` | ecr-viewer | NextAuth session signing key |
| `METADATA_DATABASE_MIGRATION_SECRET` | ecr-viewer | Migration secret for database schema migrations |
| `SQL_SERVER_PASSWORD` | ecr-viewer | SQL Server database password |
| `AZURE_STORAGE_CONNECTION_STRING` | ecr-viewer | Azure Blob Storage connection string |
| `SMARTY_AUTH_ID` | trigger-code-reference | SmartyStreets API identifier |
| `SMARTY_AUTH_TOKEN` | trigger-code-reference | SmartyStreets API token |

### Task Execution Role Permissions

The ECS task execution role must have permission to retrieve secrets. Add this policy to the execution role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "arn:aws:secretsmanager:us-east-2:123456789012:secret:dibbs-ecr-viewer-*"
    }
  ]
}
```

### Creating Secrets

Store secrets in AWS Secrets Manager before registering task definitions:

```bash
aws secretsmanager put-secret-value \
  --secret-id dibbs-ecr-viewer-DATABASE_URL \
  --secret-string "postgresql://user:pass@host:5432/dbname"
```

## Variable Groups

The following variables are organized into logical groups. Not all variables need to be set for every deployment -- some are required while others are optional or service-specific.

### Database

| Variable                             | Block       | Description                                     |
| ------------------------------------ | ----------- | ----------------------------------------------- |
| `DATABASE_URL`                       | secrets     | PostgreSQL connection string                    |
| `METADATA_DATABASE_SCHEMA`           | environment | Metadata database schema name                   |
| `METADATA_DATABASE_MIGRATION_SECRET` | secrets     | Migration secret for database schema migrations |
| `SQL_SERVER_USER`                    | environment | SQL Server username                             |
| `SQL_SERVER_PASSWORD`                | secrets     | SQL Server password                             |
| `SQL_SERVER_HOST`                    | environment | SQL Server hostname                             |
| `DB_CIPHER`                          | environment | Database cipher/encryption setting              |


### Auth

| Variable                    | Block       | Description                             |
| --------------------------- | ----------- | --------------------------------------- |
| `AUTH_PROVIDER`             | environment | Authentication provider (e.g., `dbssh`) |
| `AUTH_CLIENT_ID`            | environment | OAuth client ID                         |
| `AUTH_CLIENT_SECRET`        | secrets     | OAuth client secret                     |
| `AUTH_ISSUER`               | environment | OAuth issuer URL                        |
| `AUTH_SESSION_DURATION_MIN` | environment | Session duration in minutes             |
| `NEXTAUTH_URL`              | environment | NextAuth base URL                       |
| `NEXTAUTH_SECRET`           | secrets     | NextAuth session signing key            |

### Storage

| Variable                          | Block       | Description                          |
| --------------------------------- | ----------- | ------------------------------------ |
| `AWS_REGION`                      | environment | AWS region for S3/ECR storage        |
| `ECR_BUCKET_NAME`                 | environment | ECR container registry bucket name   |
| `AZURE_STORAGE_CONNECTION_STRING` | secrets     | Azure Blob Storage connection string |
| `AZURE_CONTAINER_NAME`            | environment | Azure container name                 |
| `GCP_PROJECT_ID`                  | environment | GCP project ID for Cloud Storage     |

### NBS

| Variable          | Block       | Description        |
| ----------------- | ----------- | ------------------ |
| `NBS_API_PUB_KEY` | environment | NBS API public key |
| `NBS_PUB_KEY`     | environment | NBS public key     |

### Optional

| Variable                 | Block       | Description                            |
| ------------------------ | ----------- | -------------------------------------- |
| `SAVE_XML`               | environment | Enable XML saving (defaults to `true`) |
| `DISPLAY_FEEDBACK_LINKS` | environment | Show feedback links in the UI          |
| `ECR_PROCESSING_TIMEOUT` | environment | ECR processing timeout in milliseconds |

Optional variables with sensible defaults if not set.

### SMARTY

| Variable            | Block   | Description                  |
| ------------------- | ------- | ---------------------------- |
| `SMARTY_AUTH_ID`    | secrets | SmartyStreets API identifier |
| `SMARTY_AUTH_TOKEN` | secrets | SmartyStreets API token      |

Required for the trigger-code-reference service. See the Secrets Management section for configuration.

## Complete Variable Reference

The following table maps all wizard-managed environment variables to their target task definition file and block.

| Variable                             | File                        | Block       |
| ------------------------------------ | --------------------------- | ----------- |
| `PORT`                               | ecr-viewer.json             | environment |
| `HOSTNAME`                           | ecr-viewer.json             | environment |
| `NEXT_TELEMETRY_DISABLED`            | ecr-viewer.json             | environment |
| `APP_VERSION`                        | ecr-viewer.json             | environment |
| `ORCHESTRATION_URL`                  | ecr-viewer.json             | environment |
| `DATABASE_URL`                       | ecr-viewer.json             | secrets     |
| `DIBBS_VERSION`                      | ecr-viewer.json             | environment |
| `CONFIG_NAME`                        | ecr-viewer.json             | environment |
| `METADATA_DATABASE_SCHEMA`           | ecr-viewer.json             | environment |
| `METADATA_DATABASE_MIGRATION_SECRET` | ecr-viewer.json             | secrets     |
| `SQL_SERVER_USER`                    | ecr-viewer.json             | environment |
| `SQL_SERVER_PASSWORD`                | ecr-viewer.json             | secrets     |
| `SQL_SERVER_HOST`                    | ecr-viewer.json             | environment |
| `DB_CIPHER`                          | ecr-viewer.json             | environment |
| `AUTH_PROVIDER`                      | ecr-viewer.json             | environment |
| `AUTH_CLIENT_ID`                     | ecr-viewer.json             | environment |
| `AUTH_CLIENT_SECRET`                 | ecr-viewer.json             | secrets     |
| `AUTH_ISSUER`                        | ecr-viewer.json             | environment |
| `AUTH_SESSION_DURATION_MIN`          | ecr-viewer.json             | environment |
| `NEXTAUTH_URL`                       | ecr-viewer.json             | environment |
| `NEXTAUTH_SECRET`                    | ecr-viewer.json             | secrets     |
| `SAVE_XML`                           | ecr-viewer.json             | environment |
| `DISPLAY_FEEDBACK_LINKS`             | ecr-viewer.json             | environment |
| `ECR_PROCESSING_TIMEOUT`             | ecr-viewer.json             | environment |
| `AWS_REGION`                         | ecr-viewer.json             | environment |
| `ECR_BUCKET_NAME`                    | ecr-viewer.json             | environment |
| `AZURE_STORAGE_CONNECTION_STRING`    | ecr-viewer.json             | secrets     |
| `AZURE_CONTAINER_NAME`               | ecr-viewer.json             | environment |
| `GCP_PROJECT_ID`                     | ecr-viewer.json             | environment |
| `NBS_API_PUB_KEY`                    | ecr-viewer.json             | environment |
| `NBS_PUB_KEY`                        | ecr-viewer.json             | environment |
| `ECR_VIEWER_URL`                     | orchestration.json          | environment |
| `FHIR_CONVERTER_URL`                 | orchestration.json          | environment |
| `INGESTION_URL`                      | orchestration.json          | environment |
| `MESSAGE_PARSER_URL`                 | orchestration.json          | environment |
| `OTEL_METRICS`                       | orchestration.json          | environment |
| `OTEL_METRICS_EXPORTER`              | orchestration.json          | environment |
| `TRIGGER_CODE_REFERENCE_URL`         | orchestration.json          | environment |
| `DIBBS_VERSION`                      | orchestration.json          | environment |
| `ORCHESTRATION_URL`                  | orchestration.json          | environment |
| `INGESTION_URL`                      | trigger-code-reference.json | environment |
| `MESSAGE-PARSER_URL`                 | trigger-code-reference.json | environment |
| `TRIGGER_CODE_REFERENCE_URL`         | trigger-code-reference.json | environment |
| `SMARTY_AUTH_ID`                     | trigger-code-reference.json | secrets     |
| `SMARTY_AUTH_TOKEN`                  | trigger-code-reference.json | secrets     |

## Logging

All services emit logs to CloudWatch using the `awslogs` log driver:

- Log groups follow the pattern `/ecs/<service-name>`
- Log groups are auto-created if missing (`awslogs-create-group: true`)
- Stream prefixes are set to the service name

Adjust the `awslogs-region` value in the log configuration options to match your target region.

## File Layout

```
deployment/ecs/
|-- ecr-viewer.json              # Web frontend (Next.js application)
|-- ingestion.json               # Document ingestion service
|-- fhir-converter.json          # FHIR document converter
|-- fhir-converter-proxy.json    # HAProxy proxy for FHIR converter
|-- message-parser.json          # Message parsing service
|-- orchestration.json           # Service orchestration
|-- trigger-code-reference.json  # Trigger code reference data service
```

## Troubleshooting

- **Task fails to start with `PROVISIONING` timeout** -- Check VPC subnets exist, are in the correct region, and have available IP addresses. Verify security groups allow necessary traffic. Ensure you have at least 2 subnets across different AZs.
- **`ClientException: Task definition has secrets but no executionRoleArn`** -- When using the `secrets` field, the task definition must specify both `executionRoleArn` (for the ECS agent to retrieve secrets) and `taskRoleArn` (for the container's IAM permissions). See [Secrets Management](#secrets-management) for required policies.
- **Services can't find each other via DNS** -- All services must run in the same VPC. The hostnames used in orchestration.env (e.g., `dibbs-ecr-viewer:3000`) assume a shared network namespace. Verify VPC configuration and that all services are deployed to the same VPC.
- **Health checks pass but service is unreachable** -- Task definition health checks (`healthCheck`) are separate from ALB target group health checks. Verify both point to the correct endpoint. The ecr-viewer health check is `/api/health-check`.
- **`NetworkConfiguration` required but not provided** -- With `awsvpc` network mode, every `create-service` call must specify `--network-configuration` with subnet IDs and security group IDs. See [Deployment Steps Step 4](#step-4-create-ecs-services).
- **Secrets Manager ARN has a rotation suffix** -- When AWS rotates a secret, the ARN changes from `...secret:dibbs-ecr-viewer-DATABASE_URL` to `...secret:dibbs-ecr-viewer-DATABASE_URL-abc123`. Use the full ARN (including the suffix) in the task definition `valueFrom` field, not just the secret ID.
- **Task execution role missing ECR permissions** -- If the task fails to pull its image, ensure the execution role has `ecr:GetAuthorizationToken`, `ecr:BatchCheckLayerAvailability`, `ecr:GetDownloadUrlForLayer`, and `ecr:BatchGetImage` permissions.
- **Security group blocks internal traffic** -- All services must be in security groups that allow inbound traffic from each other. For internal services on port 8080, ensure security groups permit ingress from the same security group on the appropriate port.
- **Public IP assigned to internal services** -- Internal services should have `assignPublicIp` set to `DISABLED`. Only the `ecr-viewer` service needs a public IP for ALB routing.

## Production Infrastructure

These task definition JSON files are templates and examples. They do not include the supporting AWS infrastructure needed to run in production.

For production-ready infrastructure (IAM roles, VPC, ECS cluster, load balancer, ECR repositories, Secrets Manager secrets, CloudWatch log groups), use the official Terraform module:

**[CDCgov/terraform-aws-dibbs-ecr-viewer](https://github.com/CDCgov/terraform-aws-dibbs-ecr-viewer/)**

This module provisions:

- ECS cluster, services, and task definitions
- ECR repositories with lifecycle policies
- S3 buckets for data storage
- Application Load Balancer with SSL and WAF protection
- VPC with encryption and flow logging
- CloudWatch log groups and SNS notifications

## Security

All files in this directory use placeholder values only. There are no real AWS account IDs, ARNs, passwords, or API keys committed to the repository. Replace all placeholders with actual values before deploying.
