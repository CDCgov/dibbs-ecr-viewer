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

The `ecr-viewer.json` task definition demonstrates the secrets pattern. It uses three environment variables backed by Secrets Manager:

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

| Variable             | Service(s)             | Purpose                                |
| -------------------- | ---------------------- | -------------------------------------- |
| `DATABASE_URL`       | ecr-viewer             | PostgreSQL connection string           |
| `AUTH_CLIENT_SECRET` | ecr-viewer             | OAuth client secret for authentication |
| `NEXTAUTH_SECRET`    | ecr-viewer             | NextAuth session signing key           |
| `SMARTY_AUTH_ID`     | trigger-code-reference | SmartyStreets API identifier           |
| `SMARTY_AUTH_TOKEN`  | trigger-code-reference | SmartyStreets API token                |

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

## Service-Specific Notes

### ecr-viewer (web frontend)

- Runs on port 3000
- Sets `HOSTNAME` to `0.0.0.0` and disables Next.js telemetry
- Uses `APP_VERSION` env var set to the image tag for version reporting
- `DATABASE_URL` is injected via AWS Secrets Manager (see Secrets Management section)
- Health check probes `/api/health-check`
- `readonlyRootFilesystem` is disabled (`false`) to allow Next.js cache writes

### ingestion, message-parser, fhir-converter, fhir-converter-proxy

- No custom environment variables required
- Health check probes the root path `/`

### trigger-code-reference

- Configures three service URLs pointing to orchestration, message-parser, and itself
- Uses `${SMARTY_AUTH_ID}` and `${SMARTY_AUTH_TOKEN}` as placeholder env vars (should be sourced from Secrets Manager)
- `readonlyRootFilesystem` is disabled (`false`)

### orchestration

Coordinates inter-service communication by setting URLs for all other services:

| Variable                     | Value                                |
| ---------------------------- | ------------------------------------ |
| `ECR_VIEWER_URL`             | `http://ecr-viewer:3000/ecr-viewer`  |
| `FHIR_CONVERTER_URL`         | `http://fhir-converter:8080`         |
| `INGESTION_URL`              | `http://ingestion:8080`              |
| `MESSAGE_PARSER_URL`         | `http://message-parser:8080`         |
| `OTEL_METRICS`               | `none`                               |
| `OTEL_METRICS_EXPORTER`      | `none`                               |
| `TRIGGER_CODE_REFERENCE_URL` | `http://trigger-code-reference:8080` |

These values are derived from the reference configuration in `deployment/vm/dibbs-orchestration.env`.

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
