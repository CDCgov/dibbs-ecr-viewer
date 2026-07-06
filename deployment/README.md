# Run eCR Viewer Containers Individually with Docker

Run each service in the eCR Viewer stack as a standalone container using `docker run`.

**TL;DR**: Each service runs with `docker run --name` on its mapped port, connected to the `dibbs` network. The ecr-viewer, fhir-converter-proxy, and orchestration services require environment variables.

## Service overview

| Service                | Container name               | Host port | Container port | Image                    | Env vars        |
| ---------------------- | ---------------------------- | --------- | -------------- | ------------------------ | --------------- |
| ecr-viewer             | dibbs-ecr-viewer             | 3000      | 3000           | `ecr-viewer`             | BaseRequired    |
| ingestion              | dibbs-ingestion              | -         | 8080           | `ingestion`              | none            |
| fhir-converter-proxy   | dibbs-fhir-converter-proxy   | -         | 8080           | `fhir-converter-proxy`   | proxy variables |
| fhir-converter         | dibbs-fhir-converter         | -         | 8080           | `fhir-converter`         | none            |
| message-parser         | dibbs-message-parser         | -         | 8080           | `message-parser`         | none            |
| trigger-code-reference | dibbs-trigger-code-reference | -         | 8080           | `trigger-code-reference` | none            |
| orchestration          | dibbs-orchestration          | -         | 8080           | `orchestration`          | URL variables   |

Images live at `ghcr.io/cdcgov/dibbs-ecr-viewer/`. Internal service ports are 8080 for backend services and 3000 for the viewer.

## Base required environment variables

