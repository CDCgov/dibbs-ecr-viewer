# ECS Task Definitions for eCR Viewer

Example AWS ECS task definitions for deploying eCR Viewer services on AWS Fargate. Derived from the Docker Compose patterns in `deployment/vm/`.

These JSON files define standalone ECS task definitions for each microservice. They are templates intended for registration and inspection -- they use placeholder values throughout and do not include production-ready IAM roles, VPC, or networking infrastructure.

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

## Prerequisites

- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) installed and configured
- AWS credentials with `ecs:RegisterTaskDefinition` permission
- Target AWS region set: `aws configure` or `AWS_REGION` environment variable

## Registration

Register a task definition with AWS using the CLI:

```bash
aws ecs register-task-definition --cli-input-file file://deployment/ecs/ecr-viewer.json
```

Replace `ecr-viewer` with the desired service file name. The command returns the registered task definition ARN, family name, revision number, and container definition details.

### Example: Register eCR Viewer

```bash
aws ecs register-task-definition \
  --cli-input-file file://deployment/ecs/ecr-viewer.json \
  --region us-east-2
```

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
## Service-Specific Notes

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