The ecr-viewer container requires these variables for all deployments, as defined in the [BaseRequired interface](https://cdcgov.github.io/dibbs-ecr-viewer/interfaces/environment.EnvironmentVariables.BaseRequired.html):

| Variable            | Description                                                                 | Example                                     |
| ------------------- | --------------------------------------------------------------------------- | ------------------------------------------- |
| `CONFIG_NAME`       | Determines storage provider, database type, and authentication profile      | `AWS_INTEGRATED`, `AZURE_PG_NON_INTEGRATED` |
| `ECR_BUCKET_NAME`   | Name of the container storage holding eCR documents                         | `ecr-documents-bucket`                      |
| `NEXTAUTH_SECRET`   | Random key for session encryption, generated with `openssl rand -base64 32` | _(generated value)_                         |
| `ORCHESTRATION_URL` | Full URL of the orchestration service                                       | `http://dibbs-orchestration:8080`           |

The fhir-converter proxy requires these variables, [additional docs for this service here](https://github.com/CDCgov/dibbs-ecr-viewer/blob/main/containers/fhir-converter-proxy/README.md#setup):

| Variable                       | Description                                                                         | Example                |
| ------------------------------ | ----------------------------------------------------------------------------------- | ---------------------- |
| `FHIR_CONVERTER_HOST`          | Hostname of the fhir-converter service (overrides default `fhir-converter-service`) | `dibbs-fhir-converter` |
| `FHIR_CONVERTER_PROXY_PORT`    | Port the proxy listens on                                                           | `8080`                 |
| `ENVIRONMENT`                  | Deployment environment                                                              | `local`                |
| `FHIR_CONVERTER_ECS_NAMESPACE` | ECS namespace for the converter service                                             | `dibbs`                |
| `FHIR_CONVERTER_PORT`          | Port the converter service runs on                                                  | `8080`                 |

Orchestration requires these variables:

| Variable                     | Description                               | Example                                    |
| ---------------------------- | ----------------------------------------- | ------------------------------------------ |
| `FHIR_CONVERTER_URL`         | URL to the fhir-converter proxy service   | `http://dibbs-fhir-converter-proxy:8080`   |
| `INGESTION_URL`              | URL to the ingestion service              | `http://dibbs-ingestion:8080`              |
| `MESSAGE_PARSER_URL`         | URL to the message-parser service         | `http://dibbs-message-parser:8080`         |
| `TRIGGER_CODE_REFERENCE_URL` | URL to the trigger-code-reference service | `http://dibbs-trigger-code-reference:8080` |

Other environment variables exist for authentication, cloud storage, and database configuration, grouped under the Authentication, eCR Storage, and eCR Library Metadata categories in the environment type definitions.

## Run the services

Set a version tag for the container images:

```bash
# prefer pinned version, avoid latest
export DIBBS_VERSION=latest
```

Create the `dibbs` network that all containers share:

```bash
docker network create dibbs
```

### 1. ecr-viewer

```bash
docker run -d \
  --name dibbs-ecr-viewer \
  --network dibbs \
  -p 3000:3000 \
  --restart unless-stopped \
  -e CONFIG_NAME=AWS_INTEGRATED \
  -e ECR_BUCKET_NAME=ecr-documents-bucket \
  -e NEXTAUTH_SECRET=$(openssl rand -base64 32) \
  -e ORCHESTRATION_URL=http://dibbs-orchestration:8080 \
  ghcr.io/cdcgov/dibbs-ecr-viewer/ecr-viewer:$DIBBS_VERSION
```

### 2. ingestion

```bash
docker run -d \
  --name dibbs-ingestion \
  --network dibbs \
  --restart unless-stopped \
  ghcr.io/cdcgov/dibbs-ecr-viewer/ingestion:$DIBBS_VERSION
```

### 3. fhir-converter-proxy

```bash
docker run -d \
  --name dibbs-fhir-converter-proxy \
  --network dibbs \
  --restart unless-stopped \
  -e FHIR_CONVERTER_PROXY_PORT=8080 \
  -e ENVIRONMENT=local \
  -e FHIR_CONVERTER_ECS_NAMESPACE=dibbs \
  -e FHIR_CONVERTER_HOST=dibbs-fhir-converter \
  -e FHIR_CONVERTER_PORT=8080 \
  ghcr.io/cdcgov/dibbs-ecr-viewer/fhir-converter-proxy:$DIBBS_VERSION
```

### 4. fhir-converter

```bash
docker run -d \
  --name dibbs-fhir-converter \
  --network dibbs \
  --restart unless-stopped \
  ghcr.io/cdcgov/dibbs-ecr-viewer/fhir-converter:$DIBBS_VERSION
```

### 5. message-parser

```bash
docker run -d \
  --name dibbs-message-parser \
  --network dibbs \
  --restart unless-stopped \
  ghcr.io/cdcgov/dibbs-ecr-viewer/message-parser:$DIBBS_VERSION
```

### 6. trigger-code-reference

```bash
docker run -d \
  --name dibbs-trigger-code-reference \
  --network dibbs \
  --restart unless-stopped \
  ghcr.io/cdcgov/dibbs-ecr-viewer/trigger-code-reference:$DIBBS_VERSION
```

### 7. orchestration

```bash
docker run -d \
  --name dibbs-orchestration \
  --network dibbs \
  --restart unless-stopped \
  -e INGESTION_URL=http://dibbs-ingestion:8080 \
  -e FHIR_CONVERTER_URL=http://dibbs-fhir-converter-proxy:8080 \
  -e MESSAGE_PARSER_URL=http://dibbs-message-parser:8080 \
  -e TRIGGER_CODE_REFERENCE_URL=http://dibbs-trigger-code-reference:8080 \
  ghcr.io/cdcgov/dibbs-ecr-viewer/orchestration:$DIBBS_VERSION
```

## Start order and health checks

The orchestration service depends on all other services. Run it after the others are started and healthy.

Check on the health of you container by running `docker inspect` on containers individually:

```bash
docker inspect --format='{{.State.Health.Status}}' dibbs-ecr-viewer
docker inspect --format='{{.State.Health.Status}}' dibbs-ingestion
docker inspect --format='{{.State.Health.Status}}' dibbs-fhir-converter-proxy
docker inspect --format='{{.State.Health.Status}}' dibbs-fhir-converter
docker inspect --format='{{.State.Health.Status}}' dibbs-message-parser
docker inspect --format='{{.State.Health.Status}}' dibbs-trigger-code-reference
docker inspect --format='{{.State.Health.Status}}' dibbs-orchestration
```

## Container management

Stop and remove a running container before recreating it with the same name:

```bash
docker stop dibbs-ecr-viewer && docker rm dibbs-ecr-viewer
```

Stop and remove all dibbs containers at once:

```bash
docker stop $(docker ps -q --filter name=dibbs-) && docker rm $(docker ps -aq --filter name=dibbs-)
```

View logs for a service:

```bash
docker logs dibbs-ecr-viewer -f
```

## Related

- VM deployment docker compose, scripts and wizard: [`deployment/vm/README.md`](../deployment/vm/README.md)
- Environment variable documentation: [BaseRequired](https://cdcgov.github.io/dibbs-ecr-viewer/interfaces/environment.EnvironmentVariables.BaseRequired.html)
